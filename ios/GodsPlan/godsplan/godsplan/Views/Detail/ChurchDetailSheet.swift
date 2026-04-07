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

    private var church: Church? { store.selectedChurch }
    private var isSaved: Bool { savedChurches.contains { $0.churchId == churchId } }

    var body: some View {
        ScrollView(.vertical) {
            VStack(spacing: 0) {
                if store.isLoadingDetail {
                    loadingView
                } else if let church {
                    detailContent(church)
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
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) { saveAnimating = false }
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

                ReliabilityBadge(score: church.reliabilityScore)

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

                // Contact
                if let contact = church.contact,
                   contact.phone != nil || contact.website != nil || contact.email != nil {
                    contactSection(contact)
                }

                // Rites & languages
                if !church.rites.isEmpty || !church.languages.isEmpty {
                    ritesSection(church)
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
        .onAppear { DispatchQueue.main.async { mapReady = true } }
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
                    if let url = URL(string: "tel:\(phone.filter { $0.isNumber || $0 == "+" })") {
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
            let grouped = Dictionary(grouping: church.massSchedules, by: { $0.dayOfWeek })
            let activeDays = (0..<7).filter { grouped[$0] != nil }
            VStack(alignment: .leading, spacing: 0) {
                ForEach(Array(activeDays.enumerated()), id: \.element) { idx, day in
                    if let schedules = grouped[day] {
                        VStack(alignment: .leading, spacing: 0) {
                            Text(schedules[0].dayName.uppercased())
                                .font(.caption2.weight(.bold))
                                .foregroundStyle(Color("Gold"))
                                .padding(.bottom, 8)

                            VStack(spacing: 0) {
                                ForEach(Array(schedules.enumerated()), id: \.offset) { i, schedule in
                                    MassScheduleRow(schedule: schedule)
                                    if i < schedules.count - 1 {
                                        Divider().padding(.leading, 56)
                                    }
                                }
                            }
                        }
                        if idx < activeDays.count - 1 {
                            Divider().padding(.vertical, 10)
                        }
                    }
                }
            }
        }
    }

    // MARK: - Contact section

    private func contactSection(_ contact: Contact) -> some View {
        sectionCard(title: "Contact", icon: "phone.fill") {
            VStack(spacing: 0) {
                if let phone = contact.phone {
                    contactRow(icon: "phone.fill", iconBg: .green, label: phone, detail: "Appeler") {
                        if let url = URL(string: "tel:\(phone.filter { $0.isNumber || $0 == "+" })") {
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
                        tags: church.rites.map { MassSchedule(dayOfWeek: 0, time: "", rite: $0, language: nil, notes: nil).riteFormatted }
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
