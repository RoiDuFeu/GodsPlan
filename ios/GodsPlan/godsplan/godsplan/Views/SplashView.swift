import SwiftUI

// MARK: - Cross Shape (matches the gold cross in the logo SVG)

private struct CrossShape: Shape {
    func path(in rect: CGRect) -> Path {
        let w = rect.width
        let h = rect.height
        var path = Path()

        path.move(to: CGPoint(x: 0.422 * w, y: 0.000 * h))
        path.addLine(to: CGPoint(x: 0.574 * w, y: 0.000 * h))
        path.addLine(to: CGPoint(x: 0.574 * w, y: 0.302 * h))
        path.addLine(to: CGPoint(x: 1.000 * w, y: 0.302 * h))
        path.addLine(to: CGPoint(x: 1.000 * w, y: 0.417 * h))
        path.addLine(to: CGPoint(x: 0.574 * w, y: 0.417 * h))
        path.addLine(to: CGPoint(x: 0.574 * w, y: 0.926 * h))
        path.addLine(to: CGPoint(x: 0.498 * w, y: 1.000 * h))
        path.addLine(to: CGPoint(x: 0.422 * w, y: 0.926 * h))
        path.addLine(to: CGPoint(x: 0.422 * w, y: 0.417 * h))
        path.addLine(to: CGPoint(x: 0.000 * w, y: 0.417 * h))
        path.addLine(to: CGPoint(x: 0.000 * w, y: 0.302 * h))
        path.addLine(to: CGPoint(x: 0.422 * w, y: 0.302 * h))
        path.closeSubpath()

        return path
    }
}

// MARK: - Shimmer Modifier

private struct ShimmerModifier: ViewModifier {
    let active: Bool
    @State private var phase: CGFloat = -1

    func body(content: Content) -> some View {
        content
            .overlay {
                if active {
                    GeometryReader { geo in
                        LinearGradient(
                            colors: [.clear, .white.opacity(0.35), .clear],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                        .frame(width: geo.size.width * 0.6)
                        .offset(x: phase * geo.size.width * 1.3)
                        .mask(content)
                    }
                }
            }
            .onAppear {
                guard active else { return }
                withAnimation(.easeInOut(duration: 0.8).delay(0.05)) {
                    phase = 1
                }
            }
    }
}

// MARK: - Splash View

struct SplashView: View {
    /// Driven by parent — when true, the splash plays its exit transition
    var dismissing: Bool = false

    // Cross drawing
    @State private var crossTrim: CGFloat = 0
    @State private var crossFill: Double = 0

    // Glow
    @State private var glowScale: CGFloat = 0.6
    @State private var glowOpacity: Double = 0

    // Full logo reveal
    @State private var logoOpacity: Double = 0

    // Overall scale (bounce)
    @State private var overallScale: CGFloat = 1.06

    // Tagline
    @State private var taglineOpacity: Double = 0
    @State private var taglineOffset: CGFloat = 8
    @State private var lineWidth: CGFloat = 0

    // Shimmer
    @State private var shimmerActive = false

    // Exit animation
    @State private var exitScale: CGFloat = 1.0
    @State private var exitBlur: CGFloat = 0
    @State private var exitOpacity: Double = 1

    private let goldColor = Color(red: 0.757, green: 0.596, blue: 0.318)

    private let logoSize: CGFloat = 300
    private var crossWidth: CGFloat { 476.0 / 1773.0 * logoSize }
    private var crossHeight: CGFloat { 655.0 / 1773.0 * logoSize }
    private var crossOffsetY: CGFloat { (791.5 - 886.5) / 1773.0 * logoSize }

