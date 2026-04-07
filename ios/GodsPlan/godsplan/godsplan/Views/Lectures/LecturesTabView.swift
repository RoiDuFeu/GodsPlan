import SwiftUI

// MARK: - Section model

struct LectureSection: Identifiable {
    let id: String
    let title: String
    let reference: String
    let text: String
    let refrain: String?
    let isPoetry: Bool
    let isGospel: Bool
    let icon: String
}

// MARK: - Text cleaning

/// Cleans raw USCCB markdown text for display
private func cleanLiturgyText(_ raw: String) -> String {
    raw.components(separatedBy: "\n")
        .filter { line in
            let t = line.trimmingCharacters(in: .whitespaces)
            // Drop markdown reference links at the start: [Book X:Y](<url>)
            if t.hasPrefix("[") && t.contains("](") { return false }
            // Drop bullet list items (footer nav / podcast links)
            if t.hasPrefix("- [") || t.hasPrefix("- ") && t.contains("](/") { return false }
            // Drop USCCB footer junk
            if t.contains("LISTEN PODCAST") || t.contains("VIEW REFLECTION") { return false }
            if t.contains("En Español") || t.contains("View Calendar") { return false }
            if t.contains("Daily Readings E-mails") || t.contains("SUBSCRIBE") { return false }
            if t.contains("Privacy Policy") || t.contains("I Agree that") { return false }
            if t.contains("Copyright ©") || t.contains("Lectionary for Mass") { return false }
            if t.contains("Confraternity of Christian Doctrine") { return false }
            if t.contains("International Committee on English") { return false }
            if t.hasPrefix("##") { return false }
            // Drop very short noise lines
            if t.count <= 3 && !t.hasPrefix("R.") && !t.hasPrefix("R/") { return false }
            return true
        }
        .map { line in
            // Strip markdown bold **...**
            line.replacingOccurrences(
                of: #"\*\*(.*?)\*\*"#, with: "$1",
                options: .regularExpression
            )
        }
        .joined(separator: "\n")
        .trimmingCharacters(in: .whitespacesAndNewlines)
}

/// Cleans refrain text (strip bold markers)
private func cleanRefrain(_ raw: String?) -> String? {
    guard let r = raw, !r.isEmpty else { return nil }
    return r.replacingOccurrences(
        of: #"\*\*(.*?)\*\*"#, with: "$1",
        options: .regularExpression
    ).trimmingCharacters(in: .whitespacesAndNewlines)
}

// MARK: - Main view

struct LecturesTabView: View {
    @State private var liturgy: LiturgyResponse?
    @State private var isLoading = true
    @State private var errorMessage: String?
    @State private var selectedSection: LectureSection?
    @State private var appeared = false

    var body: some View {
        NavigationStack {
            Group {
                if isLoading {
                    loadingView
                } else if let msg = errorMessage {
                    errorView(msg)
                } else if let liturgy {
                    contentView(liturgy)
                }
            }
            .navigationTitle("Lectures du jour")
            .navigationBarTitleDisplayMode(.large)
        }
        .task { await loadLiturgy() }
        .sheet(item: $selectedSection) { section in
            LectureTextSheet(section: section)
        }
    }

    // MARK: - Loading / Error

    private var loadingView: some View {
        ScrollView {
            VStack(spacing: 0) {
                // Shimmer hero header
                ShimmerBox(width: .infinity, height: 160)

                VStack(spacing: 16) {
                    ForEach(0..<3, id: \.self) { _ in
                        ShimmerCard()
                    }
                }
                .padding(.top, 20)
                .padding(.bottom, 40)
                .padding(.horizontal, 16)
            }
        }
        .allowsHitTesting(false)
    }

