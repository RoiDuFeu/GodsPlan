import Foundation
import UIKit

// MARK: - Church priority engine

/// Sorts and filters annotations by importance score for rendering priority.
/// Higher importance annotations win collision resistance and are shown first at wider zooms.
/// Uses an adaptive density cap so churches are always visible at every zoom level
/// without overloading the map when zoomed out.
enum ChurchPriorityEngine {

    /// Returns annotations sorted by descending importance, capped to a
    /// screen-density-aware limit that scales with zoom level.
    static func prioritize(
        _ annotations: [ChurchAnnotation],
        zoomLevel: Double,
        screenSize: CGSize
    ) -> [ChurchAnnotation] {
        let sorted = annotations.sorted { $0.importanceScore > $1.importanceScore }
        let cap = densityCap(zoomLevel: zoomLevel, screenSize: screenSize)
        return Array(sorted.prefix(cap))
    }

    /// Maximum number of annotations for the current zoom and screen size.
    /// At street level everything is shown; at city level only the most
    /// important churches appear, scaled by available screen area.
    static func densityCap(zoomLevel: Double, screenSize: CGSize) -> Int {
        let baseDensity: Double
        switch zoomLevel {
        case ..<8:   baseDensity = 0.4   // ~15 on iPhone
        case ..<10:  baseDensity = 0.7   // ~25
        case ..<12:  baseDensity = 1.2   // ~45
        case ..<14:  baseDensity = 2.5   // ~95
        case ..<16:  baseDensity = 5.0   // ~190
        default:     return Int.max      // street: show all
        }
        let screenTiles = Double(screenSize.width * screenSize.height) / (100.0 * 100.0)
        return max(5, Int(baseDensity * screenTiles))
    }

    /// Returns the importance threshold for a given zoom level.
    /// Annotations below this threshold fade but remain visible (minimum alpha).
    static func importanceThreshold(for zoomLevel: Double) -> Float {
        switch zoomLevel {
        case ..<8:   return 0.6
        case ..<10:  return 0.4
        case ..<13:  return 0.2
        case ..<15:  return 0.1
        default:     return 0.0   // Everything fully visible
        }
    }

    /// Computes target alpha for an annotation based on zoom level.
    /// Annotations that passed the density cap are always at least faintly
    /// visible (minimum alpha 0.35) so the map never feels empty.
    static func targetAlpha(
        for annotation: ChurchAnnotation,
        zoomLevel: Double
    ) -> CGFloat {
        let threshold = importanceThreshold(for: zoomLevel)
        let score = annotation.importanceScore

        if score >= threshold {
            return 1.0
        }

        // Fade proportionally below threshold, but guarantee minimum visibility
        let deficit = threshold - score
        let alpha = CGFloat(max(0.35, 1.0 - Double(deficit) * 2.5))
        return alpha
    }

    /// Computes zoom-adaptive scale for an annotation.
    static func targetScale(for zoomLevel: Double) -> CGFloat {
        switch zoomLevel {
        case 16...:  return 1.0    // Street
        case 14..<16: return 0.9
        case 12..<14: return 0.8   // District
        case 10..<12: return 0.7
        default:      return 0.6   // City
        }
    }
}
