import SwiftUI
import AuthenticationServices
import GoogleSignIn

struct SignInView: View {
    @Environment(AuthStore.self) private var authStore
    @Environment(\.dismiss) private var dismiss
    @Environment(\.colorScheme) private var colorScheme
    @State private var appeared = false

    private let features: [(String, String, String)] = [
        ("bookmark.fill",  "Paroisses favorites",    "Sauvegardez les lieux qui vous sont chers"),
        ("bell.fill",      "Rappels de messes",       "Ne manquez plus une célébration"),
        ("person.fill",    "Préférences liturgiques", "Rite, langue, horaires adaptés")
    ]

    var body: some View {
        VStack(spacing: 0) {
            // Top decoration
            ZStack {
                Circle()
                    .fill(Color("Gold").opacity(0.08))
                    .frame(width: 260, height: 260)
                    .blur(radius: 40)
                    .offset(y: -40)

                VStack(spacing: 16) {
                    ZStack {
                        Circle()
                            .fill(
                                LinearGradient(colors: [Color("Gold").opacity(0.2), Color("Gold").opacity(0.05)],
                                               startPoint: .topLeading, endPoint: .bottomTrailing)
                            )
                            .frame(width: 100, height: 100)
                        Image(systemName: "cross.circle.fill")
                            .font(.system(size: 52))
                            .foregroundStyle(
                                LinearGradient(colors: [Color("Gold"), Color("Gold").opacity(0.7)],
                                               startPoint: .top, endPoint: .bottom)
                            )
                            .shadow(color: Color("Gold").opacity(0.3), radius: 12, y: 4)
                    }
                    .scaleEffect(appeared ? 1 : 0.7)
                    .opacity(appeared ? 1 : 0)
                    .animation(.spring(response: 0.5, dampingFraction: 0.65).delay(0.1), value: appeared)

                    VStack(spacing: 6) {
                        Text("GodsPlan")
                            .font(.system(size: 28, weight: .bold, design: .serif))
                        Text("Votre compagnon liturgique")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                    .opacity(appeared ? 1 : 0)
                    .offset(y: appeared ? 0 : 10)
                    .animation(.easeOut(duration: 0.4).delay(0.2), value: appeared)
                }
            }
            .frame(height: 260)

            // Features
            VStack(spacing: 12) {
                ForEach(Array(features.enumerated()), id: \.offset) { idx, feature in
                    HStack(spacing: 14) {
                        ZStack {
                            RoundedRectangle(cornerRadius: 10, style: .continuous)
                                .fill(Color("Gold").opacity(0.12))
                                .frame(width: 40, height: 40)
                            Image(systemName: feature.0)
                                .font(.system(size: 16, weight: .semibold))
                                .foregroundStyle(Color("Gold"))
                        }
                        VStack(alignment: .leading, spacing: 2) {
                            Text(feature.1)
                                .font(.subheadline.weight(.semibold))
                            Text(feature.2)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        Spacer()
                    }
                    .opacity(appeared ? 1 : 0)
                    .offset(x: appeared ? 0 : -20)
                    .animation(.spring(response: 0.5, dampingFraction: 0.8).delay(0.25 + Double(idx) * 0.07), value: appeared)
                }
            }
            .padding(.horizontal, 28)

            Spacer()

            // Auth buttons
            VStack(spacing: 10) {
                // Apple Sign In
                SignInWithAppleButton(.signIn) { request in
                    request.requestedScopes = [.fullName, .email]
                } onCompletion: { result in
                    authStore.handleAuthorization(result)
                }
                .signInWithAppleButtonStyle(colorScheme == .dark ? .white : .black)
                .frame(height: 52)
                .clipShape(RoundedRectangle(cornerRadius: 14))

                // Divider
                orDivider

                // Google Sign In
                googleButton

                Button("Continuer sans compte") { dismiss() }
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .padding(.top, 4)
            }
            .padding(.horizontal, 24)
            .padding(.bottom, 32)
            .opacity(appeared ? 1 : 0)
            .animation(.easeOut(duration: 0.4).delay(0.5), value: appeared)
        }
        .onAppear { appeared = true }
        .onChange(of: authStore.isSignedIn) { _, newValue in
            if newValue { dismiss() }
        }
    }

    // MARK: - Google button

    private var googleButton: some View {
        Button {
            signInWithGoogle()
        } label: {
            HStack(spacing: 10) {
                googleGlyph
                Text("Continuer avec Google")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(.primary)
            }
            .frame(maxWidth: .infinity)
            .frame(height: 52)
            .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 14))
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color.primary.opacity(0.12), lineWidth: 1))
        }
    }

    private var googleGlyph: some View {
        Text("G")
            .font(.system(size: 17, weight: .bold))
            .foregroundStyle(.white)
            .frame(width: 26, height: 26)
            .background(Color(red: 0.26, green: 0.52, blue: 0.96), in: Circle())
    }

    private var orDivider: some View {
        HStack(spacing: 12) {
            Rectangle().fill(Color.primary.opacity(0.12)).frame(height: 1)
            Text("ou")
                .font(.caption.weight(.medium))
                .foregroundStyle(.tertiary)
            Rectangle().fill(Color.primary.opacity(0.12)).frame(height: 1)
        }
    }

    // MARK: - Google sign-in action

    private func signInWithGoogle() {
        guard let rootVC = UIApplication.shared.connectedScenes
            .compactMap({ $0 as? UIWindowScene })
            .first?.windows.first?.rootViewController else { return }

        GIDSignIn.sharedInstance.signIn(withPresenting: rootVC) { result, error in
            guard let user = result?.user, error == nil else { return }
            authStore.handleGoogleSignIn(user)
        }
    }
}
