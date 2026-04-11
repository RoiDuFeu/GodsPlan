import MapKit

// MARK: - Zoom level classification

enum MapZoomLevel: Equatable {
    case city       // zoom < 10
    case district   // zoom 10–14
    case street     // zoom >= 15

    /// Derives zoom level from camera altitude (meters).
    static func from(altitude: CLLocationDistance) -> MapZoomLevel {
        // Approximate altitude → zoom level mapping
        let zoom = zoomFromAltitude(altitude)
        return from(zoom: zoom)
    }

    /// Derives zoom level from visible map rect span.
    static func from(visibleRect: MKMapRect) -> MapZoomLevel {
        let widthMeters = visibleRect.size.width / MKMapPointsPerMeterAtLatitude(48.85)
        let zoom: Double
        switch widthMeters {
        case 50_000...: zoom = 8
        case 20_000..<50_000: zoom = 10
        case 5_000..<20_000: zoom = 12
        case 1_000..<5_000: zoom = 14
        case 500..<1_000: zoom = 16
        default: zoom = 18
        }
        return from(zoom: zoom)
    }

    static func from(zoom: Double) -> MapZoomLevel {
        switch zoom {
        case ..<10:  return .city
        case ..<15:  return .district
        default:     return .street
        }
    }

    /// Approximate zoom level from camera altitude.
    private static func zoomFromAltitude(_ altitude: CLLocationDistance) -> Double {
        // log2 approximation of Mercator zoom level
        // At zoom 0 ≈ 40,000km, each level halves
        guard altitude > 0 else { return 20 }
        return max(0, log2(40_075_000 / altitude))
    }
}

// MARK: - Zoom visibility controller (no clustering)

/// Controls annotation visibility via alpha and scale transforms based on zoom level.
/// NEVER removes or adds annotations. Only adjusts visual properties.
final class ZoomVisibilityController {

    private(set) var currentZoomLevel: MapZoomLevel = .city
    private(set) var currentZoom: Double = 10.0

    /// Call from regionDidChangeAnimated. Returns true if zoom level changed.
    @discardableResult
    func update(mapView: MKMapView) -> Bool {
        let newZoom = computeZoom(mapView: mapView)
        let newLevel = MapZoomLevel.from(zoom: newZoom)

        let changed = newLevel != currentZoomLevel
        currentZoomLevel = newLevel
        currentZoom = newZoom
        return changed
    }

    /// Computes the approximate zoom level from the map view state.
    func computeZoom(mapView: MKMapView) -> Double {
        let altitude = mapView.camera.centerCoordinateDistance
        guard altitude > 0 else { return 18 }
        return max(0, log2(40_075_000 / altitude))
    }

    /// Updates target alpha and scale on annotations based on current zoom.
    /// Does NOT modify annotation view properties directly — sets values on
    /// the annotation model for the animator to apply.
    func updateAnnotationTargets(_ annotations: [ChurchAnnotation]) {
        let scale = ChurchPriorityEngine.targetScale(for: currentZoom)

        for annotation in annotations {
            annotation.targetAlpha = ChurchPriorityEngine.targetAlpha(
                for: annotation,
                zoomLevel: currentZoom
            )
            annotation.targetScale = scale
        }
    }

    /// Returns true if the zoom delta since last computation exceeds the threshold,
    /// warranting a layout recomputation.
    private var lastComputedZoom: Double = -1

    func shouldRecomputeLayout(threshold: Double = 0.3) -> Bool {
        let delta = abs(currentZoom - lastComputedZoom)
        if delta >= threshold {
            lastComputedZoom = currentZoom
            return true
        }
        return false
    }

    /// Forces layout recomputation on next check.
    func invalidateLayout() {
        lastComputedZoom = -1
    }
}
