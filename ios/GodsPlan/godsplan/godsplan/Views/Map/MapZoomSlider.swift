import SwiftUI
import MapKit

/// Zenly/Bump-style zoom notch — a tiny black pill flush against the left
/// screen edge, always visible as a subtle bezel extension.
/// Grab and slide up/down to zoom the map.
struct MapZoomSlider: View {
    @Binding var position: MapCameraPosition
    @Binding var isActive: Bool
    var currentSpan: MKCoordinateSpan
    var mapCenter: CLLocationCoordinate2D

    @State private var sliderProgress: CGFloat = 0.5
    @State private var hideTimer: Task<Void, Never>?
    @State private var dragStartCenter: CLLocationCoordinate2D?
    @State private var lastNotchValue: Int = 5

    // The notch dimensions — small and subtle like Zenly
    private let notchWidth: CGFloat = 4
    private let notchHeightResting: CGFloat = 32
    private let notchHeightActive: CGFloat = 40
    private let trackRange: CGFloat = 200 // vertical drag range for zoom

    // Zoom range in latitudeDelta
    private let minDelta: Double = 0.003
    private let maxDelta: Double = 0.5

    var body: some View {
        // The notch — always visible, flush left
        RoundedRectangle(cornerRadius: notchWidth / 2)
            .fill(.black.opacity(isActive ? 0.85 : 0.35))
            .frame(
                width: isActive ? notchWidth + 2 : notchWidth,
                height: isActive ? notchHeightActive : notchHeightResting
            )
            .animation(.spring(response: 0.25, dampingFraction: 0.7), value: isActive)
            // Invisible wider hit area for easy grabbing
            .padding(.horizontal, 14)
            .contentShape(Rectangle())
            .gesture(
                DragGesture(minimumDistance: 0)
                    .onChanged { value in
                        if !isActive {
                            withAnimation(.spring(response: 0.2, dampingFraction: 0.7)) {
                                isActive = true
                            }
                            syncProgressFromSpan()
                            dragStartCenter = mapCenter
                            UIImpactFeedbackGenerator(style: .soft).impactOccurred()
                        }
                        cancelHideTimer()

                        // Vertical drag controls zoom (up = zoom in)
                        let dragDelta = -value.translation.height / trackRange
                        let base = progressAtDragStart ?? sliderProgress
                        if progressAtDragStart == nil {
                            progressAtDragStart = sliderProgress
                        }
                        sliderProgress = max(0, min(1, base + dragDelta))

                        applyZoom()
                        tickHapticIfNeeded()
                    }
                    .onEnded { _ in
                        progressAtDragStart = nil
                        scheduleHide()
                    }
            )
            .onAppear { syncProgressFromSpan() }
            .onChange(of: currentSpan.latitudeDelta) { _, _ in
                if !isActive { syncProgressFromSpan() }
            }
    }

    // Track the progress value when drag started (for relative dragging)
    @State private var progressAtDragStart: CGFloat?

    // MARK: - Zoom logic

    private func syncProgressFromSpan() {
        let delta = currentSpan.latitudeDelta
        let logMin = log(minDelta)
        let logMax = log(maxDelta)
        let logCur = log(max(minDelta, min(maxDelta, delta)))
        sliderProgress = CGFloat(1.0 - (logCur - logMin) / (logMax - logMin))
    }

    private func applyZoom() {
        let logMin = log(minDelta)
        let logMax = log(maxDelta)
        let logDelta = logMin + (1.0 - Double(sliderProgress)) * (logMax - logMin)
        let newDelta = exp(logDelta)

        let center = dragStartCenter ?? mapCenter
        position = .region(MKCoordinateRegion(
            center: center,
            span: MKCoordinateSpan(latitudeDelta: newDelta, longitudeDelta: newDelta)
        ))
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
                withAnimation(.spring(response: 0.3, dampingFraction: 0.85)) {
                    isActive = false
                }
            }
        }
    }
}
