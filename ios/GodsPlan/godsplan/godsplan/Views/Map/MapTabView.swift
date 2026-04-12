import SwiftUI
import MapKit
import SwiftData

struct MapTabView: View {
    var splashDone: Bool = false

    @Environment(ChurchStore.self) private var store
    @State private var selectedChurchID: String?
    @State private var selectedChurchName: String?
    @State private var showDetail = false
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
    @State private var sliderRegion: MKCoordinateRegion?

    // City selector state
    @State private var currentCity = "Paris"
    @State private var showCityPicker = false
    @State private var geocodeTask: Task<Void, Never>?
    @State private var lastGeocodedCenter: CLLocationCoordinate2D?
    @State private var lastGeocodeTime: Date = .distantPast

    // Entrance animation
    @State private var showUI = false

    // Nearest churches state
    @State private var showingNearestChurches = false

    var body: some View {
        ZStack(alignment: .top) {
            // UIKit MKMapView with bump-style decluttering
            // Ensure the black slider overlays above the map without resizing/shifting the map itself
            ZStack {
                ChurchMapViewRepresentable(
                    churches: store.churches,
                    splashDone: splashDone,
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
                    mapStyle: .standard,
                    centerOnUser: centerOnUser
                )
                .ignoresSafeArea(edges: .all)

                // Slider is strictly an overlay—never shifts or resizes the map. Only triggers zoom when moved.
                EdgeZoomSlider(
                    regionToSet: $sliderRegion,
                    isActive: $sliderActive,
                    currentSpan: currentRegion.span,
                    mapCenter: currentRegion.center
                )
                .allowsHitTesting(showUI)
                .offset(x: showUI ? 0 : -30, y: 0)
                .opacity(showUI ? 1 : 0)
                .position(x: 22, y: UIScreen.main.bounds.height / 2)
            }

            // City search bar
            citySearchBar
                .padding(.horizontal, 16)
                .padding(.top, 8)
                .offset(y: showUI ? 0 : -60)
                .opacity(showUI ? 1 : 0)

            // Floating map controls — bottom right
            floatingMapControls
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomTrailing)
                .padding(.trailing, 16)
                .padding(.bottom, 100)
                .offset(x: showUI ? 0 : 60)
                .opacity(showUI ? 1 : 0)
        }
        .sheet(isPresented: $showDetail, onDismiss: {
            // Make sure to unselect the map annotation when closing details.
            store.clearSelection()
            selectedChurchID = nil
            selectedChurchName = nil
            pendingCamera = nil
            pendingRegion = nil
            // If there was a method to explicitly unselect annotation on the map, it would be called here.
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
        .sheet(isPresented: $showingNearestChurches) {
            NearestChurchesSheet(
                churches: nearestChurchesList,
                distanceToUser: distanceToUser
            ) { church in
                showingNearestChurches = false
                selectedChurchID = church.id
                selectedChurchName = church.name
                showDetail = true
                let offsetCenter = CLLocationCoordinate2D(
                    latitude: church.lat - 0.002,
                    longitude: church.lng
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
                Task { await store.selectChurch(id: church.id) }
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
        .onChange(of: splashDone) { _, done in
            guard done else { return }
            // Delay UI overlays until after pin pop-in wave finishes (~0.8s)
            withAnimation(.spring(response: 0.6, dampingFraction: 0.75).delay(0.8)) {
                showUI = true
            }
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
            // Find nearest churches button
            Button {
                findNearestChurches()
            } label: {
                Image(systemName: "cross.fill")
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

    // MARK: - Find nearest churches

    private func findNearestChurches() {
        guard let userLocation = locationManager.location?.coordinate else {
            // Center on user first, then retry
            centerOnUser = true
            Task { @MainActor in
                try? await Task.sleep(for: .milliseconds(600))
                centerOnUser = false
            }
            return
        }

        let userCL = CLLocation(latitude: userLocation.latitude, longitude: userLocation.longitude)
        let nearest = store.churches
            .map { church -> (ChurchListItem, Double) in
                let loc = CLLocation(latitude: church.lat, longitude: church.lng)
                return (church, userCL.distance(from: loc))
            }
            .sorted { $0.1 < $1.1 }
            .prefix(3)

        guard !nearest.isEmpty else { return }

        // Compute region that fits all 3 + user location
        var minLat = userLocation.latitude
        var maxLat = userLocation.latitude
        var minLng = userLocation.longitude
        var maxLng = userLocation.longitude
        for (church, _) in nearest {
            minLat = min(minLat, church.lat)
            maxLat = max(maxLat, church.lat)
            minLng = min(minLng, church.lng)
            maxLng = max(maxLng, church.lng)
        }
        let centerLat = (minLat + maxLat) / 2
        let centerLng = (minLng + maxLng) / 2
        let spanLat = (maxLat - minLat) * 1.5 + 0.005
        let spanLng = (maxLng - minLng) * 1.5 + 0.005

        pendingRegion = MKCoordinateRegion(
            center: CLLocationCoordinate2D(latitude: centerLat, longitude: centerLng),
            span: MKCoordinateSpan(latitudeDelta: spanLat, longitudeDelta: spanLng)
        )
        Task { @MainActor in
            try? await Task.sleep(for: .milliseconds(500))
            pendingRegion = nil
        }

        // Show the nearest churches in a sheet
        showingNearestChurches = true
    }

    private var nearestChurchesList: [ChurchListItem] {
        guard let userLocation = locationManager.location?.coordinate else { return [] }
        let userCL = CLLocation(latitude: userLocation.latitude, longitude: userLocation.longitude)
        return store.churches
            .sorted { a, b in
                let distA = CLLocation(latitude: a.lat, longitude: a.lng).distance(from: userCL)
                let distB = CLLocation(latitude: b.lat, longitude: b.lng).distance(from: userCL)
                return distA < distB
            }
            .prefix(3)
            .map { $0 }
    }

    private func distanceToUser(_ church: ChurchListItem) -> String {
        guard let userLocation = locationManager.location?.coordinate else { return "" }
        let userCL = CLLocation(latitude: userLocation.latitude, longitude: userLocation.longitude)
        let dist = CLLocation(latitude: church.lat, longitude: church.lng).distance(from: userCL)
        if dist < 1000 {
            return String(format: "%.0f m", dist)
        }
        return String(format: "%.1f km", dist / 1000)
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

// MARK: - Nearest churches sheet

private struct NearestChurchesSheet: View {
    let churches: [ChurchListItem]
    let distanceToUser: (ChurchListItem) -> String
    let onSelect: (ChurchListItem) -> Void
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            List {
                ForEach(Array(churches.enumerated()), id: \.element.id) { index, church in
                    Button {
                        onSelect(church)
                    } label: {
                        HStack(spacing: 14) {
                            ZStack {
                                Circle()
                                    .fill(Color("Gold").opacity(0.15))
                                    .frame(width: 40, height: 40)
                                Text("\(index + 1)")
                                    .font(.headline.weight(.bold))
                                    .foregroundStyle(Color("Gold"))
                            }

                            VStack(alignment: .leading, spacing: 3) {
                                Text(church.name)
                                    .font(.body.weight(.semibold))
                                    .foregroundStyle(.primary)
                                    .lineLimit(2)

                                if let city = church.address.city {
                                    Text(city)
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                            }

                            Spacer()

                            Text(distanceToUser(church))
                                .font(.subheadline.weight(.medium))
                                .foregroundStyle(.secondary)
                        }
                        .padding(.vertical, 4)
                    }
                }
            }
            .listStyle(.insetGrouped)
            .navigationTitle("Eglises les plus proches")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Fermer") { dismiss() }
                }
            }
        }
    }
}

#Preview {
    MapTabView(splashDone: true)
        .environment(ChurchStore())
        .environment(AuthStore())
        .modelContainer(for: SavedChurch.self, inMemory: true)
}
