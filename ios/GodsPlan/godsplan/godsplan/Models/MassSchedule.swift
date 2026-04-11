import Foundation

struct MassSchedule: Codable, Hashable, Sendable {
    let dayOfWeek: Int   // 0 = Sunday, 6 = Saturday
    let time: String     // "HH:mm"
    let date: String?    // ISO "YYYY-MM-DD" for specific-date masses
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
        // New enum values from backend
        case "Tridentine":        return "Rite tridentin"
        case "Paul VI":           return "Rite romain"
        case "Byzantine":         return "Rite byzantin"
        case "Armenian":          return "Rite arménien"
        case "Maronite":          return "Rite maronite"
        case "Other":             return "Autre"
        // Legacy values (backward compat)
        case "latin_traditional": return "Rite tridentin"
        case "french_paul_vi":    return "Rite romain"
        case "byzantine":         return "Rite byzantin"
        case "armenian":          return "Rite arménien"
        case "maronite":          return "Rite maronite"
        default:                  return rite?.capitalized ?? "Ordinaire"
        }
    }

    var dateFormatted: String? {
        guard let date else { return nil }
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        guard let parsed = formatter.date(from: date) else { return nil }
        formatter.dateFormat = "d MMMM"
        formatter.locale = Locale(identifier: "fr_FR")
        return formatter.string(from: parsed)
    }
}
