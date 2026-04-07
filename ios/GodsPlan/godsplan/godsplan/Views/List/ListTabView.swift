import SwiftUI

struct ListTabView: View {
    @Environment(ChurchStore.self) private var store
    @State private var selectedChurch: ChurchListItem?
    @State private var appearedIds: Set<String> = []

    var body: some View {
        NavigationStack {
            mainContent
                .navigationTitle("Églises")
                .navigationBarTitleDisplayMode(.large)
                .toolbar(content: listToolbar)
                .navigationDestination(item: $selectedChurch) { church in
                    ChurchDetailSheet(churchId: church.id, churchName: church.name)
                }
        }
    }

    @ViewBuilder
    private var mainContent: some View {
        if store.isLoading && store.churches.isEmpty {
            loadingSkeleton
        } else if store.churches.isEmpty {
            emptyState
        } else {
            churchList
        }
    }

    private var churchList: some View {
        List {
            ForEach(Array(store.churches.enumerated()), id: \.element.id) { index, church in
                ChurchRow(church: church)
                    .listRowBackground(EmptyView())
                    .listRowSeparator(.hidden)
                    .listRowInsets(EdgeInsets(top: 5, leading: 16, bottom: 5, trailing: 16))
                    .contentShape(Rectangle())
                    .onTapGesture { selectedChurch = church }
                    .opacity(appearedIds.contains(church.id) ? 1 : 0)
                    .offset(y: appearedIds.contains(church.id) ? 0 : 16)
                    .onAppear {
                        withAnimation(.spring(response: 0.4, dampingFraction: 0.75).delay(Double(index % 15) * 0.04)) {
                            _ = appearedIds.insert(church.id)
                        }
                    }
            }
        }
        .listStyle(.plain)
    }

    // MARK: - Loading skeleton

    private var loadingSkeleton: some View {
        List {
            ForEach(0..<10, id: \.self) { _ in
                HStack(spacing: 14) {
                    RoundedRectangle(cornerRadius: 10).fill(.quaternary).frame(width: 46, height: 46)
                    VStack(alignment: .leading, spacing: 6) {
                        RoundedRectangle(cornerRadius: 4).fill(.quaternary).frame(width: 160, height: 13)
                        RoundedRectangle(cornerRadius: 4).fill(.quaternary).frame(width: 110, height: 11)
                        RoundedRectangle(cornerRadius: 8).fill(.quaternary).frame(width: 72, height: 18)
                    }
                    Spacer()
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
                .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 14))
                .listRowBackground(EmptyView())
                .listRowSeparator(.hidden)
            }
        }
        .listStyle(.plain)
        .redacted(reason: .placeholder)
    }

    @ToolbarContentBuilder
    private func listToolbar() -> some ToolbarContent {
        ToolbarItem(placement: .topBarTrailing) {
            Group {
                if store.isLoading {
                    ProgressView().scaleEffect(0.8)
                } else {
                    Text("\(store.churches.count) églises")
                        .font(.caption.weight(.medium))
                        .foregroundStyle(.secondary)
                }
            }
        }
    }

    private var emptyState: some View {
        ContentUnavailableView("Aucune église", systemImage: "building.columns", description: Text("Les données sont en cours de chargement."))
    }
}
