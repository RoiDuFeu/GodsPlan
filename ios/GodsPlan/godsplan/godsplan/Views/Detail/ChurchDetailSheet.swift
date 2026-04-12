import SwiftUI
import MapKit
import SwiftData

struct ChurchDetailSheet: View {
    let churchId: String
    let churchName: String

    @Environment(ChurchStore.self) private var store
    @Environment(AuthStore.self) private var authStore
    @Environment(\.modelContext) private var modelContext
    @Query private var savedChurches: [SavedChurch]

    @State private var showSignInPrompt = false
    @State private var saveAnimating = false
    @State private var mapReady = false
    @State private var showAllMasses = false
    @State private var showAllOfficeTypes: Set<String> = []

    private var church: Church? { store.selectedChurch }
    private var isSaved: Bool { savedChurches.contains { $0.churchId == churchId } }

    var body: some View {
        ScrollView(.vertical) {
            VStack(spacing: 0) {
                if store.isLoadingDetail {
                    loadingView
                } else if let church {
                    detailContent(church)
                } else if store.error != nil {
                    errorView
                } else {
                    initialView
                }
            }
        }
        .navigationTitle(churchName)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar { saveToolbarItem }
        .task { await store.selectChurch(id: churchId) }
        .onDisappear { store.clearSelection() }
        .sheet(isPresented: $showSignInPrompt) {
            SignInView()
                .presentationDetents([.large])
                .presentationCornerRadius(28)
        }
    }

    // MARK: - Toolbar

    @ToolbarContentBuilder
    private var saveToolbarItem: some ToolbarContent {
        ToolbarItem(placement: .topBarTrailing) {
            Button {
                if authStore.isSignedIn {
                    withAnimation(.spring(response: 0.3, dampingFraction: 0.5)) {
                        saveAnimating = true
                        toggleSave()
                    }
                    Task { @MainActor in
                        try? await Task.sleep(for: .milliseconds(400))
                        saveAnimating = false
                    }
                } else {
                    showSignInPrompt = true
                }
            } label: {
                Image(systemName: isSaved ? "bookmark.fill" : "bookmark")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(isSaved ? Color("Gold") : .primary)
                    .scaleEffect(saveAnimating ? 1.4 : 1.0)
            }
        }
    }

    // MARK: - Detail content

