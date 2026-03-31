import SwiftUI
import SwiftData
import AuthenticationServices

struct ProfileTabView: View {
    @Environment(AuthStore.self) private var authStore
    @Environment(\.modelContext) private var modelContext
    @Query(sort: \SavedChurch.savedAt, order: .reverse) private var savedChurches: [SavedChurch]

    @State private var preferredRite = "Roman"
    @State private var showSignIn = false
    @State private var selectedChurch: ChurchListItem?

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
        }
        .sheet(isPresented: $showSignIn) {
            SignInView()
                .presentationDetents([.large])
        }
    }

    // MARK: - Signed out

    private var signedOutContent: some View {
        VStack(spacing: 28) {
            Spacer()

            ZStack {
                Circle()
                    .fill(Color("Gold").opacity(0.1))
                    .frame(width: 100, height: 100)
                Image(systemName: "person.crop.circle")
                    .font(.system(size: 52))
                    .foregroundStyle(.tertiary)
            }

            VStack(spacing: 8) {
                Text("Non connecté")
                    .font(.title3.weight(.semibold))
                Text("Connectez-vous pour accéder à vos favoris et vos préférences.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 32)
            }

            Button {
                showSignIn = true
            } label: {
                Label("Se connecter avec Apple", systemImage: "apple.logo")
                    .font(.subheadline.weight(.semibold))
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(.primary, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                    .foregroundStyle(Color(UIColor.systemBackground))
            }
            .padding(.horizontal, 32)

            Spacer()
        }
    }

    // MARK: - Signed in

    private var profileContent: some View {
        List {
            // User header
            Section {
                HStack(spacing: 16) {
                    // Avatar
                    ZStack {
                        Circle()
                            .fill(Color("Gold").opacity(0.15))
                            .frame(width: 60, height: 60)
                        Text(initials)
                            .font(.title2.weight(.bold))
                            .foregroundStyle(Color("Gold"))
                    }

                    VStack(alignment: .leading, spacing: 3) {
                        Text(authStore.userName ?? "Utilisateur")
                            .font(.headline)
                        if let email = authStore.userEmail {
                            Text(email)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }

                    Spacer()

                    Image(systemName: "checkmark.seal.fill")
                        .foregroundStyle(Color("Gold"))
                        .font(.title3)
                }
                .padding(.vertical, 6)
            }

            // Preferences
            Section("Préférences") {
                Picker("Rite préféré", selection: $preferredRite) {
                    ForEach(rites, id: \.self) { rite in
                        Text(rite).tag(rite)
                    }
                }
            }

            // Saved churches
            Section {
                if savedChurches.isEmpty {
                    ContentUnavailableView(
                        "Aucune paroisse sauvegardée",
                        systemImage: "bookmark",
                        description: Text("Appuyez sur l'icône marque-page dans le détail d'une église pour la sauvegarder.")
                    )
                    .listRowBackground(Color.clear)
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
                    Text("\(savedChurches.count)")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(Color("Gold"))
                }
            }

            // Sign out
            Section {
                Button(role: .destructive) {
                    authStore.signOut()
                } label: {
                    HStack {
                        Spacer()
                        Text("Se déconnecter")
                        Spacer()
                    }
                }
            }
        }
        .listStyle(.insetGrouped)
    }

    // MARK: - Saved church row

    @ViewBuilder
    private func savedChurchRow(_ saved: SavedChurch) -> some View {
        HStack(spacing: 12) {
            Image(systemName: "building.columns.fill")
                .font(.subheadline)
                .foregroundStyle(Color("Gold"))
                .frame(width: 28)

            VStack(alignment: .leading, spacing: 2) {
                Text(saved.name)
                    .font(.subheadline.weight(.medium))
                Text(saved.address)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }

            Spacer()

            Toggle("", isOn: Binding(
                get: { saved.notificationsEnabled },
                set: { saved.notificationsEnabled = $0 }
            ))
            .labelsHidden()
            .tint(Color("Gold"))
        }
        .padding(.vertical, 2)
    }

    private func deleteSaved(at offsets: IndexSet) {
        for index in offsets {
            modelContext.delete(savedChurches[index])
        }
    }

    private var initials: String {
        let name = authStore.userName ?? ""
        let parts = name.split(separator: " ")
        let letters = parts.prefix(2).compactMap { $0.first }
        return String(letters).uppercased().isEmpty ? "U" : String(letters).uppercased()
    }
}
