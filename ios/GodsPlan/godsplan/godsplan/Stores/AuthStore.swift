import Foundation
import AuthenticationServices
import GoogleSignIn
import Observation
import Security

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

    init() {
        restoreSession()
    }

    // MARK: - Sign In with Apple

    func handleAuthorization(_ result: Result<ASAuthorization, Error>) {
        switch result {
        case .success(let auth):
            guard let credential = auth.credential as? ASAuthorizationAppleIDCredential else { return }
            let id = credential.user
            let name = [credential.fullName?.givenName, credential.fullName?.familyName]
                .compactMap { $0 }.joined(separator: " ")
            let email = credential.email

            saveToKeychain(key: "appleUserID", value: id)
            saveToKeychain(key: "authProvider", value: AuthProvider.apple.rawValue)
            if !name.isEmpty { saveToKeychain(key: "appleUserName", value: name) }
            if let email { saveToKeychain(key: "appleUserEmail", value: email) }

            userID = id
            authProvider = .apple
            if !name.isEmpty { userName = name }
            if let email { userEmail = email }
            isSignedIn = true

        case .failure:
            break
        }
    }

    // MARK: - Sign In with Google

    func handleGoogleSignIn(_ user: GIDGoogleUser) {
        let id = user.userID ?? ""
        let name = user.profile?.name ?? ""
        let email = user.profile?.email ?? ""

        saveToKeychain(key: "googleUserID", value: id)
        saveToKeychain(key: "googleUserName", value: name)
        saveToKeychain(key: "googleUserEmail", value: email)
        saveToKeychain(key: "authProvider", value: AuthProvider.google.rawValue)

        userID = id
        userName = name.isEmpty ? nil : name
        userEmail = email.isEmpty ? nil : email
        authProvider = .google
        isSignedIn = true
    }

    // MARK: - Sign Out

    func signOut() {
        // Clear Apple keys
        deleteFromKeychain(key: "appleUserID")
        deleteFromKeychain(key: "appleUserName")
        deleteFromKeychain(key: "appleUserEmail")
        // Clear Google keys
        deleteFromKeychain(key: "googleUserID")
        deleteFromKeychain(key: "googleUserName")
        deleteFromKeychain(key: "googleUserEmail")
        // Clear shared keys
        deleteFromKeychain(key: "authProvider")

        if authProvider == .google {
            GIDSignIn.sharedInstance.signOut()
        }

        userID = nil
        userName = nil
        userEmail = nil
        authProvider = nil
        isSignedIn = false
    }

    // MARK: - Restore session on launch

    private func restoreSession() {
        guard let providerRaw = readFromKeychain(key: "authProvider"),
              let provider = AuthProvider(rawValue: providerRaw) else { return }

        switch provider {
        case .google:
            GIDSignIn.sharedInstance.restorePreviousSignIn { [weak self] user, error in
                DispatchQueue.main.async {
                    if let user, error == nil {
                        self?.handleGoogleSignIn(user)
                    }
                }
            }

        case .apple:
            guard let id = readFromKeychain(key: "appleUserID") else { return }
            userID = id
            userName = readFromKeychain(key: "appleUserName")
            userEmail = readFromKeychain(key: "appleUserEmail")
            authProvider = .apple

            let appleProvider = ASAuthorizationAppleIDProvider()
            appleProvider.getCredentialState(forUserID: id) { [weak self] state, _ in
                DispatchQueue.main.async {
                    self?.isSignedIn = (state == .authorized)
                    if state != .authorized { self?.signOut() }
                }
            }
        }
    }

    // MARK: - Keychain helpers

    private func saveToKeychain(key: String, value: String) {
        guard let data = value.data(using: .utf8) else { return }
        let query: [CFString: Any] = [
            kSecClass: kSecClassGenericPassword,
            kSecAttrAccount: key,
            kSecValueData: data,
            kSecAttrAccessible: kSecAttrAccessibleAfterFirstUnlock
        ]
        SecItemDelete(query as CFDictionary)
        SecItemAdd(query as CFDictionary, nil)
    }

    private func readFromKeychain(key: String) -> String? {
        let query: [CFString: Any] = [
            kSecClass: kSecClassGenericPassword,
            kSecAttrAccount: key,
            kSecReturnData: true,
            kSecMatchLimit: kSecMatchLimitOne
        ]
        var result: AnyObject?
        guard SecItemCopyMatching(query as CFDictionary, &result) == errSecSuccess,
              let data = result as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }

    private func deleteFromKeychain(key: String) {
        let query: [CFString: Any] = [
            kSecClass: kSecClassGenericPassword,
            kSecAttrAccount: key
        ]
        SecItemDelete(query as CFDictionary)
    }
}
