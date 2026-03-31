import SwiftUI

// MARK: - Lecture data model

struct DailyLecture {
    struct Section {
        let title: String
        let reference: String
        let text: String
        let reflection: String?
    }

    let date: Date
    let firstReading: Section
    let psalm: Section
    let gospel: Section
    let meditation: String
}

// MARK: - Sample data (placeholder until a readings API endpoint is available)

private let sampleLecture = DailyLecture(
    date: Date(),
    firstReading: DailyLecture.Section(
        title: "Première lecture",
        reference: "Is 49, 8-15",
        text: "« Au temps favorable je t'ai exaucé, au jour du salut je t'ai secouru. Je t'ai formé et établi pour que tu sois l'alliance du peuple, pour relever le pays et distribuer les héritages dévastés... »",
        reflection: "Le Seigneur ne nous abandonne jamais. Comme une mère ne peut oublier son enfant, Dieu garde toujours présent à son cœur chacun d'entre nous."
    ),
    psalm: DailyLecture.Section(
        title: "Psaume",
        reference: "Ps 144 (145)",
        text: "« Le Seigneur est tendresse et pitié, lent à la colère et plein d'amour ; la bonté du Seigneur est pour tous, sa tendresse, pour toutes ses œuvres. »",
        reflection: nil
    ),
    gospel: DailyLecture.Section(
        title: "Évangile",
        reference: "Jn 5, 17-30",
        text: "« En vérité, en vérité, je vous le dis : le Fils ne peut rien faire de lui-même, il ne fait que ce qu'il voit faire au Père ; ce que fait le Père, le Fils le fait pareillement. Car le Père aime le Fils et lui montre tout ce qu'il fait... »",
        reflection: "Jésus nous révèle la relation unique qui l'unit au Père. Toute son action découle de cet amour parfait. Il nous invite à entrer dans cette même communion."
    ),
    meditation: "« Dieu est amour. » — 1 Jn 4, 8\n\nLaissons cette vérité nous habiter aujourd'hui. Dieu n'agit pas par obligation, mais par amour. Chaque moment de notre vie est une occasion de répondre à cet amour infini."
)

// MARK: - View

struct LecturesTabView: View {
    private let lecture = sampleLecture

    private var dateFormatted: String {
        lecture.date.formatted(.dateTime.weekday(.wide).day().month(.wide).year())
            .capitalized
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 28) {
                    // Date header
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Lectures du jour")
                            .font(.title2.weight(.bold))
                        Text(dateFormatted)
                            .font(.subheadline)
                            .foregroundStyle(Color("Gold"))
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal, 20)
                    .padding(.top, 8)

                    // Readings
                    LectureSectionCard(section: lecture.firstReading)
                    LectureSectionCard(section: lecture.psalm, isPoetry: true)
                    LectureSectionCard(section: lecture.gospel)

                    // Meditation
                    meditationCard
                }
                .padding(.bottom, 40)
            }
            .navigationTitle("")
            .navigationBarTitleDisplayMode(.inline)
        }
    }

    private var meditationCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            Label("Méditation", systemImage: "lightbulb")
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(Color("Gold"))

            Text(lecture.meditation)
                .font(.body.italic())
                .fontDesign(.serif)
                .foregroundStyle(.primary)
                .multilineTextAlignment(.center)
                .frame(maxWidth: .infinity)
                .lineSpacing(6)
        }
        .padding(20)
        .background(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .fill(Color("Gold").opacity(0.08))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(Color("Gold").opacity(0.25), lineWidth: 1)
        )
        .padding(.horizontal, 20)
    }
}

// MARK: - Lecture section card

private struct LectureSectionCard: View {
    let section: DailyLecture.Section
    var isPoetry = false
    @State private var isExpanded = true

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Header
            Button {
                withAnimation(.spring(response: 0.3)) { isExpanded.toggle() }
            } label: {
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(section.title)
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(.primary)
                        Text(section.reference)
                            .font(.caption)
                            .foregroundStyle(Color("Gold"))
                    }
                    Spacer()
                    Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.tertiary)
                }
                .padding(16)
            }

            if isExpanded {
                Divider().padding(.horizontal, 16)

                // Scripture text
                Text(section.text)
                    .font(isPoetry ? .body.italic() : .body)
                    .fontDesign(isPoetry ? .serif : .default)
                    .foregroundStyle(.primary)
                    .lineSpacing(5)
                    .padding(16)

                // Reflection
                if let reflection = section.reflection {
                    Divider().padding(.horizontal, 16)

                    HStack(alignment: .top, spacing: 10) {
                        Rectangle()
                            .fill(Color("Gold"))
                            .frame(width: 3)
                            .cornerRadius(2)

                        Text(reflection)
                            .font(.callout)
                            .foregroundStyle(.secondary)
                            .lineSpacing(4)
                    }
                    .padding(16)
                }
            }
        }
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 14, style: .continuous).stroke(Color.primary.opacity(0.07), lineWidth: 1))
        .padding(.horizontal, 20)
    }
}
