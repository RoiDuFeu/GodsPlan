import SwiftUI
import SwiftData

struct SearchTabView: View {
    @Environment(ChurchStore.self) private var store
    @State private var query = ""
    @State private var isSearchPresented = false
    @State private var selectedRite: String? = nil
    @State private var onlyWithSchedules = false
    @State private var onlyAccessible = false
    @State private var selectedChurch: ChurchListItem?
    @State private var recentSearches: [String] = ["Notre-Dame", "Sacré-Cœur", "Saint-Eustache"]

    private let rites = ["Romain", "Latin", "Byzantin", "Arménien", "Maronite"]

    private var isFiltering: Bool { !query.isEmpty || selectedRite != nil || onlyWithSchedules || onlyAccessible }

    private var results: [ChurchListItem] {
        var list = store.churches
        if !query.isEmpty {
            let q = query.lowercased()
            list = list.filter {
                $0.name.lowercased().contains(q) ||
                ($0.address.city?.lowercased().contains(q) ?? false) ||
                ($0.address.street?.lowercased().contains(q) ?? false) ||
                ($0.address.postalCode?.contains(q) ?? false)
            }
        }
        if let rite = selectedRite {
            let riteLower = rite.lowercased()
            list = list.filter {
                $0.massSchedules?.contains { $0.riteFormatted.lowercased().contains(riteLower) } ?? false
            }
        }
        if onlyWithSchedules {
            list = list.filter { !($0.massSchedules?.isEmpty ?? true) }
        }
        if onlyAccessible {
            list = list.filter { $0.accessibility?.wheelchairAccessible == true }
        }
        return list
    }

    var body: some View {
        NavigationStack {
            mainContent
                .navigationTitle("Recherche")
                .navigationBarTitleDisplayMode(.large)
                .searchable(
                    text: $query,
                    isPresented: $isSearchPresented,
                    placement: .navigationBarDrawer(displayMode: .always),
                    prompt: "Église, adresse, arrondissement…"
                )
                .onSubmit(of: .search) { addRecent(query) }
                .navigationDestination(item: $selectedChurch) { church in
                    ChurchDetailSheet(churchId: church.id, churchName: church.name)
                }
        }
        .onAppear { isSearchPresented = true }
    }

    // MARK: - Main content

    @ViewBuilder
    private var mainContent: some View {
        VStack(spacing: 0) {
            filterChipsRow

            if !isFiltering {
                idleContent
            } else if results.isEmpty {
                emptyResults
            } else {
                resultsList
            }
        }
    }

    // MARK: - Filter chips

    private var filterChipsRow: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                FilterChip(label: "Avec horaires", icon: "clock.fill", isActive: onlyWithSchedules) {
                    withAnimation(.spring(response: 0.3)) { onlyWithSchedules.toggle() }
                }
                FilterChip(label: "Accès PMR", icon: "figure.roll", isActive: onlyAccessible) {
                    withAnimation(.spring(response: 0.3)) { onlyAccessible.toggle() }
                }
                Divider().frame(height: 20)
                ForEach(rites, id: \.self) { rite in
                    FilterChip(label: rite, icon: nil, isActive: selectedRite == rite) {
                        withAnimation(.spring(response: 0.3)) {
                            selectedRite = selectedRite == rite ? nil : rite
                        }
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
        }
        .background(.bar)
    }

    // MARK: - Idle state (recent + suggestions)

