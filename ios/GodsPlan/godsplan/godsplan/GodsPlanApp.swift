import SwiftUI
import SwiftData
import GoogleSignIn

@main
struct GodsPlanApp: App {
    @State private var churchStore = ChurchStore()
    @State private var authStore = AuthStore()

    init() {
        // Configure Google Sign In from Info.plist GIDClientID key
        if let clientID = Bundle.main.object(forInfoDictionaryKey: "GIDClientID") as? String {
            GIDSignIn.sharedInstance.configuration = GIDConfiguration(clientID: clientID)
        }
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(churchStore)
                .environment(authStore)
                .onOpenURL { url in
                    GIDSignIn.sharedInstance.handle(url)
                }
        }
        .modelContainer(for: SavedChurch.self)
    }
}
