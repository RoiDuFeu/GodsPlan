import SwiftUI

struct MassScheduleRow: View {
    let schedule: MassSchedule

    var body: some View {
        HStack(spacing: 12) {
            // Day chip
            Text(schedule.dayName)
                .font(.caption.weight(.semibold))
                .foregroundStyle(.primary)
                .frame(width: 72, alignment: .leading)

            // Time
            Text(schedule.time)
                .font(.subheadline.monospacedDigit())
                .foregroundStyle(Color("Gold"))
                .frame(width: 44, alignment: .leading)

            // Rite + language
            VStack(alignment: .leading, spacing: 2) {
                Text(schedule.riteFormatted)
                    .font(.caption)
                    .foregroundStyle(.primary)
                if let lang = schedule.language {
                    Text(lang)
                        .font(.caption2)
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
        .padding(.vertical, 6)
    }
}