    @ViewBuilder
    private func detailContent(_ church: Church) -> some View {
        VStack(alignment: .leading, spacing: 0) {

            // ── Hero map ──
            if church.lat != 0 {
                heroMap(church)
            }

            // ── Photo gallery ──
            if !church.photos.isEmpty {
                photoGallery(church.photos)
            }

            // ── Identity block ──
            VStack(alignment: .leading, spacing: 12) {
                VStack(alignment: .leading, spacing: 6) {
                    Text(church.name)
                        .font(.title2.weight(.bold))
                        .fixedSize(horizontal: false, vertical: true)

                    HStack(spacing: 6) {
                        Image(systemName: "mappin.circle.fill")
                            .font(.caption)
                            .foregroundStyle(Color("Gold"))
                        Text(church.address.formatted)
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                }

                ReliabilityBadge(score: church.reliabilityScore, style: .prominent)

                // ── Quick actions ──
                quickActions(church)
            }
            .padding(.horizontal, 20)
            .padding(.top, 20)
            .padding(.bottom, 8)

            Divider()
                .padding(.horizontal, 20)
                .padding(.vertical, 16)

            // ── Sections ──
            VStack(spacing: 16) {

                // Mass schedules
                if !church.massSchedules.isEmpty {
                    scheduleSection(church)
                }

                // Office schedules (confession, adoration, vespers, lauds)
                if let offices = church.officeSchedules, !offices.isEmpty {
                    officeSchedulesSection(offices)
                }

                // Contact
                if let contact = church.contact,
                   contact.phone != nil || contact.website != nil || contact.email != nil {
                    contactSection(contact)
                }

                // Rites & languages
                if !church.rites.isEmpty || !church.languages.isEmpty {
                    ritesSection(church)
                }

                // Data sources
                if !church.dataSources.isEmpty {
                    dataSourcesSection(church.dataSources)
                }
            }
            .padding(.bottom, 48)
        }
    }

    // MARK: - Hero map

    private func heroMap(_ church: Church) -> some View {
        ZStack(alignment: .bottomTrailing) {
            if mapReady {
                Map(initialPosition: .region(MKCoordinateRegion(
                    center: CLLocationCoordinate2D(latitude: church.lat, longitude: church.lng),
                    span: MKCoordinateSpan(latitudeDelta: 0.004, longitudeDelta: 0.004)
                ))) {
                    Marker(church.name, coordinate: CLLocationCoordinate2D(latitude: church.lat, longitude: church.lng))
                        .tint(Color("Gold"))
                }
                .allowsHitTesting(false)
            } else {
                Color(.secondarySystemBackground)
            }

            // Gradient fade at bottom
            LinearGradient(
                colors: [.clear, Color(.systemBackground).opacity(0.6)],
                startPoint: .top,
                endPoint: .bottom
            )
            .frame(height: 60)
            .frame(maxWidth: .infinity, alignment: .bottom)
        }
        .frame(height: 220)
        .clipped()
        .task {
            // Wait for layout to complete before showing the Map,
            // preventing CAMetalLayer from initializing with zero size
            try? await Task.sleep(for: .milliseconds(100))
            mapReady = true
        }
    }

    // MARK: - Quick actions

    private func quickActions(_ church: Church) -> some View {
        HStack(spacing: 10) {
            // Directions — always shown if coordinates exist
            if church.lat != 0 {
                quickActionButton(
                    label: "Itinéraire",
                    icon: "arrow.triangle.turn.up.right.diamond.fill",
                    tint: Color("Gold")
                ) {
                    let coords = "\(church.lat),\(church.lng)"
                    if let url = URL(string: "maps://?daddr=\(coords)") {
                        UIApplication.shared.open(url)
                    }
                }
            }

            if let phone = church.contact?.phone {
                quickActionButton(label: "Appeler", icon: "phone.fill", tint: .green) {
                    let cleaned = Self.cleanPhoneNumber(phone)
                    if let url = URL(string: "tel:\(cleaned)"),
                       UIApplication.shared.canOpenURL(url) {
                        UIApplication.shared.open(url)
                    }
                }
            }

            if let website = church.contact?.website, let url = URL(string: website) {
                quickActionButton(label: "Site web", icon: "safari.fill", tint: .blue) {
                    UIApplication.shared.open(url)
                }
            }
        }
    }

    private func quickActionButton(label: String, icon: String, tint: Color, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            VStack(spacing: 6) {
                ZStack {
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .fill(tint.opacity(0.12))
                        .frame(width: 52, height: 52)
                    Image(systemName: icon)
                        .font(.system(size: 20, weight: .medium))
                        .foregroundStyle(tint)
                }
                Text(label)
                    .font(.caption2.weight(.medium))
                    .foregroundStyle(.secondary)
            }
        }
    }

    // MARK: - Schedule section

    private func scheduleSection(_ church: Church) -> some View {
        sectionCard(title: "Horaires des messes", icon: "calendar") {
            let groups = buildScheduleGroups(church.massSchedules)
            let visibleGroups = showAllMasses ? groups : Array(groups.prefix(3))
            VStack(alignment: .leading, spacing: 0) {
                ForEach(Array(visibleGroups.enumerated()), id: \.offset) { idx, group in
                    VStack(alignment: .leading, spacing: 0) {
                        Text(group.label.uppercased())
                            .font(.caption2.weight(.bold))
                            .foregroundStyle(Color("Gold"))
                            .padding(.bottom, 8)

                        VStack(spacing: 0) {
                            ForEach(Array(group.schedules.enumerated()), id: \.offset) { i, schedule in
                                MassScheduleRow(schedule: schedule)
                                if i < group.schedules.count - 1 {
                                    Divider().padding(.leading, 56)
                                }
                            }
                        }
                    }
                    if idx < visibleGroups.count - 1 {
                        Divider().padding(.vertical, 10)
                    }
                }

                if groups.count > 3 {
                    showMoreButton(expanded: showAllMasses) {
                        withAnimation(.easeInOut(duration: 0.25)) {
                            showAllMasses.toggle()
                        }
                    }
                }
            }
        }
    }

    private struct ScheduleGroup {
        let label: String
        let dayOfWeek: Int
        let date: String?
        let schedules: [MassSchedule]
    }

