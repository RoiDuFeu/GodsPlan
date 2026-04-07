import SwiftUI

struct ContentView: View {
    @Environment(ChurchStore.self) private var churchStore
    @Environment(AuthStore.self) private var authStore
    @AppStorage("darkModeEnabled") private var darkModeEnabled = false
    @State private var showSplash = true

    var body: some View {
        ZStack {
            TabView {
                Tab("Carte", systemImage: "mappin.circle.fill") {
                    MapTabView()
                }

                Tab("Églises", systemImage: "building.columns.fill") {
                    ListTabView()
                }

                Tab("Lectures", systemImage: "book.fill") {
                    LecturesTabView()
                }

                Tab("Profil", systemImage: "person.fill") {
                    ProfileTabView()
                }

                Tab("Recherche", systemImage: "magnifyingglass", role: .search) {
                    SearchTabView()
                }
            }
            .tint(Color("Gold"))
            .preferredColorScheme(darkModeEnabled ? .dark : .light)

            if showSplash {
                SplashView()
                    .transition(.opacity)
                    .zIndex(1)
            }
        }
        .task {
            await withTaskGroup(of: Void.self) { group in
                group.addTask { await churchStore.loadChurches() }
                group.addTask { try? await Task.sleep(for: .seconds(2)) }
                await group.waitForAll()
            }
            withAnimation(.easeInOut(duration: 0.5)) {
                showSplash = false
            }
        }
    }
}