    private var idleContent: some View {
        List {
            if !recentSearches.isEmpty {
                Section {
                    ForEach(recentSearches, id: \.self) { recent in
                        Button {
                            query = recent
                            addRecent(recent)
                        } label: {
                            HStack(spacing: 12) {
                                Image(systemName: "clock.arrow.circlepath")
                                    .font(.subheadline)
                                    .foregroundStyle(.secondary)
                                    .frame(width: 28)
                                Text(recent)
                                    .font(.subheadline)
                                    .foregroundStyle(.primary)
                                Spacer()
                                Image(systemName: "arrow.up.left")
                                    .font(.caption2)
                                    .foregroundStyle(.quaternary)
                            }
                        }
                    }
                    .onDelete { recentSearches.remove(atOffsets: $0) }
                } header: {
                    HStack {
                        Text("Récentes")
                        Spacer()
                        Button("Effacer tout") {
                            withAnimation { recentSearches = [] }
                        }
                        .font(.caption.weight(.medium))
                        .foregroundStyle(.secondary)
                    }
                }
            }

            Section("Explorer par rite") {
                ForEach([
                    ("Rite romain",    "book.closed.fill",      "Messes ordinaires"),
                    ("Rite latin",     "text.book.closed.fill", "Forme extraordinaire"),
                    ("Rite byzantin",  "star.circle.fill",      "Liturgie orientale"),
                ], id: \.0) { title, icon, subtitle in
                    Button {
                        withAnimation { selectedRite = title.replacingOccurrences(of: "Rite ", with: "").capitalized }
                    } label: {
                        exploreSuggestionRow(title: title, icon: icon, subtitle: subtitle)
                    }
                }
                Button {
                    withAnimation { onlyAccessible = true }
                } label: {
                    exploreSuggestionRow(title: "Accès PMR", icon: "figure.roll", subtitle: "Accès handicapés")
                }
            }
        }
        .listStyle(.insetGrouped)
    }

    // MARK: - Results list

    private var resultsList: some View {
        List {
            Section {
                Text("\(results.count) résultat\(results.count == 1 ? "" : "s")")
                    .font(.caption.weight(.medium))
                    .foregroundStyle(.secondary)
                    .listRowBackground(EmptyView())
                    .listRowSeparator(.hidden)
            }

            ForEach(results) { church in
                ChurchRow(church: church)
                    .contentShape(Rectangle())
                    .onTapGesture { selectedChurch = church }
                    .listRowBackground(EmptyView())
                    .listRowSeparator(.hidden)
                    .listRowInsets(EdgeInsets(top: 5, leading: 16, bottom: 5, trailing: 16))
            }
        }
        .listStyle(.plain)
    }

    // MARK: - Empty results

    private var emptyResults: some View {
        ContentUnavailableView {
            Label("Aucun résultat", systemImage: "magnifyingglass")
        } description: {
            Text("Essayez un autre terme ou modifiez vos filtres.")
        }
    }

    // MARK: - Helpers

    private func exploreSuggestionRow(title: String, icon: String, subtitle: String) -> some View {
        HStack(spacing: 14) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundStyle(Color("Gold"))
                .frame(width: 28)
            VStack(alignment: .leading, spacing: 2) {
                Text(title).font(.subheadline.weight(.medium)).foregroundStyle(.primary)
                Text(subtitle).font(.caption).foregroundStyle(.secondary)
            }
            Spacer()
            Image(systemName: "chevron.right")
                .font(.caption.weight(.semibold))
                .foregroundStyle(.quaternary)
        }
    }

    private func addRecent(_ term: String) {
        let trimmed = term.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty else { return }
        recentSearches.removeAll { $0 == trimmed }
        recentSearches.insert(trimmed, at: 0)
        if recentSearches.count > 5 { recentSearches = Array(recentSearches.prefix(5)) }
    }
}

// MARK: - Filter chip

private struct FilterChip: View {
    let label: String
    let icon: String?
    let isActive: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 5) {
                if let icon {
                    Image(systemName: icon)
                        .font(.system(size: 11, weight: .semibold))
                }
                Text(label)
                    .font(.caption.weight(.semibold))
            }
            .foregroundStyle(isActive ? .white : .primary)
            .padding(.horizontal, 12)
            .padding(.vertical, 7)
            .background(
                isActive ? AnyShapeStyle(Color("Gold")) : AnyShapeStyle(.ultraThinMaterial),
                in: Capsule()
            )
            .overlay(Capsule().stroke(isActive ? Color.clear : Color.primary.opacity(0.1), lineWidth: 1))
            .shadow(color: isActive ? Color("Gold").opacity(0.3) : .clear, radius: 4, y: 2)
        }
    }
}

#Preview {
    SearchTabView()
        .environment(ChurchStore())
        .environment(AuthStore())
        .modelContainer(for: SavedChurch.self, inMemory: true)
}
