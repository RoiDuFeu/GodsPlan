import SwiftUI
import MapKit

struct MapTabView: View {
    @Environment(ChurchStore.self) private var store
    @State private var position: MapCameraPosition = .region(
        MKCoordinateRegion(
            center: CLLocationCoordinate2D(latitude: 48.8566, longitude: 2.3522),
            span: MKCoordinateSpan(latitudeDelta: 0.08, longitudeDelta: 0.08)
        )
    )
    @State private var selectedItem: ChurchListItem?
    @State private var showDetail = false
    @State private var mapStyle: MapStyle = .standard(elevation: .realistic)
    @State private var showStylePicker = false
    @State private var locationManager = CLLocationManager()

    var body: some View {
        ZStack(alignment: .topTrailing) {
            Map(position: $position, selection: $selectedItem) {
                ForEach(store.churches) { church in
                    Annotation(church.name, coordinate: CLLocationCoordinate2D(latitude: church.lat, longitude: church.lng), anchor: .bottom) {
                        ChurchAnnotationView(isSelected: selectedItem?.id == church.id)
                            .onTapGesture { selectedItem = church }
                    }
                    .tag(church)
                }
                UserAnnotation()
            }
            .mapStyle(mapStyle)
            .mapControls {
                MapUserLocationButton()
                MapCompass()
                MapScaleView()
            }
            .ignoresSafeArea(edges: .top)

            // Map style toggle
            VStack(spacing: 8) {
                Button {
                    withAnimation { showStylePicker.toggle() }
                } label: {
                    Image(systemName: "map")
                        .font(.system(size: 16, weight: .semibold))
                        .frame(width: 44, height: 44)
                        .background(.ultraThinMaterial, in: Circle())
                        .overlay(Circle().stroke(Color.primary.opacity(0.1), lineWidth: 1))
                }

                if showStylePicker {
                    VStack(spacing: 6) {
                        mapStyleButton("Standard", style: .standard(elevation: .realistic))
                        mapStyleButton("Satellite", style: .imagery(elevation: .realistic))
                        mapStyleButton("Hybride", style: .hybrid(elevation: .realistic))
                    }
                    .transition(.scale(scale: 0.8, anchor: .topTrailing).combined(with: .opacity))
                }
            }
            .padding(.top, 60)
            .padding(.trailing, 16)
        }
        .sheet(item: $selectedItem, onDismiss: { store.clearSelection() }) { church in
            ChurchDetailSheet(churchId: church.id, churchName: church.name)
                .presentationDetents([.medium, .large])
                .presentationDragIndicator(.visible)
        }
        .onChange(of: selectedItem) { _, newValue in
            if let church = newValue {
                Task { await store.selectChurch(id: church.id) }
                withAnimation(.easeInOut(duration: 0.6)) {
                    position = .camera(MapCamera(
                        centerCoordinate: CLLocationCoordinate2D(latitude: church.lat - 0.003, longitude: church.lng),
                        distance: 1200
                    ))
                }
            }
        }
        .onAppear {
            locationManager.requestWhenInUseAuthorization()
        }
    }

    @ViewBuilder
    private func mapStyleButton(_ label: String, style: MapStyle) -> some View {
        Button(label) {
            mapStyle = style
            showStylePicker = false
        }
        .font(.caption.weight(.medium))
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
        .background(.ultraThinMaterial, in: Capsule())
    }
}
