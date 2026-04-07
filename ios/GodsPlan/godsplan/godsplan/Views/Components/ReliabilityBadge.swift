import SwiftUI

struct ReliabilityBadge: View {
    let score: Int

    private var color: Color {
        switch score {
        case 80...: return Color("Gold")
        case 60..<80: return .green
        case 40..<60: return .orange
        default: return .red
        }
    }

    private var label: String {
        switch score {
        case 80...: return "Fiable"
        case 60..<80: return "Bon"
        case 40..<60: return "Moyen"
        default: return "Incertain"
        }
    }

    var body: some View {
        HStack(spacing: 5) {
            // Animated dot
            Circle()
                .fill(color)
                .frame(width: 5, height: 5)
                .shadow(color: color.opacity(0.6), radius: 3)

            Text("\(score)%")
                .font(.system(size: 11, weight: .bold, design: .monospaced))
                .foregroundStyle(color)

            Text("·")
                .foregroundStyle(color.opacity(0.4))
                .font(.caption2)

            Text(label)
                .font(.system(size: 11, weight: .medium))
                .foregroundStyle(color.opacity(0.8))
        }
        .padding(.horizontal, 9)
        .padding(.vertical, 5)
        .background(color.opacity(0.1), in: Capsule())
        .overlay(Capsule().stroke(color.opacity(0.25), lineWidth: 1))
    }
}

#Preview {
    VStack(spacing: 12) {
        ReliabilityBadge(score: 92)
        ReliabilityBadge(score: 70)
        ReliabilityBadge(score: 50)
        ReliabilityBadge(score: 25)
    }
    .padding()
}
