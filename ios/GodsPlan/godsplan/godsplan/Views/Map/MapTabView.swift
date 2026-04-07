import SwiftUI
import MapKit

struct MapTabView: View {
    @Environment(ChurchStore.self) private var store
    @State private var position: MapCameraPosition = .region(
        MKCoordinateRegion(
            center: CLLocationCoordinate2D(latitude: 48.8566, longitude: 2.3522),
            span: MKCoordinateSpan(latitudeDelta: 0.07, longitudeDelta: 0.07)
        )
    )
    @State private var selectedItem: ChurchListItem?
    @State private var mapStyle: MapStyle = .standard(elevation: .realistic, pointsOfInterest: .excludingAll)
    @State private var styleIndex = 0
    @State private var locationManager = CLLocationManager()
    @State private var clusters: [ChurchCluster] = []
    @State private var currentSpan = MKCoordinateSpan(latitudeDelta: 0.07, longitudeDelta: 0.07)
    @State private var lastClusterCellSize: Double = 0
    @State private var mapReady = false

    // City selector state
    @State private var currentCity = "Paris"
    @State private var showCityPicker = false
    @State private var isAutoUpdatingCity = true
    @State private var geocodeTask: Task<Void, Never>?

    private let styles: [(String, String, MapStyle)] = [
        ("Standard",  "map",       .standard(elevation: .realistic, pointsOfInterest: .excludingAll)),
        ("Satellite", "globe",     .imagery(elevation: .realistic)),
        ("Hybride",   "map.fill",  .hybrid(elevation: .realistic, pointsOfInterest: .excludingAll))
    ]

    var body: some View {
        NavigationStack {
            ZStack(alignment: .top) {
                if mapReady {
                    Map(position: $position, selection: $selectedItem) {
                    ForEach(clusters) { cluster in
                        if cluster.isSingle, let church = cluster.church {
                            Annotation("", coordinate: CLLocationCoordinate2D(latitude: church.lat, longitude: church.lng), anchor: .bottom) {
                                ChurchAnnotationView(isSelected: selectedItem?.id == church.id)
                                    .onTapGesture { selectedItem = church }
                            }
                            .tag(church)
                        } else {
                            Annotation("", coordinate: cluster.coordinate, anchor: .center) {
                                ClusterAnnotationView(count: cluster.count)
                                    .onTapGesture { zoomIntoCluster(cluster) }
                            }
                        }
                    }
                    UserAnnotation()
                }
                .mapStyle(mapStyle)
                .mapControls { }
                .ignoresSafeArea(edges: .bottom)
                .onMapCameraChange(frequency: .onEnd) { context in
                    reverseGeocode(context.camera.centerCoordinate)
                    currentSpan = context.region.span
                    updateClusters()
                }
                }

                // City selector pill
                citySelectorPill
                    .padding(.top, 8)
            }
            .navigationTitle("")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(.regularMaterial, for: .navigationBar)
            .toolbarColorScheme(.light, for: .navigationBar)
            .toolbar(content: mapToolbar)
        }
        .sheet(item: $selectedItem, onDismiss: { store.clearSelection() }) { church in
            ChurchDetailSheet(churchId: church.id, churchName: church.name)
                .presentationDetents([.medium, .large])
                .presentationDragIndicator(.visible)
                .presentationCornerRadius(28)
                .presentationBackground(.regularMaterial)
        }
        .sheet(isPresented: $showCityPicker) {
            CityPickerSheet { coordinate, city in
                currentCity = city
                isAutoUpdatingCity = true
                withAnimation(.easeInOut(duration: 0.7)) {
                    position = .region(MKCoordinateRegion(
                        center: coordinate,
                        span: MKCoordinateSpan(latitudeDelta: 0.07, longitudeDelta: 0.07)
                    ))
                }
            }
            .presentationDetents([.medium])
            .presentationDragIndicator(.visible)
            .presentationCornerRadius(24)
        }
        .onChange(of: selectedItem) { _, newValue in
            guard let church = newValue else { return }
            Task { await store.selectChurch(id: church.id) }
            let coord = CLLocationCoordinate2D(latitude: church.lat, longitude: church.lng)
            withAnimation(.easeInOut(duration: 0.7)) {
                position = .camera(MapCamera(
                    centerCoordinate: coord,
                    distance: 1200,
                    heading: 0,
                    pitch: 45
                ))
            }
        }
        .onAppear {
            locationManager.requestWhenInUseAuthorization()
            updateClusters(force: true)
            DispatchQueue.main.async { mapReady = true }
        }
        .onChange(of: store.churches) { _, _ in
            updateClusters(force: true)
        }
    }

