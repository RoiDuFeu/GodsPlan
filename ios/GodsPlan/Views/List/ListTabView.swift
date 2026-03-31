import SwiftUI

struct ListTabView: View {
    @Environment(ChurchStore.self) private var store
    @State private var selectedChurch: ChurchListItem?
    @State private var searchText = ""

    var body: some View {
        @Bindable var store = store

        NavigationStack {
            Group {
                if store.isLoading && store.churches.isEmpty {
                    loadingSkeleton
                } else if store.filteredChurches.isEmpty && !searchText.isEmpty {
                    emptySearch
                } else {
                    List(store.filteredChurches) { church in
                        ChurchRow(church: church)
                            .contentShape(Rectangle())
                            .onTapGesture { selectedChurch = church }
                            .listRowBackground(Color.clear)
                            .listRowSeparator(.hidden)
                            .listRowInsets(EdgeInsets(top: 4, leading: 16, bottom: 4, trailing: 16))
                    }
                    .listStyle(.plain)
                }
            }
            .navigationTitle("Églises")
            .searchable(text: $store.searchQuery, prompt: "Rechercher une église…")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    if store.isLoading {
                        ProgressView().scaleEffect(0.8)
                    } else {
                        Text("\(store.filteredChurches.count)")
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(.secondary)
                    }
                }
            }
        }
        .sheet(item: $selectedChurch, onDismiss: { store.clearSelection() }) { church in
            ChurchDetailSheet(churchId: church.id, churchName: church.name)
                .presentationDetents([.medium, .large])
                .presentationDragIndicator(.visible)
        }
        .onChange(of: selectedChurch) { _, newValue in
            if let church = newValue {
                Task { await store.selectChurch(id: church.id) }
            }
        }
    }

    private var loadingSkeleton: some View {
        List(0..<8, id: \.self) { _ in
            HStack {
                VStack(alignment: .leading, spacing: 8) {
                    RoundedRectangle(cornerRadius: 4).fill(.quaternary).frame(width: 180, height: 14)
                    RoundedRectangle(cornerRadius: 4).fill(.quaternary).frame(width: 120, height: 11)
                    RoundedRectangle(cornerRadius: 8).fill(.quaternary).frame(width: 80, height: 20)
                }
                Spacer()
            }
            .padding(.vertical, 4)
            .listRowBackground(Color.clear)
            .listRowSeparator(.hidden)
        }
        .listStyle(.plain)
        .redacted(reason: .placeholder)
        .shimmer()
    }

    private var emptySearch: some View {
        ContentUnavailableView.search(text: store.searchQuery)
    }
}

// MARK: - Shimmer modifier

private extension View {
    func shimmer() -> some View {
        self.overlay(
            LinearGradient(
                stops: [
                    .init(color: .clear, location: 0),
                    .init(color: .white.opacity(0.15), location: 0.5),
                    .init(color: .clear, location: 1)
                ],
                startPoint: .leading,
                endPoint: .trailing
            )
            .rotationEffect(.degrees(20))
        )
    }
}
