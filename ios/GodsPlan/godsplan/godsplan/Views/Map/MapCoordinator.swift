import MapKit

// MARK: - Map coordinator (MKMapViewDelegate + decluttering pipeline)

final class MapCoordinator: NSObject, MKMapViewDelegate {

    var onAnnotationSelected: ((ChurchAnnotation) -> Void)?
    var onRegionChanged: ((MKCoordinateRegion) -> Void)?

    // Pipeline components
    private let visibilityController = ZoomVisibilityController()
    private let animator = AnnotationTransformAnimator()

    // Debounce state
    private var layoutWorkItem: DispatchWorkItem?
    private var isGesturing = false

    // Cache
    private var cachedAnnotations: [ChurchAnnotation] = []
    private var lastLayoutZoom: Double = -1

    func attach(to mapView: MKMapView) {
        mapView.delegate = self
    }

    // MARK: - MKMapViewDelegate

    /// Support both standard church pins and clusters using MapKit's clustering mechanism with custom views.
    func mapView(_ mapView: MKMapView, viewFor annotation: MKAnnotation) -> MKAnnotationView? {
        if annotation is MKUserLocation { return nil }

        if let cluster = annotation as? MKClusterAnnotation {
            // Dequeue and return custom cluster view
            let view = mapView.dequeueReusableAnnotationView(withIdentifier: ChurchClusterView.reuseID)
                as? ChurchClusterView
                ?? ChurchClusterView(annotation: cluster, reuseIdentifier: ChurchClusterView.reuseID)
            view.annotation = cluster
            return view
        }

        if let church = annotation as? ChurchAnnotation {
            // Dequeue and return custom church annotation view
            let view = mapView.dequeueReusableAnnotationView(withIdentifier: ChurchAnnotationView.reuseID)
                as? ChurchAnnotationView
                ?? ChurchAnnotationView(annotation: church, reuseIdentifier: ChurchAnnotationView.reuseID)
            view.annotation = church
            view.displayPriority = church.churchType.displayPriority
            // No manual clusteringIdentifier setting here; use MapKit clustering defaults.
            return view
        }

        return nil
    }

    func mapView(_ mapView: MKMapView, regionDidChangeAnimated animated: Bool) {
        let region = mapView.region
        isGesturing = false

        DispatchQueue.main.async { [weak self] in
            self?.onRegionChanged?(region)
        }

        // Debounce layout to avoid running on every intermediate frame
        scheduleDeclutter(mapView: mapView, delay: 0.08)
    }

    func mapView(_ mapView: MKMapView, regionWillChangeAnimated animated: Bool) {
        // Cancel pending layout during rapid gestures
        layoutWorkItem?.cancel()
        isGesturing = true
    }

    func mapView(_ mapView: MKMapView, didSelect annotation: MKAnnotation) {
        if let church = annotation as? ChurchAnnotation {
            DispatchQueue.main.async { [weak self] in
                self?.onAnnotationSelected?(church)
            }
        }
    }

    func mapView(_ mapView: MKMapView, didDeselect annotation: MKAnnotation) {
        // No-op
    }

    // MARK: - Decluttering pipeline

    /// Runs the complete decluttering pipeline:
    /// 1. Compute zoom level
    /// 2. Filter annotations by importance
    /// 3. Update visibility targets (alpha + scale)
    /// 4. Project visible annotations to screen space
    /// 5. Resolve collisions
    /// 6. Apply radial spreading
    /// 7. Animate transforms
    func runDeclutterPipeline(mapView: MKMapView, animated: Bool) {
        isGesturing = false

        // 1. Update zoom level
        visibilityController.update(mapView: mapView)
        let zoomLevel = visibilityController.currentZoom

        // Skip redundant recomputation if zoom hasn't changed enough
        let zoomDelta = abs(zoomLevel - lastLayoutZoom)
        let needsFullLayout = zoomDelta > 0.15 || lastLayoutZoom < 0

        // 2. Gather all church annotations
        let allAnnotations = mapView.annotations.compactMap { $0 as? ChurchAnnotation }
        cachedAnnotations = allAnnotations

        // 3. Filter by priority / importance for current zoom
        let prioritized = ChurchPriorityEngine.prioritize(
            allAnnotations,
            zoomLevel: zoomLevel,
            screenSize: mapView.bounds.size
        )

        // 4. Update visibility targets on ALL annotations
        visibilityController.updateAnnotationTargets(allAnnotations)

        // Annotations that didn't pass the priority filter get faded
        let prioritizedIDs = Set(prioritized.map(\.id))
        for annotation in allAnnotations where !prioritizedIDs.contains(annotation.id) {
            annotation.targetAlpha = 0
            annotation.targetScale = ChurchPriorityEngine.targetScale(for: zoomLevel) * 0.6
        }

        guard needsFullLayout else {
            // Just update alpha/scale without recomputing spatial layout
            animator.applyTransforms(
                annotations: allAnnotations,
                offsets: [:],
                mapView: mapView
            )
            return
        }

        lastLayoutZoom = zoomLevel

        // 5. Resolve screen-space collisions (only on visible annotations)
        let visibleAnnotations = prioritized.filter { $0.targetAlpha > 0.1 }
        var offsets = ScreenSpaceLayoutSolver.solve(
            annotations: visibleAnnotations,
            mapView: mapView,
            zoomLevel: zoomLevel
        )

        // 6. Apply radial spreading for co-located annotations
        offsets = RadialSpreadSolver.solve(
            annotations: visibleAnnotations,
            existingOffsets: offsets,
            mapView: mapView,
            zoomLevel: zoomLevel
        )

        // 7. Store offsets on annotation models
        for annotation in allAnnotations {
            annotation.layoutOffset = offsets[annotation.id] ?? .zero
        }

        // 8. Animate transforms
        if animated {
            animator.applyTransforms(
                annotations: allAnnotations,
                offsets: offsets,
                mapView: mapView
            )
        } else {
            animator.applyTransformsImmediate(
                annotations: allAnnotations,
                offsets: offsets,
                mapView: mapView
            )
        }
    }

    /// Debounced pipeline run for continuous gesture updates.
    func scheduleDeclutter(mapView: MKMapView, delay: TimeInterval = 0.05) {
        layoutWorkItem?.cancel()
        let workItem = DispatchWorkItem { [weak self, weak mapView] in
            guard let self, let mapView else { return }
            self.runDeclutterPipeline(mapView: mapView, animated: true)
        }
        layoutWorkItem = workItem
        DispatchQueue.main.asyncAfter(deadline: .now() + delay, execute: workItem)
    }

    /// Resets all transforms when annotations are replaced.
    func resetLayout(mapView: MKMapView) {
        animator.resetAll(annotations: cachedAnnotations, mapView: mapView)
        cachedAnnotations = []
        lastLayoutZoom = -1
        visibilityController.invalidateLayout()
    }
}