    private func buildScheduleGroups(_ schedules: [MassSchedule]) -> [ScheduleGroup] {
        var map: [(key: String, label: String, dayOfWeek: Int, date: String?, schedules: [MassSchedule])] = []
        var keyOrder: [String] = []

        for schedule in schedules {
            let key = schedule.date != nil ? "\(schedule.dayOfWeek):\(schedule.date!)" : "\(schedule.dayOfWeek):"
            if let idx = map.firstIndex(where: { $0.key == key }) {
                map[idx].schedules.append(schedule)
            } else {
                let dayName = schedule.dayName
                let label: String
                if let formatted = schedule.dateFormatted {
                    label = "\(dayName) — \(formatted)"
                } else {
                    label = "\(dayName) \(Self.nextDateString(forDayOfWeek: schedule.dayOfWeek))"
                }
                keyOrder.append(key)
                map.append((key: key, label: label, dayOfWeek: schedule.dayOfWeek, date: schedule.date, schedules: [schedule]))
            }
        }

        // Sort starting from today's day of week
        let todayDow = Self.todayDayOfWeek()
        let sorted = map.sorted { a, b in
            let offsetA = (a.dayOfWeek - todayDow + 7) % 7
            let offsetB = (b.dayOfWeek - todayDow + 7) % 7
            if offsetA != offsetB { return offsetA < offsetB }
            return (a.date ?? "") < (b.date ?? "")
        }

        return sorted.map { ScheduleGroup(label: $0.label, dayOfWeek: $0.dayOfWeek, date: $0.date, schedules: $0.schedules) }
    }

    // MARK: - Contact section

    private func contactSection(_ contact: Contact) -> some View {
        sectionCard(title: "Contact", icon: "phone.fill") {
            VStack(spacing: 0) {
                if let phone = contact.phone {
                    contactRow(icon: "phone.fill", iconBg: .green, label: phone, detail: "Appeler") {
                        let cleaned = Self.cleanPhoneNumber(phone)
                        if let url = URL(string: "tel:\(cleaned)"),
                           UIApplication.shared.canOpenURL(url) {
                            UIApplication.shared.open(url)
                        }
                    }
                }
                if let website = contact.website, let url = URL(string: website) {
                    if contact.phone != nil { Divider().padding(.leading, 52) }
                    contactRow(
                        icon: "safari.fill", iconBg: .blue,
                        label: website
                            .replacingOccurrences(of: "https://", with: "")
                            .replacingOccurrences(of: "http://", with: ""),
                        detail: "Ouvrir"
                    ) { UIApplication.shared.open(url) }
                }
                if let email = contact.email, let url = URL(string: "mailto:\(email)") {
                    if contact.phone != nil || contact.website != nil { Divider().padding(.leading, 52) }
                    contactRow(icon: "envelope.fill", iconBg: Color("Gold"), label: email, detail: "Email") {
                        UIApplication.shared.open(url)
                    }
                }
            }
        }
    }

    // MARK: - Rites section

    private func ritesSection(_ church: Church) -> some View {
        sectionCard(title: "Rites & langues", icon: "text.book.closed.fill") {
            VStack(alignment: .leading, spacing: 12) {
                if !church.rites.isEmpty {
                    tagRow(
                        label: "Rites",
                        tags: church.rites.map { MassSchedule(dayOfWeek: 0, time: "", date: nil, rite: $0, language: nil, notes: nil).riteFormatted }
                    )
                }
                if !church.languages.isEmpty {
                    if !church.rites.isEmpty { Divider() }
                    tagRow(label: "Langues", tags: church.languages)
                }
            }
        }
    }

    // MARK: - Section card

