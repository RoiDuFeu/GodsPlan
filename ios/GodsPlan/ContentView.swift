import SwiftUI

struct ContentView: View {
    @Environment(ChurchStore.self) private var churchStore
    @Environment(AuthStore.self) private var authStore

    var body: some View {
        TabView {
            Tab("Carte", systemImage: "mappin.circle.fill") {
                MapTabView()
            }

            Tab("Églises", systemImage: "building.columns.fill") {
                ListTabView()
            }

            Tab("Lectures", systemImage: "book.fill") {
                LecturesTabView()
            }

            Tab("Profil", systemImage: "person.fill") {
                ProfileTabView()
            }
        }
        .tint(Color("Gold"))
        .task {
            await churchStore.loadChurches()
        }
    }
}
