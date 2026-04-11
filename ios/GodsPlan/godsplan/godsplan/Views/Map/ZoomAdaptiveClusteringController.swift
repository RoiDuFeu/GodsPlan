import MapKit

// MARK: - Zoom-adaptive clustering controller (legacy, replaced by ZoomVisibilityController)

/// Retained for backward compatibility. The bump-style decluttering pipeline
/// uses ZoomVisibilityController instead of clustering-based visibility.
final class ZoomAdaptiveClusteringController {

    private(set) var currentZoomLevel: MapZoomLevel = .city
    private weak var mapView: MKMapView?

    init(mapView: MKMapView) {
        self.mapView = mapView
    }

    @discardableResult
    func update() -> Bool {
        guard let mapView else { return false }
        let altitude = mapView.camera.centerCoordinateDistance
        let zoom = altitude > 0 ? max(0, log2(40_075_000 / altitude)) : 18.0
        let newLevel = MapZoomLevel.from(zoom: zoom)

        guard newLevel != currentZoomLevel else { return false }
        currentZoomLevel = newLevel
        return true
    }
}
