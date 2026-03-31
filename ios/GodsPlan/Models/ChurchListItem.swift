import Foundation

struct ChurchListItem: Codable, Identifiable, Hashable {
    let id: String
    let name: String
    let address: Address
    let latitude: String
    let longitude: String
    let reliabilityScore: Int
    let distanceKm: Double?
    let massSchedules: [MassSchedule]?

    var lat: Double { Double(latitude) ?? 0 }
    var lng: Double { Double(longitude) ?? 0 }

    var nextMassTime: String? {
        guard let schedules = massSchedules, !schedules.isEmpty else { return nil }
        let calendar = Calendar.current
        let today = calendar.component(.weekday, from: Date()) - 1 // 0=Sun
        let sorted = schedules.sorted {
            let aDiff = ($0.dayOfWeek - today + 7) % 7
            let bDiff = ($1.dayOfWeek - today + 7) % 7
            if aDiff == bDiff { return $0.time < $1.time }
            return aDiff < bDiff
        }
        return sorted.first?.time
    }

    var distanceFormatted: String? {
        guard let km = distanceKm else { return nil }
        if km < 1 { return String(format: "%.0f m", km * 1000) }
        return String(format: "%.1f km", km)
    }
}
