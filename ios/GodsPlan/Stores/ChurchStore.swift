import Foundation
import CoreLocation
import Observation

@Observable
final class ChurchStore {
    var churches: [ChurchListItem] = []
    var selectedChurchId: String?
    var selectedChurch: Church?
    var isLoading = false
    var isLoadingDetail = false
    var error: String?
    var searchQuery = ""
    var userLocation: CLLocationCoordinate2D?

    var filteredChurches: [ChurchListItem] {
        guard !searchQuery.isEmpty else { return churches }
        let q = searchQuery.lowercased()
        return churches.filter {
            $0.name.lowercased().contains(q) ||
            ($0.address.city?.lowercased().contains(q) ?? false) ||
            ($0.address.street?.lowercased().contains(q) ?? false) ||
            ($0.address.postalCode?.contains(q) ?? false)
        }
    }

    // MARK: - Load all churches

    func loadChurches() async {
        guard churches.isEmpty else { return }
        isLoading = true
        error = nil
        do {
            churches = try await APIService.shared.fetchChurches(limit: 200)
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }

    // MARK: - Load nearby

    func loadNearby(lat: Double, lng: Double) async {
        isLoading = true
        error = nil
        do {
            let nearby = try await APIService.shared.fetchNearby(lat: lat, lng: lng, radius: 5)
            // Merge nearby results at the top, keeping rest
            let nearbyIds = Set(nearby.map { $0.id })
            let rest = churches.filter { !nearbyIds.contains($0.id) }
            churches = nearby + rest
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }

    // MARK: - Select church (load detail)

    func selectChurch(id: String) async {
        selectedChurchId = id
        selectedChurch = nil
        isLoadingDetail = true
        do {
            selectedChurch = try await APIService.shared.fetchChurch(id: id)
        } catch {
            self.error = error.localizedDescription
        }
        isLoadingDetail = false
    }

    func clearSelection() {
        selectedChurchId = nil
        selectedChurch = nil
    }
}
