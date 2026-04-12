import SwiftUI
import SwiftData

struct ContentView: View {
    @Environment(ChurchStore.self) private var churchStore
    @Environment(AuthStore.self) private var authStore
    @AppStorage("darkModeEnabled") private var darkModeEnabled = false

    // Splash lifecycle
    @State private var showSplash = true
    @State private var splashDismissing = false
    @State private var dataReady = false
    @State private var minimumTimeElapsed = false

    // Content entrance
    @State private var contentOpacity: Double = 0
    @State private var contentScale: CGFloat = 0.97
    @State private var tabBarOffset: CGFloat = 60
    @State private var splashDone = false

    var body: some View {
        ZStack {
            // Main content (always in the tree so it starts loading immediately)
            TabView {
                Tab("Carte", systemImage: "mappin.circle.fill") {
                    MapTabView(splashDone: splashDone)
                }

                Tab("Eglises", systemImage: "building.columns.fill") {
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
            .opacity(contentOpacity)
            .scaleEffect(contentScale)
            .offset(y: showSplash ? 0 : 0) // keep in tree

            // Splash overlay
            if showSplash {
                SplashView(dismissing: splashDismissing)
                    .zIndex(1)
            }
        }
        .task {
            // Start data fetch and minimum display timer concurrently
            async let loadData: () = loadChurches()
            async let timer: () = minimumSplashTime()

            _ = await (loadData, timer)

            // Begin dismissal sequence
            triggerDismissal()
        }
    }

    private func loadChurches() async {
        await churchStore.loadChurches()
        dataReady = true
    }

    private func minimumSplashTime() async {
        // Splash intro animation is ~1.8s, hold a beat after
        try? await Task.sleep(for: .seconds(2.0))
        minimumTimeElapsed = true
    }

    private func triggerDismissal() {
        // Tell splash to play its exit animation
        splashDismissing = true

        // After a tiny delay, start revealing content underneath
        withAnimation(.spring(duration: 0.6, bounce: 0.08).delay(0.15)) {
            contentOpacity = 1
            contentScale = 1.0
        }

        // Remove splash from tree after exit animation completes
        Task { @MainActor in
            try? await Task.sleep(for: .milliseconds(650))
            showSplash = false
            splashDone = true
        }
    }
}

#Preview {
    ContentView()
        .environment(ChurchStore())
        .environment(AuthStore())
        .modelContainer(for: SavedChurch.self, inMemory: true)
}
