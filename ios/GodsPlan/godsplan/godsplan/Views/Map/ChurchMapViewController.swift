import UIKit
import MapKit
import SwiftUI

// MARK: - ChurchMapViewController (UIKit MKMapView with bump-style decluttering)

final class ChurchMapViewController: UIViewController {

    private(set) var mapView: MKMapView?
    private let coordinator = MapCoordinator()

    /// Callback when a church annotation is selected.
    var onChurchSelected: ((String, String, CLLocationCoordinate2D) -> Void)?

    /// Callback when the visible region changes.
    var onRegionChanged: ((MKCoordinateRegion) -> Void)?

    /// Current annotations tracked for efficient diffing.
    private var annotationsByID: [String: ChurchAnnotation] = [:]

    /// Queued state for before map is ready
    private var pendingChurches: [ChurchListItem]?
    private var pendingStyle: MapStyleType?

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

            view.addSubview(map)
            mapView = map

            coordinator.attach(to: map)
            coordinator.onAnnotationSelected = { [weak self] church in
                self?.onChurchSelected?(church.id, church.name, church.coordinate)
            }
            coordinator.onRegionChanged = { [weak self] region in
                self?.onRegionChanged?(region)
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

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        if let map = mapView, view.bounds.width >= 1, view.bounds.height >= 1 {
            map.isHidden = false
        }
    }

    // MARK: - Annotation management (efficient diff-based)

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
                annotationsByID[id] = annotation
                newAnnotations.append(annotation)
            }
            mapView.addAnnotations(newAnnotations)
        }

        // Run initial declutter after annotations are added
        if !toAdd.isEmpty || !toRemove.isEmpty {
            coordinator.resetLayout(mapView: mapView)
            // Delay slightly to let MapKit create annotation views
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) { [weak self] in
                guard let self, let mapView = self.mapView else { return }
                self.coordinator.runDeclutterPipeline(mapView: mapView, animated: true)
            }
        }
    }

    /// Removes all annotations.
    func clearAnnotations() {
        guard let mapView else { return }
        coordinator.resetLayout(mapView: mapView)
        let all = Array(annotationsByID.values)
        mapView.removeAnnotations(all)
        annotationsByID.removeAll()
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

}

// MARK: - Map style enum

enum MapStyleType {
    case standard
    case satellite
    case hybrid
}

// MARK: - SwiftUI UIViewControllerRepresentable wrapper

struct ChurchMapViewRepresentable: UIViewControllerRepresentable {

    let churches: [ChurchListItem]
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
