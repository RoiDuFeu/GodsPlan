import SwiftUI
import AuthenticationServices

struct SignInView: View {
    @Environment(AuthStore.self) private var authStore
    @Environment(\.dismiss) private var dismiss
    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        VStack(spacing: 32) {
            Spacer()

            // Icon
            ZStack {
                Circle()
                    .fill(Color("Gold").opacity(0.12))
                    .frame(width: 90, height: 90)
                Image(systemName: "cross.circle.fill")
                    .font(.system(size: 44))
                    .foregroundStyle(Color("Gold"))
            }

            VStack(spacing: 10) {
                Text("GodsPlan")
                    .font(.title.weight(.bold))

                Text("Connectez-vous pour sauvegarder vos paroisses et recevoir des notifications.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 24)
            }

            // Feature list
            VStack(alignment: .leading, spacing: 12) {
                featureRow(icon: "bookmark.fill", text: "Sauvegarder vos paroisses favorites")
                featureRow(icon: "bell.fill", text: "Recevoir des rappels pour les messes")
                featureRow(icon: "person.fill", text: "Gérer vos préférences liturgiques")
            }
            .padding(.horizontal, 32)

            Spacer()

            // Sign in with Apple button
            SignInWithAppleButton(.signIn) { request in
                request.requestedScopes = [.fullName, .email]
            } onCompletion: { result in
                authStore.handleAuthorization(result)
                if authStore.isSignedIn { dismiss() }
            }
            .signInWithAppleButtonStyle(colorScheme == .dark ? .white : .black)
            .frame(height: 50)
            .padding(.horizontal, 24)

            Button("Continuer sans compte") {
                dismiss()
            }
            .font(.subheadline)
            .foregroundStyle(.secondary)
            .padding(.bottom, 8)
        }
        .padding(.bottom, 20)
    }

    private func featureRow(icon: String, text: String) -> some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.subheadline)
                .foregroundStyle(Color("Gold"))
                .frame(width: 24)
            Text(text)
                .font(.subheadline)
                .foregroundStyle(.primary)
        }
    }
}
