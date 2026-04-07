import SwiftUI
import SwiftData
import AuthenticationServices
import GoogleSignIn

struct ProfileTabView: View {
    @Environment(AuthStore.self) private var authStore
    @Environment(\.modelContext) private var modelContext
    @Environment(\.colorScheme) private var colorScheme
    @Query(sort: \SavedChurch.savedAt, order: .reverse) private var savedChurches: [SavedChurch]

    @AppStorage("darkModeEnabled") private var darkModeEnabled = false
    @State private var preferredRite = "Roman"

    private let rites = ["Roman", "Tridentin", "Byzantin"]

    var body: some View {
        NavigationStack {
            Group {
                if authStore.isSignedIn {
                    profileContent
                } else {
                    signedOutContent
                }
            }
            .navigationTitle("Profil")
            .navigationBarTitleDisplayMode(.large)
        }
    }

    // MARK: - Signed out

    private var signedOutContent: some View {
        VStack(spacing: 0) {
            Spacer()

            VStack(spacing: 28) {
                // Icon
                ZStack {
                    Circle()
                        .fill(Color("Gold").opacity(0.08))
                        .frame(width: 110, height: 110)
                    Image(systemName: "person.crop.circle.dashed")
                        .font(.system(size: 54))
                        .foregroundStyle(.tertiary)
                }

                VStack(spacing: 8) {
                    Text("Bienvenue")
                        .font(.title2.weight(.bold))
                    Text("Connectez-vous pour retrouver vos paroisses favorites et personnaliser votre expérience.")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 24)
                }

                // Auth buttons
                VStack(spacing: 10) {
                    // Native Apple Sign In button
                    SignInWithAppleButton(.signIn) { request in
                        request.requestedScopes = [.fullName, .email]
                    } onCompletion: { result in
                        authStore.handleAuthorization(result)
                    }
                    .signInWithAppleButtonStyle(colorScheme == .dark ? .white : .black)
                    .frame(height: 52)
                    .clipShape(RoundedRectangle(cornerRadius: 14))

                    // Divider
                    HStack(spacing: 12) {
                        Rectangle().fill(Color.primary.opacity(0.12)).frame(height: 1)
                        Text("ou")
                            .font(.caption.weight(.medium))
                            .foregroundStyle(.tertiary)
                        Rectangle().fill(Color.primary.opacity(0.12)).frame(height: 1)
                    }

                    // Google Sign In button
                    Button { signInWithGoogle() } label: {
                        HStack(spacing: 10) {
                            Text("G")
                                .font(.system(size: 17, weight: .bold))
                                .foregroundStyle(.white)
                                .frame(width: 26, height: 26)
                                .background(Color(red: 0.26, green: 0.52, blue: 0.96), in: Circle())
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
                .padding(.horizontal, 32)
            }

            Spacer()
        }
    }

    // MARK: - Signed in

    private var profileContent: some View {
        List {
            // ── Avatar header ──
            Section {
                HStack(spacing: 16) {
                    // Avatar with provider badge
                    ZStack(alignment: .bottomTrailing) {
                        Circle()
                            .fill(
                                LinearGradient(colors: [Color("Gold").opacity(0.25), Color("Gold").opacity(0.08)],
                                               startPoint: .topLeading, endPoint: .bottomTrailing)
                            )
                            .frame(width: 64, height: 64)
                        Text(initials)
                            .font(.title2.weight(.bold))
                            .foregroundStyle(Color("Gold"))
                            .frame(width: 64, height: 64)

                        providerBadge
                    }

                    VStack(alignment: .leading, spacing: 4) {
                        HStack(spacing: 6) {
                            Text(authStore.userName ?? "Utilisateur")
                                .font(.headline)
                            Image(systemName: "checkmark.seal.fill")
                                .font(.caption)
                                .foregroundStyle(Color("Gold"))
                        }
                        if let email = authStore.userEmail {
                            Text(email)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        Text("Membre GodsPlan")
                            .font(.caption2)
                            .foregroundStyle(Color("Gold").opacity(0.8))
                    }
                    Spacer()
                }
                .padding(.vertical, 8)
            }
            .listRowBackground(
                RoundedRectangle(cornerRadius: 14)
                    .fill(Color("Gold").opacity(0.05))
                    .padding(.horizontal, -2)
            )

            // ── Preferences ──
            Section("Préférences liturgiques") {
                Picker("Rite préféré", selection: $preferredRite) {
                    ForEach(rites, id: \.self) { Text($0).tag($0) }
                }
                .tint(Color("Gold"))
            }

            // ── Appearance ──
            Section("Apparence") {
                Toggle(isOn: $darkModeEnabled) {
                    Label("Mode sombre", systemImage: darkModeEnabled ? "moon.fill" : "sun.max.fill")
                }
                .tint(Color("Gold"))
            }

            // ── Saved churches ──
            Section {
                if savedChurches.isEmpty {
                    VStack(spacing: 10) {
                        Image(systemName: "bookmark.slash")
                            .font(.system(size: 28))
                            .foregroundStyle(.quaternary)
                        Text("Aucune paroisse sauvegardée")
                            .font(.subheadline.weight(.medium))
                        Text("Appuyez sur le marque-page dans le détail d'une église.")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            .multilineTextAlignment(.center)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 20)
                    .listRowBackground(EmptyView())
                } else {
                    ForEach(savedChurches) { saved in
                        savedChurchRow(saved)
                    }
                    .onDelete(perform: deleteSaved)
                }
            } header: {
                HStack {
                    Text("Paroisses sauvegardées")
                    Spacer()
                    if !savedChurches.isEmpty {
                        Text("\(savedChurches.count)")
                            .font(.caption.weight(.bold))
                            .foregroundStyle(Color("Gold"))
                            .padding(.horizontal, 7)
                            .padding(.vertical, 2)
                            .background(Color("Gold").opacity(0.12), in: Capsule())
                    }
                }
            }

            // ── Sign out ──
            Section {
                Button(role: .destructive) {
                    withAnimation { authStore.signOut() }
                } label: {
                    HStack {
                        Spacer()
                        Label("Se déconnecter", systemImage: "rectangle.portrait.and.arrow.right")
                        Spacer()
                    }
                }
            }
        }
        .listStyle(.insetGrouped)
    }

    // MARK: - Provider badge

    @ViewBuilder
    private var providerBadge: some View {
        ZStack {
            Circle()
                .fill(Color(UIColor.systemBackground))
                .frame(width: 22, height: 22)
            switch authStore.authProvider {
            case .apple:
                Image(systemName: "apple.logo")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(.primary)
            case .google:
                Text("G")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundStyle(Color(red: 0.26, green: 0.52, blue: 0.96))
            case .none:
                EmptyView()
            }
        }
        .offset(x: 4, y: 4)
    }

    // MARK: - Saved church row

    @ViewBuilder
    private func savedChurchRow(_ saved: SavedChurch) -> some View {
        HStack(spacing: 12) {
            ZStack {
                RoundedRectangle(cornerRadius: 8, style: .continuous)
                    .fill(Color("Gold").opacity(0.1))
                    .frame(width: 34, height: 34)
                Image(systemName: "building.columns.fill")
                    .font(.system(size: 14))
                    .foregroundStyle(Color("Gold"))
            }

            VStack(alignment: .leading, spacing: 2) {
                Text(saved.name)
                    .font(.subheadline.weight(.medium))
                    .lineLimit(1)
                Text(saved.address)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }

            Spacer()

            VStack(alignment: .trailing, spacing: 4) {
                Toggle("", isOn: Binding(
                    get: { saved.notificationsEnabled },
                    set: { saved.notificationsEnabled = $0 }
                ))
                .labelsHidden()
                .tint(Color("Gold"))
                .scaleEffect(0.85, anchor: .trailing)

                Text(saved.notificationsEnabled ? "Notifs activées" : "Notifs off")
                    .font(.system(size: 9, weight: .medium))
                    .foregroundStyle(saved.notificationsEnabled ? Color("Gold") : .secondary)
            }
        }
        .padding(.vertical, 4)
    }

    private func deleteSaved(at offsets: IndexSet) {
        for index in offsets { modelContext.delete(savedChurches[index]) }
    }

    private var initials: String {
        let name = authStore.userName ?? ""
        let letters = name.split(separator: " ").prefix(2).compactMap { $0.first }
        let result = String(letters).uppercased()
        return result.isEmpty ? "U" : result
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
