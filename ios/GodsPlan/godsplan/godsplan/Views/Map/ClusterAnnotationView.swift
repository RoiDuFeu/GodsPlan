import SwiftUI

struct ClusterAnnotationView: View {
    let count: Int

    var body: some View {
        ZStack {
            Circle()
                .fill(
                    LinearGradient(
                        colors: [Color("Gold"), Color("Gold").opacity(0.75)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .frame(width: size, height: size)
                .shadow(color: Color("Gold").opacity(0.35), radius: 6, y: 2)

            Text("\(count)")
                .font(.system(size: fontSize, weight: .bold, design: .rounded))
                .foregroundStyle(.white)
        }
    }

    private var size: CGFloat {
        switch count {
        case ..<10:  return 36
        case ..<50:  return 42
        case ..<100: return 48
        default:     return 54
        }
    }

    private var fontSize: CGFloat {
        switch count {
        case ..<10:  return 13
        case ..<100: return 14
        default:     return 13
        }
    }
}
