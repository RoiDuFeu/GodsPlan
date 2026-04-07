import SwiftUI

// MARK: - Cross Shape (matches the gold cross in the logo SVG)

private struct CrossShape: Shape {
    func path(in rect: CGRect) -> Path {
        let w = rect.width
        let h = rect.height
        var path = Path()

        // Normalized coordinates for the cross outline (clockwise from top-left)
        // Derived from the logo SVG viewBox 1773x1773, cross bounds x:650..1126 y:464..1119
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

// MARK: - Splash View

struct SplashView: View {
    // Cross drawing
    @State private var crossTrim: CGFloat = 0
    @State private var crossFill: Double = 0

    // Glow
    @State private var glowOpacity: Double = 0

    // Full logo reveal
    @State private var logoOpacity: Double = 0

    // Overall scale (bounce)
    @State private var overallScale: CGFloat = 1.08

    // Tagline
    @State private var taglineOpacity: Double = 0
    @State private var taglineOffset: CGFloat = 10
    @State private var lineWidth: CGFloat = 0

    private let goldColor = Color(red: 0.757, green: 0.596, blue: 0.318)

    // Cross dimensions matched to logo frame
    // SVG viewBox: 1773x1773, cross bounds: x=650..1126 y=464..1119
    // At 300pt logo: scale = 300/1773
    private let logoSize: CGFloat = 300
    private var crossWidth: CGFloat { 476.0 / 1773.0 * logoSize }   // ~80.5
    private var crossHeight: CGFloat { 655.0 / 1773.0 * logoSize }  // ~110.8
    private var crossOffsetY: CGFloat { (791.5 - 886.5) / 1773.0 * logoSize } // ~-16.1

    var body: some View {
        ZStack {
            Color("BrandCream")
                .ignoresSafeArea()

            VStack(spacing: 24) {
                Spacer()

                ZStack {
                    // Layer 1: Cross outline (draws with trim animation)
                    CrossShape()
                        .trim(from: 0, to: crossTrim)
                        .stroke(
                            goldColor,
                            style: StrokeStyle(lineWidth: 3, lineCap: .round, lineJoin: .round)
                        )
                        .frame(width: crossWidth, height: crossHeight)
                        .offset(y: crossOffsetY)
                        .shadow(color: goldColor.opacity(0.3), radius: 4)

                    // Layer 2: Cross fill (fades in after outline completes)
                    CrossShape()
                        .fill(goldColor)
                        .frame(width: crossWidth, height: crossHeight)
                        .offset(y: crossOffsetY)
                        .opacity(crossFill)

                    // Layer 3: Glow pulse when cross completes
                    Circle()
                        .fill(
                            RadialGradient(
                                colors: [goldColor.opacity(0.35), .clear],
                                center: .center,
                                startRadius: 15,
                                endRadius: 130
                            )
                        )
                        .frame(width: 260, height: 260)
                        .offset(y: crossOffsetY)
                        .opacity(glowOpacity)

                    // Layer 4: Full logo (materializes on top, blends into cream background)
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
                    .fill(Color("Gold").opacity(0.4))
                    .frame(width: lineWidth, height: 1.5)

                // Tagline
                Text("Trouvez votre église")
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(Color("BrandNavy").opacity(0.5))
                    .kerning(2)
                    .textCase(.uppercase)
                    .opacity(taglineOpacity)
                    .offset(y: taglineOffset)

                Spacer()
                Spacer()
            }
        }
        .onAppear { runAnimation() }
    }

    private func runAnimation() {
        // Phase 1: Cross outline draws (0.0–0.9s)
        withAnimation(.easeInOut(duration: 0.9)) {
            crossTrim = 1
        }

        // Phase 2: Cross fills + glow (0.7–1.1s)
        withAnimation(.easeIn(duration: 0.25).delay(0.7)) {
            crossFill = 1
        }
        withAnimation(.easeOut(duration: 0.3).delay(0.8)) {
            glowOpacity = 1
        }
        withAnimation(.easeIn(duration: 0.3).delay(1.1)) {
            glowOpacity = 0
        }

        // Phase 3: Logo materializes + scale settles (1.0–1.4s)
        withAnimation(.spring(duration: 0.5, bounce: 0.15).delay(1.0)) {
            logoOpacity = 1
            overallScale = 1.0
        }

        // Phase 4: Bounce (1.35–1.6s)
        withAnimation(.spring(duration: 0.3, bounce: 0.5).delay(1.35)) {
            overallScale = 1.05
        }
        withAnimation(.spring(duration: 0.3).delay(1.55)) {
            overallScale = 1.0
        }

        // Phase 5: Tagline + decorative line (1.5–1.8s)
        withAnimation(.easeOut(duration: 0.4).delay(1.5)) {
            taglineOpacity = 1
            taglineOffset = 0
        }
        withAnimation(.easeInOut(duration: 0.4).delay(1.65)) {
            lineWidth = 40
        }
    }
}
