import UIKit
import MapKit

// MARK: - Radial spread solver for co-located annotations

/// When multiple annotations share nearly identical coordinates,
/// spreads them into a ring layout with equal angular spacing.
enum RadialSpreadSolver {

    /// Distance threshold in screen points below which annotations
    /// are considered co-located and need spreading.
    private static let proximityThreshold: CGFloat = 6.0

    /// Base ring radius at street zoom.
    private static let baseRadius: CGFloat = 28.0

    /// Detects co-located groups and returns spread offsets keyed by annotation ID.
    /// Merges with existing offsets from collision solver.
    static func solve(
        annotations: [ChurchAnnotation],
        existingOffsets: [String: CGPoint],
        mapView: MKMapView,
        zoomLevel: Double
    ) -> [String: CGPoint] {
        guard annotations.count > 1 else { return existingOffsets }

        var offsets = existingOffsets

        // Project all to screen space
        var screenPoints: [(annotation: ChurchAnnotation, point: CGPoint)] = []
        screenPoints.reserveCapacity(annotations.count)

        for annotation in annotations {
            let point = mapView.convert(annotation.coordinate, toPointTo: mapView)
            screenPoints.append((annotation, point))
        }

        // Find co-located groups using spatial hashing
        let cellSize = proximityThreshold * 2
        var grid: [GridKey: [Int]] = [:]

        for (i, sp) in screenPoints.enumerated() {
            let key = GridKey(
                col: Int(floor(sp.point.x / cellSize)),
                row: Int(floor(sp.point.y / cellSize))
            )
            grid[key, default: []].append(i)
        }

        // Track which annotations have been assigned to a group
        var grouped = Set<Int>()
        var groups: [[Int]] = []

        for (key, indices) in grid {
            for i in indices where !grouped.contains(i) {
                var group = [i]

                // Check neighbors in adjacent cells
                for dc in -1...1 {
                    for dr in -1...1 {
                        let neighborKey = GridKey(col: key.col + dc, row: key.row + dr)
                        guard let neighbors = grid[neighborKey] else { continue }

                        for j in neighbors {
                            guard j != i, !grouped.contains(j) else { continue }
                            let dx = screenPoints[i].point.x - screenPoints[j].point.x
                            let dy = screenPoints[i].point.y - screenPoints[j].point.y
                            let dist = sqrt(dx * dx + dy * dy)
                            if dist < proximityThreshold {
                                group.append(j)
                            }
                        }
                    }
                }

                if group.count > 1 {
                    // Sort by importance for stable ordering across frames
                    group.sort { screenPoints[$0].annotation.importanceScore > screenPoints[$1].annotation.importanceScore }
                    groups.append(group)
                    for idx in group { grouped.insert(idx) }
                }
            }
        }

        // Apply ring layout to each group
        let zoomScale = zoomScaleFactor(for: zoomLevel)
        let radius = baseRadius * zoomScale

        for group in groups {
            let count = group.count
            let angleStep = (2.0 * .pi) / Double(count)

            // First annotation (highest importance) stays at center — no spread
            // Remaining annotations spread around it
            for (ringIndex, idx) in group.enumerated() {
                let annotation = screenPoints[idx].annotation

                if ringIndex == 0 {
                    // Center annotation keeps its existing offset
                    continue
                }

                let angle = angleStep * Double(ringIndex) - .pi / 2 // Start from top
                let spreadX = CGFloat(cos(angle)) * radius
                let spreadY = CGFloat(sin(angle)) * radius

                // Add spread to existing collision offset
                let existing = offsets[annotation.id] ?? .zero
                offsets[annotation.id] = CGPoint(
                    x: existing.x + spreadX,
                    y: existing.y + spreadY
                )
            }
        }

        return offsets
    }

    /// Zoom-dependent radius scale: larger ring at city zoom, tighter at street zoom.
    private static func zoomScaleFactor(for zoomLevel: Double) -> CGFloat {
        switch zoomLevel {
        case 16...:  return 0.8   // Street — tight ring
        case 14..<16: return 0.9
        case 12..<14: return 1.0  // District — medium ring
        case 10..<12: return 1.1
        default:      return 1.2  // City — wider ring
        }
    }

    private struct GridKey: Hashable {
        let col: Int
        let row: Int
    }
}
