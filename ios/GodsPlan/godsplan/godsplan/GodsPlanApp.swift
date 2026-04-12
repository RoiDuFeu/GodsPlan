import SwiftUI
import SwiftData
import GoogleSignIn
import UserNotifications

class AppDelegate: NSObject, UIApplicationDelegate {
    func application(
        _ application: UIApplication,
        didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
    ) {
        let token = deviceToken.map { String(format: "%02x", $0) }.joined()
        let jwt = KeychainHelper.read(key: "backendJWT")
        NotificationManager.shared.didRegisterToken(token, jwt: jwt)
    }

    func application(
        _ application: UIApplication,
        didFailToRegisterForRemoteNotificationsWithError error: Error
    ) {
        print("Push registration failed: \(error.localizedDescription)")
    }
}

@main
struct GodsPlanApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
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
                .task {
                    await NotificationManager.shared.checkCurrentStatus()
                }
        }
        .modelContainer(for: SavedChurch.self)
    }
}