    private func errorView(_ message: String) -> some View {
        VStack(spacing: 16) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: 40))
                .foregroundStyle(Color("Gold").opacity(0.7))
            Text(message)
                .font(.callout)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
            Button("Réessayer") { Task { await loadLiturgy() } }
                .buttonStyle(.borderedProminent)
                .tint(Color("Gold"))
        }
        .padding(32)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - Content

    private func contentView(_ liturgy: LiturgyResponse) -> some View {
        ScrollView {
            VStack(spacing: 0) {
                heroHeader(liturgy)

                VStack(spacing: 16) {
                    ForEach(Array(makeSections(from: liturgy).enumerated()), id: \.element.id) { index, section in
                        LectureSectionCard(section: section) {
                            selectedSection = section
                        }
                        .opacity(appeared ? 1 : 0)
                        .offset(y: appeared ? 0 : 20)
                        .animation(
                            .spring(response: 0.5, dampingFraction: 0.8)
                                .delay(Double(index) * 0.08),
                            value: appeared
                        )
                    }
                }
                .padding(.top, 20)
                .padding(.bottom, 40)
                .padding(.horizontal, 16)
            }
        }
        .onAppear { appeared = true }
    }

    // MARK: - Hero header

    private func heroHeader(_ liturgy: LiturgyResponse) -> some View {
        ZStack(alignment: .bottomLeading) {
            LinearGradient(
                colors: [Color("Gold").opacity(0.25), Color("Gold").opacity(0.04)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .frame(height: 160)

            VStack(alignment: .leading, spacing: 6) {
                Text(formattedDate(from: liturgy))
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(Color("Gold"))
                    .kerning(1)
                    .textCase(.uppercase)

                Text(liturgy.liturgicalDay ?? "Lectures du jour")
                    .font(.system(size: 28, weight: .bold, design: .serif))
                    .foregroundStyle(.primary)
                    .lineSpacing(2)
            }
            .padding(20)
            .padding(.bottom, 8)
        }
    }

    // MARK: - Helpers

    private func formattedDate(from liturgy: LiturgyResponse) -> String {
        let date = liturgy.parsedDate ?? Date()
        return date.formatted(.dateTime.weekday(.wide).day().month(.wide)).capitalized
    }

    private func makeSections(from liturgy: LiturgyResponse) -> [LectureSection] {
        var result: [LectureSection] = []
        let gospelKeywords = ["gospel", "évangile"]
        let skipKeywords   = ["alleluia", "acclamation"]

        // Non-gospel, non-psalm readings first
        let psalmKeywords = ["psalm", "psaume"]
        for reading in liturgy.readings where !gospelKeywords.contains(where: reading.title.lowercased().contains)
                                          && !skipKeywords.contains(where: reading.title.lowercased().contains)
                                          && !psalmKeywords.contains(where: reading.title.lowercased().contains) {
            result.append(LectureSection(
                id: "reading-\(result.count)",
                title: localizedTitle(reading.title),
                reference: reading.reference,
                text: cleanLiturgyText(reading.text),
                refrain: nil,
                isPoetry: false,
                isGospel: false,
                icon: "book.closed.fill"
            ))
        }

        // Psalm
        if let psalm = liturgy.psalm {
            result.append(LectureSection(
                id: "psalm",
                title: "Psaume",
                reference: psalm.reference,
                text: cleanLiturgyText(psalm.text),
                refrain: cleanRefrain(psalm.refrain),
                isPoetry: true,
                isGospel: false,
                icon: "music.note"
            ))
        }

        // Gospel last
        for reading in liturgy.readings where gospelKeywords.contains(where: reading.title.lowercased().contains) {
            result.append(LectureSection(
                id: "gospel",
                title: "Évangile",
                reference: reading.reference,
                text: cleanLiturgyText(reading.text),
                refrain: nil,
                isPoetry: false,
                isGospel: true,
                icon: "book.fill"
            ))
        }

        return result
    }

    private func localizedTitle(_ title: String) -> String {
        let lower = title.lowercased()
        if lower.contains("first")  { return "Première lecture" }
        if lower.contains("second") { return "Deuxième lecture" }
        return title
    }

    private func loadLiturgy() async {
        isLoading = true
        errorMessage = nil
        do {
            liturgy = try await APIService.shared.fetchTodayLiturgy()
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }
}

// MARK: - Section card

private struct LectureSectionCard: View {
    let section: LectureSection
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            VStack(alignment: .leading, spacing: 0) {
                // Header
                HStack(spacing: 12) {
                    ZStack {
                        RoundedRectangle(cornerRadius: 9, style: .continuous)
                            .fill(Color("Gold").opacity(0.13))
                            .frame(width: 36, height: 36)
                        Image(systemName: section.icon)
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundStyle(Color("Gold"))
                    }

                    VStack(alignment: .leading, spacing: 2) {
                        Text(section.title)
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(.primary)
                        Text(section.reference)
                            .font(.caption)
                            .foregroundStyle(Color("Gold"))
                    }

                    Spacer()

                    Image(systemName: "chevron.right")
                        .font(.caption.weight(.bold))
                        .foregroundStyle(.tertiary)
                }
                .padding(14)

                Divider().opacity(0.5)

                // Preview text (truncated, cleaned)
                Text(cleanPreview(section.text))
                    .font(section.isPoetry
                          ? .system(.body, design: .serif).italic()
                          : .body)
                    .foregroundStyle(.secondary)
                    .lineSpacing(section.isPoetry ? 6 : 4)
                    .lineLimit(4)
                    .padding(16)
            }
        }
        .buttonStyle(.plain)
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .stroke(Color.primary.opacity(0.06), lineWidth: 1)
        )
        .shadow(color: .black.opacity(0.04), radius: 8, y: 3)
    }

    /// Strip refrain markers and markdown for a clean card preview
    private func cleanPreview(_ text: String) -> String {
        text.components(separatedBy: "\n")
            .filter { line in
                let t = line.trimmingCharacters(in: .whitespaces)
                return !t.hasPrefix("R.") && !t.hasPrefix("R/") && !t.hasPrefix("R ") && !t.isEmpty
            }
            .joined(separator: "\n")
    }
}

