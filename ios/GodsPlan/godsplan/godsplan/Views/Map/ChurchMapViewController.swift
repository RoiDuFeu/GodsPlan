import UIKit
import MapKit
import SwiftUI

// MARK: - ChurchMapViewController (UIKit MKMapView with MapKit clustering)

final class ChurchMapViewController: UIViewController {

    private(set) var mapView: MKMapView?
    private let coordinator = MapCoordinator()

    /// Callback when a church annotation is selected.
    var onChurchSelected: ((String, String, CLLocationCoordinate2D) -> Void)?

    /// Callback when the visible region changes.
    var onRegionChanged: ((MKCoordinateRegion) -> Void)?

    /// Current annotations tracked for efficient diffing.
    private var annotationsByID: [String: ChurchAnnotation] = [:]

    /// Tracks whether clustering is currently enabled to avoid redundant remove/add cycles.
    private var clusteringEnabled: Bool = true

    /// Queued state for before map is ready
    private var pendingChurches: [ChurchListItem]?
    private var pendingStyle: MapStyleType?
    private var currentStyle: MapStyleType?

    /// Whether the initial pop-in animation has been played
    private var hasPlayedEntrance = false

    // MARK: - Lifecycle

    override func loadView() {
        // Use a container view so the MKMapView is not the root view.
        // This prevents CAMetalLayer from receiving zero-size drawables
        // before the parent layout is established.
        let container = UIView()
        container.backgroundColor = .systemBackground
        view = container
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()

        // Create the map lazily once the container has a valid size.
        // Minimum 44pt avoids CAMetalLayer zero-size drawable warnings.
        // Hide map during zero-size layout passes (tab switches, transitions)
        // to prevent CAMetalLayer zero-drawable warnings
        if let map = mapView {
            map.isHidden = view.bounds.width < 1 || view.bounds.height < 1
            // Keep map frame in sync — autoresizingMask can lag behind
            // on the first layout passes when SwiftUI is still negotiating size
            if map.frame != view.bounds {
                map.frame = view.bounds
            }
        }

        if mapView == nil, view.bounds.width >= 44, view.bounds.height >= 44 {
            let map = MKMapView(frame: view.bounds)
            map.autoresizingMask = [.flexibleWidth, .flexibleHeight]
            map.showsUserLocation = true
            map.showsCompass = false
            map.showsScale = false
            map.showsBuildings = false   // suppress triangulation warnings from bad building geometry in map data
            map.isPitchEnabled = true

            let config = MKStandardMapConfiguration(elevationStyle: .flat)
            config.showsTraffic = false
            config.pointOfInterestFilter = .excludingAll
            map.preferredConfiguration = config

            map.overrideUserInterfaceStyle = .unspecified

            // Initial region: Paris
            map.region = MKCoordinateRegion(
                center: CLLocationCoordinate2D(latitude: 48.8566, longitude: 2.3522),
                span: MKCoordinateSpan(latitudeDelta: 0.07, longitudeDelta: 0.07)
            )

            // Register annotation views and cluster views for MapKit clustering
            map.register(ChurchAnnotationView.self, forAnnotationViewWithReuseIdentifier: ChurchAnnotationView.reuseID)
            map.register(ChurchClusterView.self, forAnnotationViewWithReuseIdentifier: ChurchClusterView.reuseID)

            view.addSubview(map)
            mapView = map

            coordinator.attach(to: map)
            coordinator.onAnnotationSelected = { [weak self] church in
                self?.onChurchSelected?(church.id, church.name, church.coordinate)
            }
            coordinator.onRegionChanged = { [weak self] region in
                self?.onRegionChanged?(region)
                // Calculate zoom level and update clustering accordingly
                if let mapView = self?.mapView {
                    let zoomLevel = Self.zoomLevel(for: mapView)
                    self?.updateClustering(for: zoomLevel)
                }
            }

            // Apply any queued annotations/style
            if let pending = pendingChurches {
                setAnnotations(from: pending)
                pendingChurches = nil
            }
            if let style = pendingStyle {
                setMapStyle(style)
                pendingStyle = nil
            }
        }
    }

    override func viewDidLoad() {
        super.viewDidLoad()
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        // Pause Metal rendering to prevent zero-size drawable warnings during tab transitions
        mapView?.isHidden = true
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        if let map = mapView, view.bounds.width >= 1, view.bounds.height >= 1 {
            map.isHidden = false
        }
    }

