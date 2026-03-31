import SwiftUI

struct ChurchRow: View {
    let church: ChurchListItem

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 3) {
                    Text(church.name)
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(.primary)
                        .lineLimit(2)

                    Text(church.address.formatted)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }

                Spacer()

                VStack(alignment: .trailing, spacing: 4) {
                    if let dist = church.distanceFormatted {
                        Text(dist)
                            .font(.caption2.weight(.medium))
                            .foregroundStyle(Color("Gold"))
                    }

                    if let next = church.nextMassTime {
                        HStack(spacing: 3) {
                            Image(systemName: "clock")
                                .font(.caption2)
                            Text(next)
                                .font(.caption2.monospacedDigit())
                        }
                        .foregroundStyle(.secondary)
                    }
                }
            }

            ReliabilityBadge(score: church.reliabilityScore)
        }
        .padding(.vertical, 4)
    }
}
