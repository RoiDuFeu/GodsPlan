import SwiftUI
import SwiftData

@main
struct GodsPlanApp: App {
    @State private var churchStore = ChurchStore()
    @State private var authStore = AuthStore()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(churchStore)
                .environment(authStore)
        }
        .modelContainer(for: SavedChurch.self)
    }
}
