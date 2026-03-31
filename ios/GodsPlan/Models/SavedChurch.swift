import Foundation
import SwiftData

@Model
final class SavedChurch {
    var churchId: String
    var name: String
    var address: String
    var notificationsEnabled: Bool
    var savedAt: Date

    init(churchId: String, name: String, address: String, notificationsEnabled: Bool = false) {
        self.churchId = churchId
        self.name = name
        self.address = address
        self.notificationsEnabled = notificationsEnabled
        self.savedAt = Date()
    }
}
