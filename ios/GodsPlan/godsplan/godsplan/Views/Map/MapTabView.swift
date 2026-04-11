import SwiftUI
import MapKit
import SwiftData

struct MapTabView: View {
    @Environment(ChurchStore.self) private var store
    @State private var selectedChurchID: String?
    @State private var selectedChurchName: String?
    @State private var showDetail = false
    @State private var styleIndex = 0
    @State private var locationManager = CLLocationManager()
    @State private var centerOnUser = false
    @State private var pendingRegion: MKCoordinateRegion?
    @State private var pendingCamera: MKMapCamera?
    @State private var currentRegion = MKCoordinateRegion(
        center: CLLocationCoordinate2D(latitude: 48.8566, longitude: 2.3522),
        span: MKCoordinateSpan(latitudeDelta: 0.07, longitudeDelta: 0.07)
    )

    // Zoom slider state
    @State private var sliderActive = false
    @State private var mapParallaxX: CGFloat = 0
    @State private var sliderRegion: MKCoordinateRegion?

    // City selector state
    @State private var currentCity = "Paris"
    @State private var showCityPicker = false
    @State private var geocodeTask: Task<Void, Never>?
    @State private var lastGeocodedCenter: CLLocationCoordinate2D?
    @State private var lastGeocodeTime: Date = .distantPast

    private let styles: [(String, String, MapStyleType)] = [
        ("Standard",  "map",       .standard),
        ("Satellite", "globe",     .satellite),
        ("Hybride",   "map.fill",  .hybrid)
    ]

    var body: some View {
        ZStack(alignment: .top) {
            // UIKit MKMapView with bump-style decluttering
            ChurchMapViewRepresentable(
                churches: store.churches,
                onChurchSelected: { id, name, coordinate in
                    // Ignore taps while zoom slider is active
                    guard !sliderActive else { return }
                    selectedChurchID = id
                    selectedChurchName = name
                    showDetail = true
                    // Zoom to the selected church with tilt, offset south so pin appears in upper third
                    let offsetCenter = CLLocationCoordinate2D(
                        latitude: coordinate.latitude - 0.002,
                        longitude: coordinate.longitude
                    )
                    pendingCamera = MKMapCamera(
                        lookingAtCenter: offsetCenter,
                        fromDistance: 1500,
                        pitch: 45,
                        heading: 0
                    )
                    Task { @MainActor in
                        try? await Task.sleep(for: .milliseconds(500))
                        pendingCamera = nil
                    }
                    Task { await store.selectChurch(id: id) }
                },
                onRegionChanged: { region in
                    currentRegion = region
                    reverseGeocode(region.center)
                },
                regionToSet: sliderRegion ?? pendingRegion,
                animateRegion: sliderRegion == nil,
                cameraToSet: pendingCamera,
                mapStyle: styles[styleIndex].2,
                centerOnUser: centerOnUser
            )
            .ignoresSafeArea(edges: .all)
            .offset(x: mapParallaxX)

            // Bump-style zoom notch — curved cutout on left edge
            Color.clear
                .allowsHitTesting(false)
                .overlay(alignment: .leading) {
                    EdgeZoomSlider(
                        regionToSet: $sliderRegion,
                        isActive: $sliderActive,
                        currentSpan: currentRegion.span,
                        mapCenter: currentRegion.center,
                        parallaxOffset: $mapParallaxX
                    )
                }

            // City search bar
            citySearchBar
                .padding(.horizontal, 16)
                .padding(.top, 8)

            // Floating map controls — bottom right
            floatingMapControls
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomTrailing)
                .padding(.trailing, 16)
                .padding(.bottom, 100)
        }
        .sheet(isPresented: $showDetail, onDismiss: {
            store.clearSelection()
            selectedChurchID = nil
            selectedChurchName = nil
        }) {
            if let id = selectedChurchID, let name = selectedChurchName {
                ChurchDetailSheet(churchId: id, churchName: name)
                    .presentationDetents([.medium, .large])
                    .presentationDragIndicator(.visible)
                    .presentationCornerRadius(28)
                    .presentationBackground(.regularMaterial)
            }
        }
        .sheet(isPresented: $showCityPicker) {
            CityPickerSheet { coordinate, city in
                currentCity = city
                lastGeocodedCenter = coordinate
                pendingRegion = MKCoordinateRegion(
                    center: coordinate,
                    span: MKCoordinateSpan(latitudeDelta: 0.07, longitudeDelta: 0.07)
                )
                // Clear pending after a frame to avoid re-setting
                Task { @MainActor in
                    try? await Task.sleep(for: .milliseconds(500))
                    pendingRegion = nil
                }
            }
            .presentationDetents([.medium])
            .presentationDragIndicator(.visible)
            .presentationCornerRadius(24)
        }
        .onChange(of: sliderActive) { _, active in
            if !active { sliderRegion = nil }
        }
        .onAppear {
            locationManager.requestWhenInUseAuthorization()
        }
    }

    // MARK: - City search bar

    private var citySearchBar: some View {
        Button { showCityPicker = true } label: {
            HStack(spacing: 10) {
                Image(systemName: "magnifyingglass")
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(.secondary)

                Text(currentCity)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(.primary)

                Spacer()

                let cityCount = store.churches.filter { church in
                    guard let city = church.address.city else { return false }
                    return city.localizedCaseInsensitiveContains(currentCity)
                }.count
                Text("\(cityCount) église\(cityCount == 1 ? "" : "s")")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
            .shadow(color: .black.opacity(0.12), radius: 8, y: 3)
        }
        .buttonStyle(.plain)
    }

    // MARK: - Floating map controls

    private var floatingMapControls: some View {
        VStack(spacing: 12) {
            // Map style button
            Button {
                styleIndex = (styleIndex + 1) % styles.count
            } label: {
                Image(systemName: styles[styleIndex].1)
                    .font(.body.weight(.semibold))
                    .foregroundStyle(.primary)
                    .frame(width: 44, height: 44)
                    .background(.ultraThinMaterial, in: Circle())
                    .shadow(color: .black.opacity(0.12), radius: 6, y: 2)
            }
            .buttonStyle(.plain)

            // Locate me button
            Button {
                centerOnUser = true
                Task { @MainActor in
                    try? await Task.sleep(for: .milliseconds(500))
                    centerOnUser = false
                }
            } label: {
                Image(systemName: "location.fill")
                    .font(.body.weight(.semibold))
                    .foregroundStyle(Color("Gold"))
                    .frame(width: 44, height: 44)
                    .background(.ultraThinMaterial, in: Circle())
                    .shadow(color: .black.opacity(0.12), radius: 6, y: 2)
            }
            .buttonStyle(.plain)
        }
    }

    // MARK: - Reverse geocode (distance-debounced)

    private func reverseGeocode(_ coordinate: CLLocationCoordinate2D) {
        // Time-based throttle: minimum 3 seconds between geocoding requests
        guard Date().timeIntervalSince(lastGeocodeTime) > 3 else { return }

        // Distance-based throttle: skip if within 2km of last geocoded point
        if let last = lastGeocodedCenter {
            let dist = CLLocation(latitude: last.latitude, longitude: last.longitude)
                .distance(from: CLLocation(latitude: coordinate.latitude, longitude: coordinate.longitude))
            if dist < 2000 { return }
        }

        geocodeTask?.cancel()
        geocodeTask = Task {
            try? await Task.sleep(for: .milliseconds(800))
            guard !Task.isCancelled else { return }
            let location = CLLocation(latitude: coordinate.latitude, longitude: coordinate.longitude)
            guard let request = MKReverseGeocodingRequest(location: location) else { return }
            do {
                let mapItems = try await request.mapItems
                if !Task.isCancelled,
                   let city = mapItems.first?.addressRepresentations?.cityName {
                    lastGeocodedCenter = coordinate
                    lastGeocodeTime = Date()
                    currentCity = city
                }
            } catch {}
        }
    }
}

