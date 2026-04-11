import SwiftUI
import MapKit

/// Bump-app-style zoom slider embedded in a concave notch cut into the left
/// edge of the map. The notch follows the handle with elastic spring motion,
/// and the map shifts subtly for a parallax carved-in effect.
struct EdgeZoomSlider: View {
    @Binding var regionToSet: MKCoordinateRegion?
    @Binding var isActive: Bool
    var currentSpan: MKCoordinateSpan
    var mapCenter: CLLocationCoordinate2D
    var minZoom: Double = 0.003
    var maxZoom: Double = 80.0
    var initialZoom: Double? = nil
    var onZoomChange: ((Double) -> Void)? = nil
    @Binding var parallaxOffset: CGFloat

    // MARK: - Internal state

    @State private var sliderProgress: CGFloat = 0.5
    @State private var progressAtDragStart: CGFloat?
    @State private var dragStartCenter: CLLocationCoordinate2D?
    @State private var lastNotchValue: Int = 5
    @State private var hideTimer: Task<Void, Never>?

    // Dual-state for elastic follow: handle moves instantly, notch follows with spring
    @State private var notchCenterY: CGFloat = 0
    @State private var notchDepth: CGFloat = 8   // resting = subtle indent

    // Finger-relative: notch spawns at touch location
    @State private var touchStartY: CGFloat = 0

    // Track height for coordinate mapping
    @State private var trackHeight: CGFloat = 0

    // MARK: - Constants

    private let trackPadding: CGFloat = 80       // top/bottom inset for slider travel
    private let stripWidth: CGFloat = 44         // interactive left-edge strip
    private let notchHeight: CGFloat = 90

    private let depthResting: CGFloat = 6
    private let depthDragging: CGFloat = 28

    private let notchSpring: Spring = Spring(mass: 0.6, stiffness: 180, damping: 18)

    var body: some View {
        GeometryReader { geo in
            let _ = updateTrackHeight(geo.size.height)

            ZStack(alignment: .leading) {
                // 1. Black carved notch
                EdgeNotchShape(
                    notchCenterY: notchCenterY,
                    notchDepth: notchDepth,
                    notchHeight: notchHeight
                )
                .fill(Color.black)
                .frame(width: stripWidth)
                .opacity(isActive ? 1.0 : 0.0)
                .allowsHitTesting(false)

                // 2. Resting indicator — subtle pill when inactive
                RoundedRectangle(cornerRadius: 2)
                    .fill(.primary.opacity(0.25))
                    .frame(width: 3, height: 24)
                    .position(x: 2, y: notchCenterY)
                    .opacity(isActive ? 0.0 : 1.0)
                    .allowsHitTesting(false)

                // 3. Invisible hit area for gestures
                Rectangle()
                    .fill(Color.clear)
                    .frame(width: stripWidth)
                    .contentShape(Rectangle())
                    .gesture(sliderDragGesture)
            }
            .frame(width: stripWidth, height: geo.size.height)
        }
        .frame(width: stripWidth)
        .onAppear {
            if let initial = initialZoom {
                syncProgressFromDelta(initial)
            } else {
                syncProgressFromSpan()
            }
        }
        .onChange(of: currentSpan.latitudeDelta) { _, _ in
            if !isActive { syncProgressFromSpan() }
        }
    }

    // MARK: - Track height helper

    private func updateTrackHeight(_ height: CGFloat) {
        if abs(trackHeight - height) > 1 {
            DispatchQueue.main.async { trackHeight = height }
        }
    }

    // MARK: - Gesture

    private var sliderDragGesture: some Gesture {
        DragGesture(minimumDistance: 0, coordinateSpace: .local)
            .onChanged { value in
                if !isActive {
                    // Activate — notch spawns at finger position
                    touchStartY = value.startLocation.y
                    notchCenterY = touchStartY
                    withAnimation(.spring(response: 0.2, dampingFraction: 0.7)) {
                        isActive = true
                    }
                    withAnimation(.interpolatingSpring(mass: 0.6, stiffness: 180, damping: 18)) {
                        notchDepth = depthDragging
                    }
                    syncProgressFromSpan()
                    dragStartCenter = mapCenter
                    progressAtDragStart = sliderProgress
                    UIImpactFeedbackGenerator(style: .soft).impactOccurred()
                }
                cancelHideTimer()

                // Vertical drag: up = zoom in (progress increases)
                let usable = trackHeight - trackPadding * 2
                guard usable > 0 else { return }
                let dragDelta = -value.translation.height / usable
                let base = progressAtDragStart ?? sliderProgress
                if progressAtDragStart == nil {
                    progressAtDragStart = sliderProgress
                }
                sliderProgress = max(0, min(1, base + dragDelta))

                applyZoom()
                tickHapticIfNeeded()

                // Notch follows finger position with elastic lag, clamped to 5% screen edges
                let fingerY = touchStartY + value.translation.height
                let minY = trackHeight * 0.05
                let maxY = trackHeight * 0.95
                withAnimation(.interpolatingSpring(mass: 0.6, stiffness: 180, damping: 18)) {
                    notchCenterY = max(minY, min(maxY, fingerY))
                }

                // Parallax
                withAnimation(.interpolatingSpring(mass: 0.6, stiffness: 180, damping: 18)) {
                    parallaxOffset = (sliderProgress - 0.5) * 12
                }
            }
            .onEnded { _ in
                progressAtDragStart = nil

                // Spring notch back to resting depth
                withAnimation(.interpolatingSpring(mass: 0.6, stiffness: 180, damping: 18)) {
                    notchDepth = depthResting
                    isActive = false
                }

                // Reset parallax
                withAnimation(.interpolatingSpring(mass: 0.6, stiffness: 180, damping: 18)) {
                    parallaxOffset = 0
                }

                scheduleHide()
            }
    }

    // MARK: - Zoom logic

    private func syncProgressFromSpan() {
        syncProgressFromDelta(currentSpan.latitudeDelta)
    }

    private func syncProgressFromDelta(_ delta: Double) {
        let logMin = log(minZoom)
        let logMax = log(maxZoom)
        let logCur = log(max(minZoom, min(maxZoom, delta)))
        sliderProgress = CGFloat(1.0 - (logCur - logMin) / (logMax - logMin))
    }

    private func applyZoom() {
        let logMin = log(minZoom)
        let logMax = log(maxZoom)
        let logDelta = logMin + (1.0 - Double(sliderProgress)) * (logMax - logMin)
        let newDelta = exp(logDelta)

        let center = dragStartCenter ?? mapCenter
        regionToSet = MKCoordinateRegion(
            center: center,
            span: MKCoordinateSpan(latitudeDelta: newDelta, longitudeDelta: newDelta)
        )
        onZoomChange?(newDelta)
    }

    // MARK: - Haptics

    private func tickHapticIfNeeded() {
        let notchValue = Int(sliderProgress * 10)
        if notchValue != lastNotchValue {
            lastNotchValue = notchValue
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
        }
    }

    // MARK: - Auto-hide

    private func cancelHideTimer() {
        hideTimer?.cancel()
    }

    private func scheduleHide() {
        hideTimer?.cancel()
        hideTimer = Task {
            try? await Task.sleep(for: .seconds(0.8))
            guard !Task.isCancelled else { return }
            await MainActor.run {
                withAnimation(.interpolatingSpring(mass: 0.6, stiffness: 180, damping: 18)) {
                    isActive = false
                    notchDepth = depthResting
                }
            }
        }
    }
}
