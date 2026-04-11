import SwiftUI

enum ReliabilityBadgeStyle {
    case compact
    case prominent
}

struct ReliabilityBadge: View {
    let score: Int
    var style: ReliabilityBadgeStyle = .compact

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
        switch style {
        case .compact:
            compactBody
        case .prominent:
            prominentBody
        }
    }

    private var compactBody: some View {
        HStack(spacing: 5) {
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

    private var prominentBody: some View {
        HStack(spacing: 8) {
            Image(systemName: "checkmark.seal.fill")
                .font(.system(size: 16, weight: .semibold))
                .foregroundStyle(color)

            Text("\(score)%")
                .font(.system(size: 18, weight: .bold, design: .monospaced))
                .foregroundStyle(color)

            Text("·")
                .foregroundStyle(color.opacity(0.4))
                .font(.subheadline)

            Text(label)
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(color.opacity(0.85))
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 8)
        .background(color.opacity(0.1), in: Capsule())
        .overlay(Capsule().stroke(color.opacity(0.3), lineWidth: 1.5))
    }
}

#Preview {
    VStack(spacing: 16) {
        Text("Compact").font(.caption).foregroundStyle(.secondary)
        ReliabilityBadge(score: 92)
        ReliabilityBadge(score: 70)
        ReliabilityBadge(score: 50)
        ReliabilityBadge(score: 25)

        Divider()

        Text("Prominent").font(.caption).foregroundStyle(.secondary)
        ReliabilityBadge(score: 92, style: .prominent)
        ReliabilityBadge(score: 70, style: .prominent)
        ReliabilityBadge(score: 50, style: .prominent)
        ReliabilityBadge(score: 25, style: .prominent)
    }
    .padding()
}
