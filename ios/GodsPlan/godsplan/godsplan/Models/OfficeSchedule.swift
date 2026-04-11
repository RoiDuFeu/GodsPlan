import Foundation

struct OfficeSchedule: Codable, Hashable, Sendable {
    let type: String        // "confession" | "adoration" | "vespers" | "lauds" | "other"
    let dayOfWeek: Int      // 0 = Sunday, 6 = Saturday
    let startTime: String   // "HH:mm"
    let endTime: String?    // "HH:mm"
    let date: String?       // ISO "YYYY-MM-DD"
    let notes: String?

    var dayName: String {
        let days = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"]
        guard dayOfWeek >= 0 && dayOfWeek < days.count else { return "?" }
        return days[dayOfWeek]
    }

    var typeName: String {
        switch type {
        case "confession": return "Confession"
        case "adoration":  return "Adoration"
        case "vespers":    return "Vêpres"
        case "lauds":      return "Laudes"
        default:           return "Autre"
        }
    }

    var typeIcon: String {
        switch type {
        case "confession": return "person.and.background.dotted"
        case "adoration":  return "flame.fill"
        case "vespers":    return "moon.stars.fill"
        case "lauds":      return "sunrise.fill"
        default:           return "calendar.badge.clock"
        }
    }

    var timeFormatted: String {
        if let end = endTime, !end.isEmpty {
            return "\(startTime) – \(end)"
        }
        return startTime
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