    @ViewBuilder
    private func sectionCard<Content: View>(title: String, icon: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            Label(title, systemImage: icon)
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(Color("Gold"))

            content()
        }
        .padding(16)
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).stroke(Color.primary.opacity(0.06), lineWidth: 1))
        .shadow(color: .black.opacity(0.04), radius: 6, y: 2)
        .padding(.horizontal, 20)
    }

    // MARK: - Show more button

    private func showMoreButton(expanded: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: 4) {
                Text(expanded ? "Voir moins" : "Voir plus")
                    .font(.caption.weight(.semibold))
                Image(systemName: expanded ? "chevron.up" : "chevron.down")
                    .font(.caption2.weight(.bold))
            }
            .foregroundStyle(Color("Gold"))
            .frame(maxWidth: .infinity)
            .padding(.top, 12)
        }
    }

    // MARK: - Contact row

    @ViewBuilder
    private func contactRow(icon: String, iconBg: Color, label: String, detail: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: 12) {
                ZStack {
                    RoundedRectangle(cornerRadius: 8, style: .continuous)
                        .fill(iconBg.opacity(0.15))
                        .frame(width: 34, height: 34)
                    Image(systemName: icon)
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(iconBg)
                }
                Text(label)
                    .font(.subheadline)
                    .foregroundStyle(.primary)
                    .lineLimit(1)
                Spacer()
                Text(detail)
                    .font(.caption.weight(.medium))
                    .foregroundStyle(Color("Gold"))
                Image(systemName: "chevron.right")
                    .font(.caption2.weight(.semibold))
                    .foregroundStyle(.quaternary)
            }
            .padding(.vertical, 8)
        }
    }

    // MARK: - Tag row

    @ViewBuilder
    private func tagRow(label: String, tags: [String]) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(label.uppercased())
                .font(.caption2.weight(.bold))
                .foregroundStyle(.secondary)
                .kerning(0.5)
            LazyVGrid(
                columns: [GridItem(.adaptive(minimum: 90, maximum: 180), spacing: 6)],
                alignment: .leading,
                spacing: 6
            ) {
                ForEach(tags, id: \.self) { tag in
                    Text(tag)
                        .font(.caption.weight(.medium))
                        .padding(.horizontal, 10)
                        .padding(.vertical, 5)
                        .background(Color("Gold").opacity(0.1), in: Capsule())
                        .foregroundStyle(Color("Gold"))
                }
            }
        }
    }

    // MARK: - Photo gallery

    private func photoGallery(_ photos: [String]) -> some View {
        ScrollView(.horizontal, showsIndicators: false) {
            LazyHStack(spacing: 10) {
                ForEach(Array(photos.enumerated()), id: \.offset) { _, urlString in
                    if let url = URL(string: urlString) {
                        AsyncImage(url: url) { phase in
                            switch phase {
                            case .success(let image):
                                image
                                    .resizable()
                                    .aspectRatio(contentMode: .fill)
                                    .frame(width: 280, height: 180)
                                    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                            case .failure:
                                EmptyView()
                            default:
                                RoundedRectangle(cornerRadius: 14, style: .continuous)
                                    .fill(.quaternary)
                                    .frame(width: 280, height: 180)
                                    .overlay {
                                        ProgressView()
                                    }
                            }
                        }
                    }
                }
            }
            .padding(.horizontal, 20)
            .scrollTargetLayout()
        }
        .scrollTargetBehavior(.viewAligned)
        .frame(height: 190)
        .padding(.top, 8)
    }

    // MARK: - Office schedules section

    private func officeSchedulesSection(_ offices: [OfficeSchedule]) -> some View {
        let typeOrder = ["confession", "adoration", "vespers", "lauds", "other"]
        let grouped = Dictionary(grouping: offices, by: { $0.type })
        let activeTypes = typeOrder.filter { grouped[$0] != nil }

        return ForEach(activeTypes, id: \.self) { type in
            if let schedules = grouped[type] {
                let sample = schedules[0]
                sectionCard(title: sample.typeName, icon: sample.typeIcon) {
                    officeTypeContent(schedules)
                }
            }
        }
    }

    private func officeTypeContent(_ schedules: [OfficeSchedule]) -> some View {
        let groups = buildOfficeGroups(schedules)
        let type = schedules.first?.type ?? ""
        let expanded = showAllOfficeTypes.contains(type)
        let visibleGroups = expanded ? groups : Array(groups.prefix(3))

        return VStack(alignment: .leading, spacing: 0) {
            ForEach(Array(visibleGroups.enumerated()), id: \.offset) { idx, group in
                VStack(alignment: .leading, spacing: 0) {
                    Text(group.label.uppercased())
                        .font(.caption2.weight(.bold))
                        .foregroundStyle(Color("Gold"))
                        .padding(.bottom, 8)

                    VStack(spacing: 0) {
                        ForEach(Array(group.schedules.enumerated()), id: \.offset) { i, schedule in
                            officeScheduleRow(schedule)
                            if i < group.schedules.count - 1 {
                                Divider().padding(.leading, 56)
                            }
                        }
                    }
                }
                if idx < visibleGroups.count - 1 {
                    Divider().padding(.vertical, 10)
                }
            }

            if groups.count > 3 {
                showMoreButton(expanded: expanded) {
                    withAnimation(.easeInOut(duration: 0.25)) {
                        if expanded {
                            showAllOfficeTypes.remove(type)
                        } else {
                            showAllOfficeTypes.insert(type)
                        }
                    }
                }
            }
        }
    }

    private struct OfficeGroup {
        let label: String
        let dayOfWeek: Int
        let date: String?
        let schedules: [OfficeSchedule]
    }

    private func buildOfficeGroups(_ schedules: [OfficeSchedule]) -> [OfficeGroup] {
        var map: [(key: String, label: String, dayOfWeek: Int, date: String?, schedules: [OfficeSchedule])] = []

        for schedule in schedules {
            let key = schedule.date != nil ? "\(schedule.dayOfWeek):\(schedule.date!)" : "\(schedule.dayOfWeek):"
            if let idx = map.firstIndex(where: { $0.key == key }) {
                map[idx].schedules.append(schedule)
            } else {
                let label: String
                if let formatted = schedule.dateFormatted {
                    label = "\(schedule.dayName) — \(formatted)"
                } else {
                    label = "\(schedule.dayName) \(Self.nextDateString(forDayOfWeek: schedule.dayOfWeek))"
                }
                map.append((key: key, label: label, dayOfWeek: schedule.dayOfWeek, date: schedule.date, schedules: [schedule]))
            }
        }

        let todayDow = Self.todayDayOfWeek()
        let sorted = map.sorted { a, b in
            let offsetA = (a.dayOfWeek - todayDow + 7) % 7
            let offsetB = (b.dayOfWeek - todayDow + 7) % 7
            if offsetA != offsetB { return offsetA < offsetB }
            return (a.date ?? "") < (b.date ?? "")
        }

        return sorted.map { OfficeGroup(label: $0.label, dayOfWeek: $0.dayOfWeek, date: $0.date, schedules: $0.schedules) }
    }

    @ViewBuilder
    private func officeScheduleRow(_ schedule: OfficeSchedule) -> some View {
        HStack(spacing: 14) {
            Text(schedule.timeFormatted)
                .font(.system(size: 15, weight: .bold, design: .monospaced))
                .foregroundStyle(Color("Gold"))
                .lineLimit(1)
                .fixedSize()
                .frame(minWidth: 48, alignment: .leading)

            Rectangle()
                .fill(Color("Gold").opacity(0.25))
                .frame(width: 1)
                .frame(minHeight: 28, maxHeight: 36)

            if let notes = schedule.notes, !notes.isEmpty {
                Text(notes)
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(.primary)
                    .lineLimit(2)
            }

            Spacer()
        }
        .padding(.vertical, 9)
    }

    // MARK: - Data sources section

    private func dataSourcesSection(_ sources: [DataSource]) -> some View {
        sectionCard(title: "Sources", icon: "doc.text.magnifyingglass") {
            VStack(spacing: 0) {
                ForEach(Array(sources.enumerated()), id: \.offset) { idx, source in
                    HStack(spacing: 10) {
                        // Reliability dot
                        Circle()
                            .fill(sourceColor(source.reliability ?? 0))
                            .frame(width: 6, height: 6)

                        VStack(alignment: .leading, spacing: 2) {
                            Text(source.name)
                                .font(.subheadline.weight(.medium))
                            if let lastScraped = source.lastScraped {
                                Text(formatSourceDate(lastScraped))
                                    .font(.caption2)
                                    .foregroundStyle(.secondary)
                            }
                        }

                        Spacer()

                        if let urlString = source.url, let url = URL(string: urlString) {
                            Link(destination: url) {
                                Image(systemName: "arrow.up.right.square")
                                    .font(.caption)
                                    .foregroundStyle(Color("Gold"))
                            }
                        }
                    }
                    .padding(.vertical, 6)
                    if idx < sources.count - 1 {
                        Divider().padding(.leading, 20)
                    }
                }
            }
        }
    }

    private func sourceColor(_ reliability: Int) -> Color {
        switch reliability {
        case 70...: return .green
        case 40..<70: return .orange
        default: return .red
        }
    }

    private func formatSourceDate(_ dateString: String) -> String {
        let isoFormatter = ISO8601DateFormatter()
        isoFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = isoFormatter.date(from: dateString) {
            let formatter = DateFormatter()
            formatter.dateStyle = .medium
            formatter.locale = Locale(identifier: "fr_FR")
            return formatter.string(from: date)
        }
        // Fallback: try without fractional seconds
        isoFormatter.formatOptions = [.withInternetDateTime]
        if let date = isoFormatter.date(from: dateString) {
            let formatter = DateFormatter()
            formatter.dateStyle = .medium
            formatter.locale = Locale(identifier: "fr_FR")
            return formatter.string(from: date)
        }
        return dateString
    }

    // MARK: - Date helpers

    /// Returns today's dayOfWeek (0 = Sunday … 6 = Saturday)
    private static func todayDayOfWeek() -> Int {
        let calendar = Calendar(identifier: .gregorian)
        return calendar.component(.weekday, from: Date()) - 1
    }

    /// Returns the formatted date string (e.g. "14 avril") for the next occurrence of a given day of week.
    /// `dayOfWeek`: 0 = Sunday … 6 = Saturday
    private static func nextDateString(forDayOfWeek dayOfWeek: Int) -> String {
        let calendar = Calendar(identifier: .gregorian)
        let today = Date()
        // Calendar weekday: 1 = Sunday … 7 = Saturday
        let targetWeekday = dayOfWeek + 1
        let todayWeekday = calendar.component(.weekday, from: today)
        var daysAhead = targetWeekday - todayWeekday
        if daysAhead < 0 { daysAhead += 7 }
        let nextDate = calendar.date(byAdding: .day, value: daysAhead, to: today)!
        let formatter = DateFormatter()
        formatter.dateFormat = "d MMMM"
        formatter.locale = Locale(identifier: "fr_FR")
        return formatter.string(from: nextDate)
    }

    // MARK: - Phone number helper

    private static func cleanPhoneNumber(_ phone: String) -> String {
        var cleaned = phone.filter { $0.isNumber || $0 == "+" }
        // Convert French local numbers (0X...) to international format
        if cleaned.hasPrefix("0"), cleaned.count == 10 {
            cleaned = "+33" + cleaned.dropFirst()
        }
        return cleaned
    }

    // MARK: - Toggle save

    private func toggleSave() {
        if let existing = savedChurches.first(where: { $0.churchId == churchId }) {
            modelContext.delete(existing)
        } else {
            let address = church?.address.formatted ?? ""
            modelContext.insert(SavedChurch(churchId: churchId, name: churchName, address: address))
        }
    }

    // MARK: - States

    private var initialView: some View {
        VStack(spacing: 16) {
            ProgressView()
            Text(churchName)
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.top, 80)
    }

    private var errorView: some View {
        VStack(spacing: 16) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: 32))
                .foregroundStyle(.secondary)
            Text(churchName)
                .font(.headline)
            Text("Impossible de charger les détails de cette église.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
            Button {
                Task { await store.selectChurch(id: churchId) }
            } label: {
                Label("Réessayer", systemImage: "arrow.clockwise")
                    .font(.subheadline.weight(.medium))
            }
            .buttonStyle(.bordered)
            .tint(Color("Gold"))
        }
        .frame(maxWidth: .infinity)
        .padding(.top, 60)
        .padding(.horizontal, 32)
    }

    private var loadingView: some View {
        VStack(alignment: .leading, spacing: 0) {
            Rectangle()
                .fill(.quaternary)
                .frame(height: 220)

            VStack(alignment: .leading, spacing: 12) {
                VStack(alignment: .leading, spacing: 8) {
                    RoundedRectangle(cornerRadius: 4).fill(.quaternary).frame(width: 200, height: 22)
                    RoundedRectangle(cornerRadius: 4).fill(.quaternary).frame(width: 150, height: 14)
                    RoundedRectangle(cornerRadius: 8).fill(.quaternary).frame(width: 80, height: 22)
                }
                HStack(spacing: 10) {
                    ForEach(0..<3, id: \.self) { _ in
                        VStack(spacing: 6) {
                            RoundedRectangle(cornerRadius: 12).fill(.quaternary).frame(width: 52, height: 52)
                            RoundedRectangle(cornerRadius: 4).fill(.quaternary).frame(width: 44, height: 10)
                        }
                    }
                }
            }
            .padding(.horizontal, 20)
            .padding(.top, 20)

            Divider().padding(.horizontal, 20).padding(.vertical, 16)

            VStack(spacing: 16) {
                RoundedRectangle(cornerRadius: 16).fill(.quaternary).frame(height: 140).padding(.horizontal, 20)
                RoundedRectangle(cornerRadius: 16).fill(.quaternary).frame(height: 100).padding(.horizontal, 20)
            }
        }
        .redacted(reason: .placeholder)
    }
}

#Preview {
    ChurchDetailSheet(churchId: "preview-id", churchName: "Notre-Dame de Paris")
        .environment(ChurchStore())
        .environment(AuthStore())
        .modelContainer(for: SavedChurch.self, inMemory: true)
}
