import Foundation
import UserNotifications
import UIKit

@Observable
final class NotificationManager {
    static let shared = NotificationManager()

    var isAuthorized = false
    var deviceToken: String?

    private init() {}

    // MARK: - Permission

    func requestPermission() async -> Bool {
        let center = UNUserNotificationCenter.current()
        do {
            let granted = try await center.requestAuthorization(options: [.alert, .sound, .badge])
            await MainActor.run { self.isAuthorized = granted }
            if granted {
                await MainActor.run {
                    UIApplication.shared.registerForRemoteNotifications()
                }
            }
            return granted
        } catch {
            print("Notification permission error: \(error)")
            return false
        }
    }

    func checkCurrentStatus() async {
        let settings = await UNUserNotificationCenter.current().notificationSettings()
        await MainActor.run {
            self.isAuthorized = settings.authorizationStatus == .authorized
        }
    }

    // MARK: - Token Management

    func didRegisterToken(_ tokenHex: String, jwt: String?) {
        self.deviceToken = tokenHex
        guard let jwt else { return }

        Task {
            do {
                try await APIService.shared.registerDeviceToken(tokenHex, jwt: jwt)
                print("Device token registered with backend")
            } catch {
                print("Failed to register device token: \(error)")
            }
        }
    }

    func unregister(jwt: String?) {
        guard let token = deviceToken, let jwt else { return }

        Task {
            do {
                try await APIService.shared.unregisterDeviceToken(token, jwt: jwt)
                print("Device token unregistered")
            } catch {
                print("Failed to unregister device token: \(error)")
            }
        }
    }
}
