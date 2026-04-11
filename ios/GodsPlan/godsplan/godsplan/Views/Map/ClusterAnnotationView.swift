import SwiftUI

struct ClusterAnnotationView: View {
    let count: Int
    let id: String
    @State private var appeared = false

    init(count: Int, id: String = UUID().uuidString) {
        self.count = count
        self.id = id
    }

    var body: some View {
        ZStack {
            // Outer + middle halos only for larger clusters
            if count >= 5 {
                Circle()
                    .fill(Color("Gold").opacity(0.08))
                    .frame(width: outerSize, height: outerSize)
                    .scaleEffect(appeared ? 1.0 : 0.5)

                Circle()
                    .fill(Color("Gold").opacity(0.15))
                    .frame(width: middleSize, height: middleSize)
                    .scaleEffect(appeared ? 1.0 : 0.6)
            }

            // Main bubble — solid color (no material blur)
            Circle()
                .fill(
                    LinearGradient(
                        colors: [Color("Gold").opacity(0.55), Color("Gold").opacity(0.35)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .overlay(
                    Circle()
                        .strokeBorder(Color("Gold").opacity(0.4), lineWidth: 1.5)
                )
                .frame(width: coreSize, height: coreSize)
                .shadow(color: Color("Gold").opacity(0.2), radius: 6, y: 3)
                .scaleEffect(appeared ? 1.0 : 0.3)

            // Stacked mini crosses — flattened into single texture
            miniCrosses
                .drawingGroup()
                .scaleEffect(appeared ? 1.0 : 0.0)

            // Count label
            Text("\(count)")
                .font(.system(size: fontSize, weight: .heavy, design: .rounded))
                .foregroundStyle(.white)
                .shadow(color: .black.opacity(0.25), radius: 1, y: 1)
                .scaleEffect(appeared ? 1.0 : 0.0)
        }
        .compositingGroup()
        .onAppear {
            // Staggered animation based on id hash
            let delay = Double(abs(id.hashValue) % 6) * 0.04
            withAnimation(.spring(response: 0.45, dampingFraction: 0.65).delay(delay)) {
                appeared = true
            }
        }
    }

    // MARK: - Mini crosses peeking around the cluster edge

    @ViewBuilder
    private var miniCrosses: some View {
        let peekCount = min(count, 4)
        let angleStep = .pi * 2.0 / Double(max(peekCount, 1))
        let radius = coreSize / 2.0 + 2

        ForEach(0..<peekCount, id: \.self) { i in
            let angle = angleStep * Double(i) - .pi / 2
            Image(systemName: "cross.fill")
                .font(.system(size: 7, weight: .bold))
                .foregroundStyle(.white.opacity(0.85))
                .frame(width: 16, height: 16)
                .background(Circle().fill(Color("Gold")))
                .offset(
                    x: cos(angle) * radius,
                    y: sin(angle) * radius
                )
        }
    }

    // MARK: - Dynamic sizing

    private var coreSize: CGFloat {
        switch count {
        case ..<5:   return 38
        case ..<15:  return 44
        case ..<50:  return 50
        case ..<100: return 56
        default:     return 62
        }
    }

    private var middleSize: CGFloat { coreSize + 14 }
    private var outerSize: CGFloat { coreSize + 28 }

    private var fontSize: CGFloat {
        switch count {
        case ..<10:  return 14
        case ..<100: return 15
        default:     return 14
        }
    }
}
