import UIKit
import MapKit

// MARK: - Screen-space layout solver (grid-bucketed collision avoidance)

/// Resolves overlapping annotations in screen space using spatial hashing.
/// Complexity: O(n) amortized via grid bucketing.
enum ScreenSpaceLayoutSolver {

    /// Projected annotation with screen position and collision radius.
    struct ProjectedAnnotation {
        let annotation: ChurchAnnotation
        var screenPoint: CGPoint
        let radius: CGFloat
        var offset: CGPoint = .zero
    }

    /// Maximum displacement in points that an annotation can be pushed.
    private static let maxDisplacementBase: CGFloat = 30

    /// Projects visible annotations to screen coordinates and resolves collisions.
    /// Returns offset vectors keyed by annotation ID.
    static func solve(
        annotations: [ChurchAnnotation],
        mapView: MKMapView,
        zoomLevel: Double
    ) -> [String: CGPoint] {
        guard !annotations.isEmpty else { return [:] }

        let markerRadius: CGFloat = 16
        let zoomScale = ChurchPriorityEngine.targetScale(for: zoomLevel)
        let effectiveRadius = markerRadius * zoomScale
        let maxDisplacement = maxDisplacementBase * zoomScale

        // Project to screen space
        var projected: [ProjectedAnnotation] = []
        projected.reserveCapacity(annotations.count)

        for annotation in annotations {
            let point = mapView.convert(annotation.coordinate, toPointTo: mapView)

            // Skip annotations off-screen (with padding)
            let bounds = mapView.bounds.insetBy(dx: -60, dy: -60)
            guard bounds.contains(point) else { continue }

            projected.append(ProjectedAnnotation(
                annotation: annotation,
                screenPoint: point,
                radius: effectiveRadius
            ))
        }

        guard projected.count > 1 else {
            if let single = projected.first {
                return [single.annotation.id: .zero]
            }
            return [:]
        }

        // Grid-based spatial hashing
        let cellSize = effectiveRadius * 2.5
        resolveCollisions(projected: &projected, cellSize: cellSize, maxDisplacement: maxDisplacement)

        // Build result
        var offsets: [String: CGPoint] = [:]
        offsets.reserveCapacity(projected.count)
        for p in projected {
            offsets[p.annotation.id] = p.offset
        }
        return offsets
    }

    /// Grid-bucketed collision resolution. O(n) amortized.
    private static func resolveCollisions(
        projected: inout [ProjectedAnnotation],
        cellSize: CGFloat,
        maxDisplacement: CGFloat
    ) {
        // Build spatial hash grid
        var grid: [GridKey: [Int]] = [:]
        grid.reserveCapacity(projected.count)

        for (i, p) in projected.enumerated() {
            let key = GridKey(
                col: Int(floor(p.screenPoint.x / cellSize)),
                row: Int(floor(p.screenPoint.y / cellSize))
            )
            grid[key, default: []].append(i)
        }

        // For each annotation, check neighbors in adjacent cells
        let maxIterations = 3
        for _ in 0..<maxIterations {
            var anyMoved = false

            for i in 0..<projected.count {
                let pi = projected[i]
                let adjustedI = CGPoint(
                    x: pi.screenPoint.x + pi.offset.x,
                    y: pi.screenPoint.y + pi.offset.y
                )
                let col = Int(floor(adjustedI.x / cellSize))
                let row = Int(floor(adjustedI.y / cellSize))

                // Check 3x3 neighborhood
                for dc in -1...1 {
                    for dr in -1...1 {
                        let neighborKey = GridKey(col: col + dc, row: row + dr)
                        guard let neighbors = grid[neighborKey] else { continue }

                        for j in neighbors {
                            guard j != i else { continue }

                            let pj = projected[j]
                            let adjustedJ = CGPoint(
                                x: pj.screenPoint.x + pj.offset.x,
                                y: pj.screenPoint.y + pj.offset.y
                            )

                            let dx = adjustedI.x - adjustedJ.x
                            let dy = adjustedI.y - adjustedJ.y
                            let dist = sqrt(dx * dx + dy * dy)
                            let minDist = pi.radius + pj.radius

                            if dist < minDist && dist > 0.01 {
                                let overlap = (minDist - dist) * 0.5
                                let nx = dx / dist
                                let ny = dy / dist

                                // Push proportional to importance (lower importance moves more)
                                let wi = pj.annotation.importanceScore
                                let wj = pi.annotation.importanceScore
                                let total = wi + wj
                                let ratioI = total > 0 ? CGFloat(wi / total) : 0.5
                                let ratioJ = total > 0 ? CGFloat(wj / total) : 0.5

                                projected[i].offset.x += nx * overlap * ratioI
                                projected[i].offset.y += ny * overlap * ratioI
                                projected[j].offset.x -= nx * overlap * ratioJ
                                projected[j].offset.y -= ny * overlap * ratioJ

                                anyMoved = true
                            }
                        }
                    }
                }

                // Clamp displacement
                projected[i].offset = clamp(projected[i].offset, maxRadius: maxDisplacement)
            }

            if !anyMoved { break }
        }
    }

    private static func clamp(_ offset: CGPoint, maxRadius: CGFloat) -> CGPoint {
        let dist = sqrt(offset.x * offset.x + offset.y * offset.y)
        if dist <= maxRadius { return offset }
        let scale = maxRadius / dist
        return CGPoint(x: offset.x * scale, y: offset.y * scale)
    }

    // MARK: - Grid key

    private struct GridKey: Hashable {
        let col: Int
        let row: Int
    }
}
