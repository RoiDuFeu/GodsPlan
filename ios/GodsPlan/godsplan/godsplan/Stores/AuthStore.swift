import Foundation
import AuthenticationServices
import GoogleSignIn
import Observation

enum AuthProvider: String {
    case apple, google
}

@Observable
final class AuthStore {
    var isSignedIn = false
    var userName: String?
    var userEmail: String?
    var userID: String?
    var authProvider: AuthProvider?

    var jwt: String? {
        KeychainHelper.read(key: "backendJWT")
    }

    init() {
        restoreSession()
    }

    // MARK: - Sign In with Apple

    func handleAuthorization(_ result: Result<ASAuthorization, Error>) {
        switch result {
        case .success(let auth):
            guard let credential = auth.credential as? ASAuthorizationAppleIDCredential,
                  let tokenData = credential.identityToken,
                  let identityToken = String(data: tokenData, encoding: .utf8) else { return }

            let name = [credential.fullName?.givenName, credential.fullName?.familyName]
                .compactMap { $0 }.joined(separator: " ")
            let email = credential.email

            Task {
                do {
                    let response = try await APIService.shared.authenticateApple(
                        identityToken: identityToken,
                        name: name.isEmpty ? nil : name,
                        email: email
                    )
                    await MainActor.run {
                        self.saveSession(jwt: response.token, user: response.user, provider: .apple)
                    }
                } catch {
                    print("Apple auth backend error: \(error)")
                }
            }

        case .failure:
            break
        }
    }

    // MARK: - Sign In with Google

    func handleGoogleSignIn(_ user: GIDGoogleUser) {
        guard let idToken = user.idToken?.tokenString else { return }

        Task {
            do {
                let response = try await APIService.shared.authenticateGoogle(idToken: idToken)
                await MainActor.run {
                    self.saveSession(jwt: response.token, user: response.user, provider: .google)
                }
            } catch {
                print("Google auth backend error: \(error)")
            }
        }
    }

    // MARK: - Sign Out

    func signOut() {
        // Unregister push token before clearing JWT
        NotificationManager.shared.unregister(jwt: jwt)

        // Clear Apple keys
        KeychainHelper.delete(key: "appleUserID")
        KeychainHelper.delete(key: "appleUserName")
        KeychainHelper.delete(key: "appleUserEmail")
        // Clear Google keys
        KeychainHelper.delete(key: "googleUserID")
        KeychainHelper.delete(key: "googleUserName")
        KeychainHelper.delete(key: "googleUserEmail")
        // Clear shared keys
        KeychainHelper.delete(key: "authProvider")
        KeychainHelper.delete(key: "backendJWT")

        if authProvider == .google {
            GIDSignIn.sharedInstance.signOut()
        }

        userID = nil
        userName = nil
        userEmail = nil
        authProvider = nil
        isSignedIn = false
    }

    // MARK: - Save session from backend response

    private func saveSession(jwt: String, user: AuthUser, provider: AuthProvider) {
        KeychainHelper.save(key: "backendJWT", value: jwt)
        KeychainHelper.save(key: "authProvider", value: provider.rawValue)

        let prefix = provider == .apple ? "apple" : "google"
        KeychainHelper.save(key: "\(prefix)UserID", value: user.id)
        if let name = user.name { KeychainHelper.save(key: "\(prefix)UserName", value: name) }
        if let email = user.email { KeychainHelper.save(key: "\(prefix)UserEmail", value: email) }

        userID = user.id
        userName = user.name
        userEmail = user.email
        authProvider = provider
        isSignedIn = true

        // Request push notification permission after sign-in
        Task {
            await NotificationManager.shared.requestPermission()
        }
    }

    // MARK: - Restore session on launch

    private func restoreSession() {
        guard let _ = KeychainHelper.read(key: "backendJWT"),
              let providerRaw = KeychainHelper.read(key: "authProvider"),
              let provider = AuthProvider(rawValue: providerRaw) else { return }

        let prefix = provider == .apple ? "apple" : "google"
        userID = KeychainHelper.read(key: "\(prefix)UserID")
        userName = KeychainHelper.read(key: "\(prefix)UserName")
        userEmail = KeychainHelper.read(key: "\(prefix)UserEmail")
        authProvider = provider
        isSignedIn = true
    }

}
