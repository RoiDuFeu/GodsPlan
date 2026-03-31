import Foundation
import AuthenticationServices
import Observation
import Security

@Observable
final class AuthStore {
    var isSignedIn = false
    var userName: String?
    var userEmail: String?
    var userID: String?

    init() {
        restoreSession()
    }

    // MARK: - Sign In with Apple handler

    func handleAuthorization(_ result: Result<ASAuthorization, Error>) {
        switch result {
        case .success(let auth):
            guard let credential = auth.credential as? ASAuthorizationAppleIDCredential else { return }
            let id = credential.user
            let name = [credential.fullName?.givenName, credential.fullName?.familyName]
                .compactMap { $0 }.joined(separator: " ")
            let email = credential.email

            // Persist to Keychain
            saveToKeychain(key: "appleUserID", value: id)
            if !name.isEmpty { saveToKeychain(key: "appleUserName", value: name) }
            if let email { saveToKeychain(key: "appleUserEmail", value: email) }

            userID = id
            // On subsequent logins Apple may not return name/email — keep existing
            if !name.isEmpty { userName = name }
            if let email { userEmail = email }
            isSignedIn = true

        case .failure:
            break
        }
    }

    // MARK: - Sign Out

    func signOut() {
        deleteFromKeychain(key: "appleUserID")
        deleteFromKeychain(key: "appleUserName")
        deleteFromKeychain(key: "appleUserEmail")
        userID = nil
        userName = nil
        userEmail = nil
        isSignedIn = false
    }

    // MARK: - Restore session on launch

    private func restoreSession() {
        guard let id = readFromKeychain(key: "appleUserID") else { return }
        userID = id
        userName = readFromKeychain(key: "appleUserName")
        userEmail = readFromKeychain(key: "appleUserEmail")

        // Verify the credential is still valid
        let provider = ASAuthorizationAppleIDProvider()
        provider.getCredentialState(forUserID: id) { [weak self] state, _ in
            DispatchQueue.main.async {
                self?.isSignedIn = (state == .authorized)
                if state != .authorized { self?.signOut() }
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