    // MARK: - City selector pill

    private var citySelectorPill: some View {
        Button { showCityPicker = true } label: {
            HStack(spacing: 6) {
                Image(systemName: "mappin.circle.fill")
                    .foregroundStyle(Color("Gold"))
                Text(currentCity)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(.primary)
                Image(systemName: "chevron.down")
                    .font(.caption2.weight(.bold))
                    .foregroundStyle(.tertiary)
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 8)
            .background(.regularMaterial, in: Capsule())
            .shadow(color: .black.opacity(0.10), radius: 6, y: 2)
        }
        .buttonStyle(.plain)
    }

    // MARK: - Reverse geocode on pan

    private func reverseGeocode(_ coordinate: CLLocationCoordinate2D) {
        geocodeTask?.cancel()
        geocodeTask = Task {
            let location = CLLocation(latitude: coordinate.latitude, longitude: coordinate.longitude)
            guard let request = MKReverseGeocodingRequest(location: location) else { return }
            do {
                let mapItems = try await request.mapItems
                if !Task.isCancelled,
                   let city = mapItems.first?.addressRepresentations?.cityName {
                    currentCity = city
                }
            } catch {}
        }
    }

    // MARK: - Clustering

    private func updateClusters(force: Bool = false) {
        let cellSize = MapClusterManager.cellSize(for: currentSpan)
        // Only recluster when zoom level changes enough (>20% difference)
        let ratio = lastClusterCellSize > 0 ? cellSize / lastClusterCellSize : 0
        guard force || ratio < 0.8 || ratio > 1.2 else { return }
        lastClusterCellSize = cellSize
        withAnimation(.easeInOut(duration: 0.25)) {
            clusters = MapClusterManager.cluster(store.churches, cellSize: cellSize)
        }
    }

    private func zoomIntoCluster(_ cluster: ChurchCluster) {
        let span = currentSpan
        withAnimation(.easeInOut(duration: 0.5)) {
            position = .region(MKCoordinateRegion(
                center: cluster.coordinate,
                span: MKCoordinateSpan(
                    latitudeDelta: span.latitudeDelta / 3,
                    longitudeDelta: span.longitudeDelta / 3
                )
            ))
        }
    }

    // MARK: - Toolbar

    @ToolbarContentBuilder
    private func mapToolbar() -> some ToolbarContent {
        ToolbarItem(placement: .principal) {
            VStack(spacing: 2) {
                Text("Carte")
                    .font(.headline)
                Text("\(store.churches.count) église\(store.churches.count == 1 ? "" : "s")")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }

        ToolbarItem(placement: .topBarTrailing) {
            Button {
                styleIndex = (styleIndex + 1) % styles.count
                withAnimation(.easeInOut(duration: 0.3)) {
                    mapStyle = styles[styleIndex].2
                }
            } label: {
                Label(styles[styleIndex].0, systemImage: styles[styleIndex].1)
                    .font(.caption.weight(.semibold))
                    .labelStyle(.titleAndIcon)
            }
            .buttonStyle(.bordered)
            .buttonBorderShape(.capsule)
            .controlSize(.small)
            .tint(.primary)
        }

        ToolbarItem(placement: .topBarTrailing) {
            Button {
                withAnimation(.spring(response: 0.6, dampingFraction: 0.8)) {
                    position = .userLocation(fallback: position)
                }
            } label: {
                Image(systemName: "location.fill")
                    .foregroundStyle(Color("Gold"))
            }
            .buttonStyle(.bordered)
            .buttonBorderShape(.circle)
            .controlSize(.small)
            .tint(Color("Gold"))
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
            .listStyle(.plain)
            .searchable(text: $query, placement: .navigationBarDrawer(displayMode: .always), prompt: "Rechercher une ville…")
            .navigationTitle("Choisir une ville")
            .navigationBarTitleDisplayMode(.inline)
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
