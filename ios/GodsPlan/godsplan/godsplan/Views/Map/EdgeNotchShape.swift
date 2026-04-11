import SwiftUI

/// The black bezel sliver along the left screen edge, with a concave curve
/// bulging inward. Filled black, this looks like the device bezel extending
/// into the screen — the "carved notch" effect.
///
/// The shape traces: left edge top → down to curve entry → concave arc inward
/// → back to left edge → down to bottom. Only the bezel area is filled.
struct EdgeNotchShape: Shape {
    var notchCenterY: CGFloat
    var notchDepth: CGFloat
    var notchHeight: CGFloat

    var animatableData: AnimatablePair<CGFloat, AnimatablePair<CGFloat, CGFloat>> {
        get {
            AnimatablePair(notchCenterY, AnimatablePair(notchDepth, notchHeight))
        }
        set {
            notchCenterY = newValue.first
            notchDepth = newValue.second.first
            notchHeight = newValue.second.second
        }
    }

    func path(in rect: CGRect) -> Path {
        // Guard against degenerate rects — return a minimal 1pt rect
        // instead of an empty path to avoid "clip: empty path" warnings
        guard rect.width > 0, rect.height > 0, notchHeight > 1, notchDepth > 0.5 else {
            return Path(CGRect(x: rect.minX, y: rect.minY, width: max(rect.width, 0.1), height: max(rect.height, 0.1)))
        }

        var path = Path()

        let halfHeight = notchHeight / 2
        let entryY = max(rect.minY, notchCenterY - halfHeight)
        let exitY = min(rect.maxY, notchCenterY + halfHeight)

        // Start at top-left corner
        path.move(to: CGPoint(x: rect.minX, y: rect.minY))

        // Down the left edge to the curve entry point
        path.addLine(to: CGPoint(x: rect.minX, y: entryY))

        // Upper curve: left edge → inward to apex
        path.addCurve(
            to: CGPoint(x: notchDepth, y: notchCenterY),
            control1: CGPoint(x: rect.minX, y: entryY + halfHeight * 0.35),
            control2: CGPoint(x: notchDepth, y: notchCenterY - halfHeight * 0.3)
        )

        // Lower curve: apex → back to left edge
        path.addCurve(
            to: CGPoint(x: rect.minX, y: exitY),
            control1: CGPoint(x: notchDepth, y: notchCenterY + halfHeight * 0.3),
            control2: CGPoint(x: rect.minX, y: exitY - halfHeight * 0.35)
        )

        // Down the left edge to bottom-left corner
        path.addLine(to: CGPoint(x: rect.minX, y: rect.maxY))

        // Close along the very left edge (zero-width strip)
        path.closeSubpath()

        return path
    }
}
