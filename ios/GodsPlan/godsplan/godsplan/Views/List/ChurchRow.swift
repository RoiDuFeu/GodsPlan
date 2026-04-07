import SwiftUI

struct ChurchRow: View {
    let church: ChurchListItem

    var body: some View {
        HStack(spacing: 14) {
            // Icon column
            ZStack {
                RoundedRectangle(cornerRadius: 10, style: .continuous)
                    .fill(Color("Gold").opacity(0.12))
                    .frame(width: 46, height: 46)
                Image(systemName: "building.columns.fill")
                    .font(.system(size: 18))
                    .foregroundStyle(Color("Gold"))
            }

            // Text column
            VStack(alignment: .leading, spacing: 4) {
                Text(church.name)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(.primary)
                    .lineLimit(1)

                Text(church.address.formatted)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)

                ReliabilityBadge(score: church.reliabilityScore)
            }

            Spacer(minLength: 0)

            // Right column
            VStack(alignment: .trailing, spacing: 6) {
                if let dist = church.distanceFormatted {
                    Text(dist)
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(Color("Gold"))
                }
                if let next = church.nextMassTime {
                    HStack(spacing: 3) {
                        Image(systemName: "clock.fill")
                            .font(.system(size: 9))
                        Text(next)
                            .font(.caption2.monospacedDigit().weight(.medium))
                    }
                    .foregroundStyle(.secondary)
                }
            }

            Image(systemName: "chevron.right")
                .font(.caption2.weight(.semibold))
                .foregroundStyle(.quaternary)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .stroke(Color.primary.opacity(0.06), lineWidth: 1)
        )
    }
}