    // MARK: - Annotation management (efficient diff-based)

    /// Set annotations from the provided church list.
    /// Annotations are assigned a clusteringIdentifier "church" so MapKit handles clustering.
    func setAnnotations(from churches: [ChurchListItem]) {
        guard let mapView else {
            pendingChurches = churches
            return
        }
        let newIDs = Set(churches.map(\.id))
        let existingIDs = Set(annotationsByID.keys)

        // Remove stale annotations
        let toRemove = existingIDs.subtracting(newIDs)
        if !toRemove.isEmpty {
            let removeAnnotations = toRemove.compactMap { annotationsByID[$0] }
            mapView.removeAnnotations(removeAnnotations)
            for id in toRemove { annotationsByID[id] = nil }
        }

        // Add new annotations
        let toAdd = newIDs.subtracting(existingIDs)
        if !toAdd.isEmpty {
            let churchMap = Dictionary(churches.map { ($0.id, $0) }, uniquingKeysWith: { _, last in last })
            var newAnnotations: [ChurchAnnotation] = []
            for id in toAdd {
                guard let item = churchMap[id] else { continue }
                let annotation = ChurchAnnotation.from(item)
                annotation.clusteringIdentifier = clusteringEnabled ? "church" : nil
                annotationsByID[id] = annotation
                newAnnotations.append(annotation)
            }
            mapView.addAnnotations(newAnnotations)
        }

        // Clustering now handled by MapKit; no manual declutter needed
    }

    /// Removes all annotations.
    func clearAnnotations() {
        guard let mapView else { return }
        // Clustering handled by MapKit, simply remove all annotations
        let all = Array(annotationsByID.values)
        mapView.removeAnnotations(all)
        annotationsByID.removeAll()
    }

    /// Plays a staggered pop-in animation on all visible annotation views. Called once after splash dismissal.
    func animateAnnotationsIfNeeded() {
        guard !hasPlayedEntrance, let mapView else { return }
        hasPlayedEntrance = true

        // Flip the shared flag so any future views appear normally
        ChurchAnnotationView.waitingForEntrance = false

        // Collect ALL annotation views currently on the map (church pins + clusters)
        let views: [MKAnnotationView] = mapView.annotations.compactMap { annotation in
            if annotation is MKUserLocation { return nil }
            return mapView.view(for: annotation)
        }

        // Views are already at scale 0.01 + alpha 0 from prepareForDisplay/configure.
        // Stagger the pop-in animation.
        for (index, v) in views.enumerated() {
            let delay = Double(index) * 0.025
            UIView.animate(
                withDuration: 0.45,
                delay: delay,
                usingSpringWithDamping: 0.65,
                initialSpringVelocity: 0.8,
                options: [.allowUserInteraction]
            ) {
                v.transform = .identity
                v.alpha = 1
            }
        }
    }

    // MARK: - Camera control

    func setRegion(_ region: MKCoordinateRegion, animated: Bool = true) {
        guard let mapView, !mapView.isHidden else { return }
        mapView.setRegion(region, animated: animated)

        // Progressive pitch: tilt the camera as we zoom in close
        let pitch = Self.pitchForSpan(region.span.latitudeDelta)
        if abs(mapView.camera.pitch - pitch) > 1 {
            let camera = mapView.camera.copy() as! MKMapCamera
            camera.pitch = pitch
            mapView.setCamera(camera, animated: animated)
        }
    }

    /// Compute camera pitch from span: 0° at wide zoom, up to 45° at max zoom.
    /// Pitch ramps in from span 0.01 (≈1km) down to 0.003 (≈300m).
    private static func pitchForSpan(_ span: Double) -> CGFloat {
        let upper = 0.01   // span above which pitch is 0
        let lower = 0.003  // span at or below which pitch is max
        guard span < upper else { return 0 }
        let t = max(0, min(1, (upper - span) / (upper - lower)))
        return CGFloat(t * 45)
    }

    func setCamera(_ camera: MKMapCamera, animated: Bool = true) {
        guard let mapView, !mapView.isHidden else { return }
        mapView.setCamera(camera, animated: animated)
    }

