import SwiftUI

struct MassScheduleRow: View {
    let schedule: MassSchedule

    var body: some View {
        HStack(spacing: 14) {
            // Time — fixed column, never wraps
            Text(schedule.time)
                .font(.system(size: 15, weight: .bold, design: .monospaced))
                .foregroundStyle(Color("Gold"))
                .lineLimit(1)
                .fixedSize()
                .frame(width: 48, alignment: .leading)

            // Thin gold separator
            Rectangle()
                .fill(Color("Gold").opacity(0.25))
                .frame(width: 1)
                .frame(minHeight: 28, maxHeight: 36)

            // Rite + language
            VStack(alignment: .leading, spacing: 3) {
                Text(schedule.riteFormatted)
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(.primary)
                if let lang = schedule.language, !lang.isEmpty {
                    Text(lang)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            Spacer()

            if let notes = schedule.notes, !notes.isEmpty {
                Image(systemName: "info.circle")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .help(notes)
            }
        }
        .padding(.vertical, 9)
    }
}