// MARK: - Shimmer effect

private struct ShimmerModifier: ViewModifier {
    @State private var phase: CGFloat = -1

    func body(content: Content) -> some View {
        content
            .overlay(
                LinearGradient(
                    colors: [.clear, .white.opacity(0.4), .clear],
                    startPoint: .leading,
                    endPoint: .trailing
                )
                .offset(x: phase * 300)
            )
            .clipped()
            .onAppear {
                withAnimation(.linear(duration: 1.2).repeatForever(autoreverses: false)) {
                    phase = 1
                }
            }
    }
}

private struct ShimmerBox: View {
    let width: CGFloat
    let height: CGFloat

    init(width: CGFloat = 100, height: CGFloat = 16) {
        self.width = width
        self.height = height
    }

    var body: some View {
        RoundedRectangle(cornerRadius: 8, style: .continuous)
            .fill(Color.primary.opacity(0.08))
            .frame(maxWidth: width == .infinity ? .infinity : width, minHeight: height, maxHeight: height)
            .modifier(ShimmerModifier())
    }
}

private struct ShimmerCard: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Header row
            HStack(spacing: 12) {
                RoundedRectangle(cornerRadius: 9, style: .continuous)
                    .fill(Color("Gold").opacity(0.08))
                    .frame(width: 36, height: 36)
                    .modifier(ShimmerModifier())

                VStack(alignment: .leading, spacing: 6) {
                    ShimmerBox(width: 120, height: 14)
                    ShimmerBox(width: 80, height: 10)
                }

                Spacer()
            }
            .padding(14)

            Divider().opacity(0.5)

            // Text lines
            VStack(alignment: .leading, spacing: 8) {
                ShimmerBox(width: .infinity, height: 12)
                ShimmerBox(width: .infinity, height: 12)
                ShimmerBox(width: 200, height: 12)
            }
            .padding(16)
        }
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .stroke(Color.primary.opacity(0.06), lineWidth: 1)
        )
    }
}

// MARK: - Full text sheet