    func centerOnUserLocation() {
        guard let mapView, !mapView.isHidden else { return }
        if let location = mapView.userLocation.location {
            let region = MKCoordinateRegion(
                center: location.coordinate,
                span: MKCoordinateSpan(latitudeDelta: 0.02, longitudeDelta: 0.02)
            )
            mapView.setRegion(region, animated: true)
        }
    }

    // MARK: - Map style

    func setMapStyle(_ style: MapStyleType) {
        guard let mapView else {
            pendingStyle = style
            return
        }
        // Skip if style hasn't changed (avoids redundant config on tab return)
        guard currentStyle != style else { return }
        currentStyle = style
        let poiFilter = MKPointOfInterestFilter.excludingAll
        switch style {
        case .standard:
            let config = MKStandardMapConfiguration(elevationStyle: .flat)
            config.showsTraffic = false
            config.pointOfInterestFilter = poiFilter
            mapView.preferredConfiguration = config
        case .satellite:
            mapView.preferredConfiguration = MKImageryMapConfiguration(elevationStyle: .flat)
        case .hybrid:
            let config = MKHybridMapConfiguration(elevationStyle: .flat)
            config.showsTraffic = false
            config.pointOfInterestFilter = poiFilter
            mapView.preferredConfiguration = config
        }
    }


    // MARK: - Zoom and clustering control

    /// Update clustering of annotations depending on zoom level.
    /// When zoomed in close (zoomLevel >= 14), clustering is disabled so all individual churches are visible.
    /// When zoomed out (zoomLevel < 14), clusteringIdentifier is set to "church" so MapKit clusters annotations.
    func updateClustering(for zoomLevel: Double) {
        guard let mapView else { return }
        let shouldCluster = zoomLevel < 14

        // Skip if clustering state hasn't changed
        guard shouldCluster != clusteringEnabled else { return }
        clusteringEnabled = shouldCluster

        let desiredClusterID: String? = shouldCluster ? "church" : nil
        let allAnnotations = Array(annotationsByID.values)
        for annotation in allAnnotations {
            annotation.clusteringIdentifier = desiredClusterID
        }
        // Remove and re-add to force MapKit to refresh clustering
        mapView.removeAnnotations(allAnnotations)
        mapView.addAnnotations(allAnnotations)
    }

    /// Calculate approximate zoom level from the mapView's camera centerCoordinateDistance.
    /// This uses a simplified formula to convert camera distance to zoomLevel similar to web Mercator zoom.
    private static func zoomLevel(for mapView: MKMapView) -> Double {
        let distance = mapView.camera.centerCoordinateDistance
        // Approximate conversion based on empirical mapping:
        // Zoom level 20 ~ 1128 meters per pixel at equator
        // Rough formula: zoomLevel = 20 - log2(distance / 1128)
        // Clamp zoom level between 0 and 20
        let metersPerPixelAtZoom20 = 1128.497220
        let zoom = 20 - log2(distance / metersPerPixelAtZoom20)
        return max(0, min(20, zoom))
    }

}

// MARK: - Map style enum

enum MapStyleType: Equatable {
    case standard
    case satellite
    case hybrid
}

// MARK: - SwiftUI UIViewControllerRepresentable wrapper

struct ChurchMapViewRepresentable: UIViewControllerRepresentable {

    let churches: [ChurchListItem]
    var splashDone: Bool = false
    let onChurchSelected: (String, String, CLLocationCoordinate2D) -> Void
    let onRegionChanged: (MKCoordinateRegion) -> Void

    // External control bindings
    var regionToSet: MKCoordinateRegion?
    var animateRegion: Bool = true
    var cameraToSet: MKMapCamera?
    var mapStyle: MapStyleType = .standard
    var centerOnUser: Bool = false

    func makeUIViewController(context: Context) -> ChurchMapViewController {
        let vc = ChurchMapViewController()
        vc.onChurchSelected = onChurchSelected
        vc.onRegionChanged = onRegionChanged
        return vc
    }

    func updateUIViewController(_ vc: ChurchMapViewController, context: Context) {
        vc.setAnnotations(from: churches)
        vc.setMapStyle(mapStyle)

        if splashDone {
            vc.animateAnnotationsIfNeeded()
        }

        if let camera = cameraToSet {
            vc.setCamera(camera, animated: true)
        } else if let region = regionToSet {
            vc.setRegion(region, animated: animateRegion)
        }

        if centerOnUser {
            vc.centerOnUserLocation()
        }
    }
}
