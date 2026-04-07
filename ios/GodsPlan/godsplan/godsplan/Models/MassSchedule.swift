import Foundation

struct MassSchedule: Codable, Hashable, Sendable {
    let dayOfWeek: Int   // 0 = Sunday, 6 = Saturday
    let time: String     // "HH:mm"
    let rite: String?
    let language: String?
    let notes: String?

    var dayName: String {
        let days = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"]
        guard dayOfWeek >= 0 && dayOfWeek < days.count else { return "?" }
        return days[dayOfWeek]
    }

    var riteFormatted: String {
        switch rite {
        case "latin_traditional": return "Rite latin"
        case "french_paul_vi":    return "Rite romain"
        case "byzantine":         return "Rite byzantin"
        case "armenian":          return "Rite arménien"
        case "maronite":          return "Rite maronite"
        default:                  return rite?.capitalized ?? "Ordinaire"
        }
    }
}