struct LectureTextSheet: View {
    let section: LectureSection
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    // Refrain banner (psalm antiphon)
                    if let refrain = section.refrain, !refrain.isEmpty {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Antienne")
                                .font(.caption.weight(.semibold))
                                .foregroundStyle(Color("Gold"))
                                .kerning(1)
                                .textCase(.uppercase)
                            Text(refrain)
                                .font(.system(.body, design: .serif).italic())
                                .foregroundStyle(.primary)
                                .lineSpacing(6)
                        }
                        .padding(16)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(
                            RoundedRectangle(cornerRadius: 12, style: .continuous)
                                .fill(Color("Gold").opacity(0.08))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                                        .stroke(Color("Gold").opacity(0.2), lineWidth: 1)
                                )
                        )
                    }

                    // Full text — structured rendering per type
                    if section.isPoetry {
                        psalmBody
                    } else if section.isGospel {
                        gospelBody
                    } else {
                        Text(section.text)
                            .font(.body)
                            .foregroundStyle(.primary)
                            .lineSpacing(7)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                }
                .padding(20)
            }
            .navigationTitle(section.title)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Text(section.reference)
                        .font(.caption)
                        .foregroundStyle(Color("Gold"))
                }
                ToolbarItem(placement: .topBarLeading) {
                    Button("Fermer") { dismiss() }
                }
            }
        }
    }

    // MARK: - Gospel structured rendering

    /// Parses gospel text into narration and dialogue blocks.
    /// Narration is plain body text; dialogue gets a gold left accent bar + italic serif.
    private var gospelBody: some View {
        let blocks = buildGospelBlocks(from: section.text)

        return VStack(alignment: .leading, spacing: 14) {
            ForEach(Array(blocks.enumerated()), id: \.offset) { idx, block in
                if block.isDialogue {
                    // Dialogue: accent bar + italic
                    HStack(alignment: .top, spacing: 14) {
                        RoundedRectangle(cornerRadius: 1.5)
                            .fill(Color("Gold").opacity(0.5))
                            .frame(width: 3)

                        Text(block.text)
                            .font(.system(.body, design: .serif).italic())
                            .foregroundStyle(.primary.opacity(0.85))
                            .lineSpacing(6)
                    }
                } else if idx == 0 {
                    // First narration block: drop cap
                    dropCapText(block.text)
                } else {
                    Text(block.text)
                        .font(.body)
                        .foregroundStyle(.primary)
                        .lineSpacing(6)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
            }
        }
    }

    /// Renders text with a large decorative first letter
    /// Drop cap: large first letter spans ~2 lines, then text continues at normal indent
    private func dropCapText(_ text: String) -> some View {
        let firstChar = String(text.prefix(1))
        let rest = String(text.dropFirst())

        // Split into the portion next to the cap (~90 chars ≈ 2 lines) and the remainder
        let wrapLimit = 90
        let splitIndex = rest.index(rest.startIndex, offsetBy: min(wrapLimit, rest.count))
        // Find the nearest space to avoid cutting a word
        let breakIndex = rest[...splitIndex].lastIndex(of: " ") ?? splitIndex
        let beside = String(rest[rest.startIndex..<breakIndex])
        let below = String(rest[breakIndex...]).trimmingCharacters(in: .whitespaces)

        return VStack(alignment: .leading, spacing: 0) {
            HStack(alignment: .top, spacing: 2) {
                Text(firstChar)
                    .font(.system(size: 48, weight: .bold, design: .serif))
                    .foregroundStyle(Color("Gold"))
                    .padding(.trailing, 2)

                Text(beside)
                    .font(.body)
                    .foregroundStyle(.primary)
                    .lineSpacing(6)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }

            if !below.isEmpty {
                Text(below)
                    .font(.body)
                    .foregroundStyle(.primary)
                    .lineSpacing(6)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
    }

    private struct GospelBlock {
        let text: String
        let isDialogue: Bool
    }

    /// Splits gospel text into alternating narration/dialogue blocks
    /// using curly quotes \u{201c}...\u{201d} as dialogue delimiters
    private func buildGospelBlocks(from text: String) -> [GospelBlock] {
        var blocks: [GospelBlock] = []
        var remaining = text

        while !remaining.isEmpty {
            // Find next dialogue opening
            if let openRange = remaining.range(of: "\u{201c}") {
                // Narration before the dialogue
                let narration = String(remaining[remaining.startIndex..<openRange.lowerBound])
                    .trimmingCharacters(in: .whitespacesAndNewlines)
                if !narration.isEmpty {
                    blocks.append(GospelBlock(text: narration, isDialogue: false))
                }

                remaining = String(remaining[openRange.upperBound...])

                // Find matching close quote
                if let closeRange = remaining.range(of: "\u{201d}") {
                    let dialogue = String(remaining[remaining.startIndex..<closeRange.lowerBound])
                        .trimmingCharacters(in: .whitespacesAndNewlines)
                    if !dialogue.isEmpty {
                        blocks.append(GospelBlock(text: dialogue, isDialogue: true))
                    }
                    remaining = String(remaining[closeRange.upperBound...])
                } else {
                    // No close quote found — treat rest as dialogue
                    let dialogue = remaining.trimmingCharacters(in: .whitespacesAndNewlines)
                    if !dialogue.isEmpty {
                        blocks.append(GospelBlock(text: dialogue, isDialogue: true))
                    }
                    remaining = ""
                }
            } else {
                // No more dialogue — rest is narration
                let narration = remaining.trimmingCharacters(in: .whitespacesAndNewlines)
                if !narration.isEmpty {
                    blocks.append(GospelBlock(text: narration, isDialogue: false))
                }
                remaining = ""
            }
        }

        return blocks
    }

    // MARK: - Psalm structured rendering

    /// Splits psalm text into verse blocks separated by refrain lines (R. ...)
    /// and renders refrains with distinct styling
    private var psalmBody: some View {
        let lines = section.text.components(separatedBy: "\n")
        let blocks = buildPsalmBlocks(from: lines)

        return VStack(alignment: .leading, spacing: 16) {
            ForEach(Array(blocks.enumerated()), id: \.offset) { _, block in
                if block.isRefrain {
                    Text(block.text)
                        .font(.system(.callout, design: .serif).italic().weight(.medium))
                        .foregroundStyle(Color("Gold"))
                        .lineSpacing(4)
                        .frame(maxWidth: .infinity, alignment: .leading)
                } else {
                    Text(block.text)
                        .font(.system(.body, design: .serif))
                        .foregroundStyle(.primary)
                        .lineSpacing(6)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
            }
        }
    }

    private struct PsalmBlock {
        let text: String
        let isRefrain: Bool
    }

    private func buildPsalmBlocks(from lines: [String]) -> [PsalmBlock] {
        var blocks: [PsalmBlock] = []
        var currentLines: [String] = []

        for line in lines {
            let trimmed = line.trimmingCharacters(in: .whitespaces)
            let isRefrain = trimmed.hasPrefix("R.") || trimmed.hasPrefix("R/") || trimmed.hasPrefix("R ")

            if isRefrain {
                // Flush accumulated verse lines
                let verse = currentLines.joined(separator: "\n").trimmingCharacters(in: .whitespacesAndNewlines)
                if !verse.isEmpty {
                    blocks.append(PsalmBlock(text: verse, isRefrain: false))
                }
                currentLines = []

                // Add refrain (strip the "R. " / "R/ " prefix)
                let refrainText = trimmed
                    .replacingOccurrences(of: #"^R[./]?\s*"#, with: "", options: .regularExpression)
                if !refrainText.isEmpty {
                    blocks.append(PsalmBlock(text: refrainText, isRefrain: true))
                }
            } else {
                currentLines.append(line)
            }
        }

        // Flush remaining
        let verse = currentLines.joined(separator: "\n").trimmingCharacters(in: .whitespacesAndNewlines)
        if !verse.isEmpty {
            blocks.append(PsalmBlock(text: verse, isRefrain: false))
        }

        return blocks
    }
}
