//
//  Item.swift
//  godsplan
//
//  Created by Marc Belleperche on 29/03/2026.
//

import Foundation
import SwiftData

@Model
final class Item {
    var timestamp: Date
    
    init(timestamp: Date) {
        self.timestamp = timestamp
    }
}