// MARK: - City picker sheet

private struct CityPickerSheet: View {
    let onSelect: (CLLocationCoordinate2D, String) -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var query = ""
    @State private var results: [MKLocalSearchCompletion] = []
    @State private var searchCompleter = CitySearchCompleter()

    var body: some View {
        NavigationStack {
            List {
                if results.isEmpty && query.isEmpty {
                    quickCities
                }

                ForEach(results, id: \.self) { completion in
                    Button {
                        selectCompletion(completion)
                    } label: {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(completion.title)
                                .font(.body)
                                .foregroundStyle(.primary)
                            if !completion.subtitle.isEmpty {
                                Text(completion.subtitle)
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                }
            }
            .listStyle(.insetGrouped)
            .searchable(text: $query, placement: .navigationBarDrawer(displayMode: .always), prompt: "Rechercher une ville…")
            .navigationTitle("Choisir une ville")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(.visible, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Fermer") { dismiss() }
                }
            }
            .onChange(of: query) { _, newValue in
                searchCompleter.search(query: newValue) { completions in
                    results = completions
                }
            }
        }
    }

    // MARK: Quick-access cities

    private static let defaultCities: [(String, Double, Double)] = [
        ("Paris",      48.8566,  2.3522),
        ("Lyon",       45.7640,  4.8357),
        ("Marseille",  43.2965,  5.3698),
        ("Bordeaux",   44.8378, -0.5792),
        ("Toulouse",   43.6047,  1.4442),
        ("Nantes",     47.2184, -1.5536),
        ("Strasbourg", 48.5734,  7.7521),
        ("Lille",      50.6292,  3.0573),
        ("Rouen",      49.4432,  1.0999),
        ("Rennes",     48.1173, -1.6778),
    ]

    private var quickCities: some View {
        Section("Villes principales") {
            ForEach(Self.defaultCities, id: \.0) { city, lat, lng in
                Button {
                    onSelect(CLLocationCoordinate2D(latitude: lat, longitude: lng), city)
                    dismiss()
                } label: {
                    Label(city, systemImage: "building.2")
                        .foregroundStyle(.primary)
                }
            }
        }
    }

    private func selectCompletion(_ completion: MKLocalSearchCompletion) {
        let request = MKLocalSearch.Request(completion: completion)
        request.resultTypes = .address
        Task {
            guard let response = try? await MKLocalSearch(request: request).start(),
                  let item = response.mapItems.first else { return }
            let city = completion.title.components(separatedBy: ",").first ?? completion.title
            onSelect(item.location.coordinate, city)
            dismiss()
        }
    }
}

// MARK: - Search completer helper

@Observable
private class CitySearchCompleter: NSObject, MKLocalSearchCompleterDelegate {
    private let completer = MKLocalSearchCompleter()
    private var handler: (([MKLocalSearchCompletion]) -> Void)?

    override init() {
        super.init()
        completer.delegate = self
        completer.resultTypes = .address
    }

    func search(query: String, handler: @escaping ([MKLocalSearchCompletion]) -> Void) {
        self.handler = handler
        if query.isEmpty {
            handler([])
            return
        }
        completer.queryFragment = query
    }

    func completerDidUpdateResults(_ completer: MKLocalSearchCompleter) {
        handler?(completer.results)
    }

    func completer(_ completer: MKLocalSearchCompleter, didFailWithError error: Error) {
        handler?([])
    }
}

#Preview {
    MapTabView()
        .environment(ChurchStore())
        .environment(AuthStore())
        .modelContainer(for: SavedChurch.self, inMemory: true)
}
