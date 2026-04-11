import UIKit
import MapKit

// MARK: - Annotation transform animator

/// Applies position, scale, and alpha transforms to annotation views
/// using UIViewPropertyAnimator with spring timing for smooth 60fps transitions.
final class AnnotationTransformAnimator {

    /// Active animators keyed by annotation ID for interruption support.
    private var activeAnimators: [String: UIViewPropertyAnimator] = [:]

    /// Spring timing parameters.
    private let springDamping: CGFloat = 0.82
    private let springDuration: TimeInterval = 0.25

    /// Applies layout offsets, scale, and alpha to annotation views.
    /// All transforms are applied via CGAffineTransform — no layout passes.
    func applyTransforms(
        annotations: [ChurchAnnotation],
        offsets: [String: CGPoint],
        mapView: MKMapView
    ) {
        for annotation in annotations {
            guard let view = mapView.view(for: annotation) as? ChurchAnnotationView else { continue }

            let offset = offsets[annotation.id] ?? .zero
            let scale = annotation.targetScale
            let alpha = annotation.targetAlpha

            // Build combined transform: translate + scale
            let targetTransform = CGAffineTransform(translationX: offset.x, y: offset.y)
                .scaledBy(x: scale, y: scale)
            let targetAlpha = alpha

            // Skip animation if values haven't changed meaningfully
            let currentTransform = view.transform
            let transformDelta = abs(currentTransform.tx - targetTransform.tx)
                + abs(currentTransform.ty - targetTransform.ty)
                + abs(currentTransform.a - targetTransform.a)
            let alphaDelta = abs(view.alpha - targetAlpha)

            if transformDelta < 0.5 && alphaDelta < 0.02 { continue }

            // Interrupt any running animator for this annotation
            let id = annotation.id
            if let existing = activeAnimators[id], existing.isRunning {
                existing.stopAnimation(true)
            }

            // Create spring animator
            let animator = UIViewPropertyAnimator(
                duration: springDuration,
                dampingRatio: springDamping
            ) {
                view.transform = targetTransform
                view.alpha = targetAlpha
            }

            animator.isInterruptible = true
            animator.isUserInteractionEnabled = true

            animator.addCompletion { [weak self] _ in
                self?.activeAnimators[id] = nil
            }

            activeAnimators[id] = animator
            animator.startAnimation()
        }
    }

    /// Immediately applies transforms without animation (used during rapid gestures).
    func applyTransformsImmediate(
        annotations: [ChurchAnnotation],
        offsets: [String: CGPoint],
        mapView: MKMapView
    ) {
        for annotation in annotations {
            guard let view = mapView.view(for: annotation) as? ChurchAnnotationView else { continue }

            let offset = offsets[annotation.id] ?? .zero
            let scale = annotation.targetScale
            let alpha = annotation.targetAlpha

            view.transform = CGAffineTransform(translationX: offset.x, y: offset.y)
                .scaledBy(x: scale, y: scale)
            view.alpha = alpha
        }
    }

    /// Cancels all running animations.
    func cancelAll() {
        for (_, animator) in activeAnimators where animator.isRunning {
            animator.stopAnimation(true)
        }
        activeAnimators.removeAll()
    }

    /// Resets all annotation views to identity transform.
    func resetAll(annotations: [ChurchAnnotation], mapView: MKMapView) {
        cancelAll()
        for annotation in annotations {
            guard let view = mapView.view(for: annotation) as? ChurchAnnotationView else { continue }
            view.transform = .identity
            view.alpha = 1.0
        }
    }
}
