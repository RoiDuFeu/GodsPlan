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
        HStack(spacing: 4) {
            Circle()
                .fill(color)
                .frame(width: 6, height: 6)
            Text("\(score)%")
                .font(.caption2.weight(.semibold))
                .foregroundStyle(color)
            Text(label)
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(.ultraThinMaterial, in: Capsule())
        .overlay(Capsule().stroke(color.opacity(0.3), lineWidth: 1))
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
