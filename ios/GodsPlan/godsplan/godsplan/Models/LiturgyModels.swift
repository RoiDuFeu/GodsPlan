import Foundation

struct LiturgyReading: Decodable, Sendable {
    let title: String
    let reference: String
    let text: String
}

struct LiturgyPsalm: Decodable, Sendable {
    let reference: String
    let refrain: String?
    let text: String
}

struct LiturgyResponse: Decodable, Sendable {
    let id: String
    let date: String
    let liturgicalDay: String?
    let liturgicalColor: String?
    let readings: [LiturgyReading]
    let psalm: LiturgyPsalm?
    let usccbLink: String?

    var parsedDate: Date? {
        ISO8601DateFormatter().date(from: date)
    }
}