    var body: some View {
        ZStack {
            Color("BrandCream")
                .ignoresSafeArea()

            VStack(spacing: 20) {
                Spacer()

                ZStack {
                    // Layer 1: Cross outline draws
                    CrossShape()
                        .trim(from: 0, to: crossTrim)
                        .stroke(
                            goldColor,
                            style: StrokeStyle(lineWidth: 2.5, lineCap: .round, lineJoin: .round)
                        )
                        .frame(width: crossWidth, height: crossHeight)
                        .offset(y: crossOffsetY)

                    // Layer 2: Cross fill
                    CrossShape()
                        .fill(goldColor)
                        .frame(width: crossWidth, height: crossHeight)
                        .offset(y: crossOffsetY)
                        .opacity(crossFill)
                        .modifier(ShimmerModifier(active: shimmerActive))

                    // Layer 3: Radial glow pulse
                    Circle()
                        .fill(
                            RadialGradient(
                                colors: [goldColor.opacity(0.4), goldColor.opacity(0.08), .clear],
                                center: .center,
                                startRadius: 5,
                                endRadius: 140
                            )
                        )
                        .frame(width: 280, height: 280)
                        .offset(y: crossOffsetY)
                        .scaleEffect(glowScale)
                        .opacity(glowOpacity)

                    // Layer 4: Full logo
                    Image("SplashLogo")
                        .resizable()
                        .scaledToFit()
                        .frame(width: logoSize)
                        .opacity(logoOpacity)
                }
                .frame(width: logoSize, height: logoSize)
                .scaleEffect(overallScale)

                // Decorative line
                Rectangle()
                    .fill(goldColor.opacity(0.35))
                    .frame(width: lineWidth, height: 1)

                // Tagline
                Text("Trouvez votre eglise")
                    .font(.system(size: 12, weight: .medium, design: .default))
                    .foregroundStyle(Color("BrandNavy").opacity(0.45))
                    .kerning(2.5)
                    .textCase(.uppercase)
                    .opacity(taglineOpacity)
                    .offset(y: taglineOffset)

                Spacer()
                Spacer()
            }
        }
        // Exit transition layers
        .scaleEffect(exitScale)
        .blur(radius: exitBlur)
        .opacity(exitOpacity)
        .onChange(of: dismissing) { _, isDismissing in
            guard isDismissing else { return }
            playExit()
        }
        .onAppear { runAnimation() }
    }

    // MARK: - Intro Animation (~1.8s)

    private func runAnimation() {
        // Phase 1: Cross outline draws (0.0–0.65s)
        withAnimation(.easeInOut(duration: 0.65)) {
            crossTrim = 1
        }

        // Phase 2: Cross fills + shimmer + glow (0.5–0.85s)
        withAnimation(.easeIn(duration: 0.2).delay(0.5)) {
            crossFill = 1
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.55) {
            shimmerActive = true
        }
        withAnimation(.easeOut(duration: 0.35).delay(0.55)) {
            glowOpacity = 0.9
            glowScale = 1.0
        }
        withAnimation(.easeIn(duration: 0.35).delay(0.9)) {
            glowOpacity = 0
        }

        // Phase 3: Logo materializes + scale settles (0.7–1.1s)
        withAnimation(.spring(duration: 0.45, bounce: 0.12).delay(0.7)) {
            logoOpacity = 1
            overallScale = 1.0
        }

        // Phase 4: Subtle bounce (1.05–1.3s)
        withAnimation(.spring(duration: 0.25, bounce: 0.4).delay(1.05)) {
            overallScale = 1.03
        }
        withAnimation(.spring(duration: 0.25).delay(1.25)) {
            overallScale = 1.0
        }

        // Phase 5: Tagline + line (1.2–1.6s)
        withAnimation(.easeOut(duration: 0.35).delay(1.2)) {
            taglineOpacity = 1
            taglineOffset = 0
        }
        withAnimation(.easeInOut(duration: 0.35).delay(1.3)) {
            lineWidth = 36
        }
    }

    // MARK: - Exit Animation

    private func playExit() {
        withAnimation(.spring(duration: 0.55, bounce: 0.0)) {
            exitScale = 1.08
            exitBlur = 12
            exitOpacity = 0
        }
    }
}
