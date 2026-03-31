import Foundation

// MARK: - Address

struct Address: Codable, Hashable {
    let street: String?
    let city: String?
    let postalCode: String?
    let district: String?

    var formatted: String {
        [street, postalCode, city].compactMap { $0 }.filter { !$0.isEmpty }.joined(separator: ", ")
    }
}

// MARK: - Contact

struct Contact: Codable, Hashable {
    let phone: String?
    let email: String?
    let website: String?
}

// MARK: - Accessibility

struct Accessibility: Codable, Hashable {
    let wheelchairAccessible: Bool?
    let hearingLoop: Bool?
    let parking: Bool?
    let notes: String?
}

// MARK: - DataSource

struct DataSource: Codable, Hashable {
    let name: String
    let url: String?
    let lastScraped: String?
    let reliability: Int?
}

// MARK: - Church (full detail)

struct Church: Codable, Identifiable, Hashable {
    let id: String
    let name: String
    let description: String?
    let address: Address
    let latitude: String
    let longitude: String
    let contact: Contact?
    let massSchedules: [MassSchedule]
    let rites: [String]
    let languages: [String]
    let accessibility: Accessibility?
    let photos: [String]
    let dataSources: [DataSource]
    let reliabilityScore: Int
    let isActive: Bool?
    let createdAt: String?
    let updatedAt: String?
    let lastVerified: String?

    var lat: Double { Double(latitude) ?? 0 }
    var lng: Double { Double(longitude) ?? 0 }
}
