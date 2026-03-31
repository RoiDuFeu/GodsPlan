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

    private var church: Church? { store.selectedChurch }
    private var isSaved: Bool { savedChurches.contains { $0.churchId == churchId } }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    if store.isLoadingDetail {
                        loadingView
                    } else if let church {
                        detailContent(church)
                    } else {
                        // Name available immediately from list
                        VStack(alignment: .leading, spacing: 8) {
                            Text(churchName)
                                .font(.title2.weight(.bold))
                                .padding(.horizontal, 20)
                                .padding(.top, 20)
                            ProgressView()
                                .frame(maxWidth: .infinity)
                                .padding(.top, 40)
                        }
                    }
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    saveButton
                }
            }
        }
        .sheet(isPresented: $showSignInPrompt) {
            SignInView()
                .presentationDetents([.medium])
        }
    }

    // MARK: - Detail content

    @ViewBuilder
    private func detailContent(_ church: Church) -> some View {
        VStack(alignment: .leading, spacing: 24) {
            // Header
            VStack(alignment: .leading, spacing: 8) {
                Text(church.name)
                    .font(.title2.weight(.bold))

                Text(church.address.formatted)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)

                ReliabilityBadge(score: church.reliabilityScore)
            }
            .padding(.horizontal, 20)
            .padding(.top, 20)

            // Mini map
            if church.lat != 0 {
                Map(initialPosition: .region(MKCoordinateRegion(
                    center: CLLocationCoordinate2D(latitude: church.lat, longitude: church.lng),
                    span: MKCoordinateSpan(latitudeDelta: 0.005, longitudeDelta: 0.005)
                ))) {
                    Marker(church.name, coordinate: CLLocationCoordinate2D(latitude: church.lat, longitude: church.lng))
                        .tint(Color("Gold"))
                }
                .frame(height: 160)
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .padding(.horizontal, 20)
                .allowsHitTesting(false)
            }

            // Mass schedules
            if !church.massSchedules.isEmpty {
                sectionCard(title: "Horaires des messes", icon: "calendar") {
                    let grouped = Dictionary(grouping: church.massSchedules, by: { $0.dayOfWeek })
                    ForEach(0..<7) { day in
                        if let schedules = grouped[day] {
                            ForEach(schedules, id: \.time) { schedule in
                                MassScheduleRow(schedule: schedule)
                                if schedule != schedules.last {
                                    Divider().padding(.leading, 84)
                                }
                            }
                            if day < 6 && grouped.keys.contains(where: { $0 > day }) {
                                Divider()
                            }
                        }
                    }
                }
            }

            // Contact
            if let contact = church.contact,
               contact.phone != nil || contact.website != nil || contact.email != nil {
                sectionCard(title: "Contact", icon: "phone") {
                    if let phone = contact.phone {
                        contactRow(icon: "phone.fill", label: phone) {
                            if let url = URL(string: "tel:\(phone.replacingOccurrences(of: " ", with: ""))") {
                                UIApplication.shared.open(url)
                            }
                        }
                    }
                    if let website = contact.website, let url = URL(string: website) {
                        contactRow(icon: "globe", label: website) {
                            UIApplication.shared.open(url)
                        }
                    }
                    if let email = contact.email, let url = URL(string: "mailto:\(email)") {
                        contactRow(icon: "envelope.fill", label: email) {
                            UIApplication.shared.open(url)
                        }
                    }
                }
            }

            // Rites & languages
            if !church.rites.isEmpty || !church.languages.isEmpty {
                sectionCard(title: "Rites & langues", icon: "text.book.closed") {
                    if !church.rites.isEmpty {
                        HStack {
                            Text("Rites")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                                .frame(width: 60, alignment: .leading)
                            FlowLayout(church.rites.map { MassSchedule(dayOfWeek: 0, time: "", rite: $0, language: nil, notes: nil).riteFormatted })
                        }
                    }
                    if !church.languages.isEmpty {
                        HStack {
                            Text("Langues")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                                .frame(width: 60, alignment: .leading)
                            FlowLayout(church.languages)
                        }
                    }
                }
            }

            Spacer(minLength: 40)
        }
    }

    // MARK: - Section card helper

    @ViewBuilder
    private func sectionCard<Content: View>(title: String, icon: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Label(title, systemImage: icon)
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(Color("Gold"))

            content()
        }
        .padding(16)
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 14, style: .continuous).stroke(Color.primary.opacity(0.07), lineWidth: 1))
        .padding(.horizontal, 20)
    }

    // MARK: - Contact row

    @ViewBuilder
    private func contactRow(icon: String, label: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: 10) {
                Image(systemName: icon)
                    .font(.caption)
                    .foregroundStyle(Color("Gold"))
                    .frame(width: 20)
                Text(label)
                    .font(.subheadline)
                    .foregroundStyle(.primary)
                    .lineLimit(1)
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.caption2)
                    .foregroundStyle(.tertiary)
            }
        }
        .padding(.vertical, 4)
    }

    // MARK: - Save button

    @ViewBuilder
    private var saveButton: some View {
        Button {
            if authStore.isSignedIn {
                toggleSave()
            } else {
                showSignInPrompt = true
            }
        } label: {
            Image(systemName: isSaved ? "bookmark.fill" : "bookmark")
                .foregroundStyle(isSaved ? Color("Gold") : .primary)
        }
    }

    private func toggleSave() {
        if let existing = savedChurches.first(where: { $0.churchId == churchId }) {
            modelContext.delete(existing)
        } else {
            let address = church?.address.formatted ?? ""
            let saved = SavedChurch(churchId: churchId, name: churchName, address: address)
            modelContext.insert(saved)
        }
    }

    // MARK: - Loading

    private var loadingView: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text(churchName)
                .font(.title2.weight(.bold))
                .padding(.horizontal, 20)
                .padding(.top, 20)

            ForEach(0..<3) { _ in
                RoundedRectangle(cornerRadius: 14)
                    .fill(.quaternary)
                    .frame(height: 100)
                    .padding(.horizontal, 20)
            }
        }
        .redacted(reason: .placeholder)
    }
}

// MARK: - Flow layout for tags

private struct FlowLayout: View {
    let items: [String]

    init(_ items: [String]) {
        self.items = items
    }

    var body: some View {
        // Simple wrapping HStack using SwiftUI Layout
        LazyVGrid(columns: [GridItem(.adaptive(minimum: 80, maximum: 160), spacing: 6)], alignment: .leading, spacing: 6) {
            ForEach(items, id: \.self) { item in
                Text(item)
                    .font(.caption.weight(.medium))
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Color("Gold").opacity(0.12), in: Capsule())
                    .foregroundStyle(Color("Gold"))
            }
        }
    }
}
