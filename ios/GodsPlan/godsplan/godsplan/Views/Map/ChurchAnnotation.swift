import MapKit

// MARK: - Church type classification

enum ChurchType: String, Sendable {
    case cathedral
    case basilica
    case parish
    case chapel

    var importanceScore: Float {
        switch self {
        case .cathedral: return 1.0
        case .basilica:  return 0.9
        case .parish:    return 0.5
        case .chapel:    return 0.3
        }
    }

    /// Minimum zoom level required for this type to become visible.
    var minimumZoomForVisibility: Double {
        switch self {
        case .cathedral: return 0
        case .basilica:  return 10
        case .parish:    return 13
        case .chapel:    return 15
        }
    }

    var displayPriority: MKFeatureDisplayPriority {
        switch self {
        case .cathedral: return .required
        case .basilica:  return .required
        case .parish:    return .defaultHigh
        case .chapel:    return .defaultLow
        }
    }
}

// MARK: - Church annotation model

final class ChurchAnnotation: MKPointAnnotation {
    let id: String
    let name: String
    let churchType: ChurchType
    let isOpenNow: Bool
    let importanceScore: Float

    /// Screen-space offset applied by the layout solver. Reset each pass.
    var layoutOffset: CGPoint = .zero

    /// Current visibility alpha set by the visibility controller.
    var targetAlpha: CGFloat = 1.0

    /// Current scale set by zoom-adaptive scaling.
    var targetScale: CGFloat = 1.0

    init(
        id: String,
        coordinate: CLLocationCoordinate2D,
        name: String,
        churchType: ChurchType,
        isOpenNow: Bool,
        importanceScore: Float
    ) {
        self.id = id
        self.name = name
        self.churchType = churchType
        self.isOpenNow = isOpenNow
        self.importanceScore = max(0, min(1, importanceScore))
        super.init()
        self.coordinate = coordinate
        self.title = name
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) { fatalError() }

    /// Derives church type from name heuristics.
    static func inferType(from name: String) -> ChurchType {
        let lower = name.lowercased()
        if lower.contains("cathédrale") || lower.contains("cathedral") {
            return .cathedral
        }
        if lower.contains("basilique") || lower.contains("basilica") {
            return .basilica
        }
        if lower.contains("chapelle") || lower.contains("chapel") || lower.contains("oratoire") {
            return .chapel
        }
        return .parish
    }

    /// Factory from ChurchListItem.
    static func from(_ item: ChurchListItem) -> ChurchAnnotation {
        let churchType = inferType(from: item.name)

        // Use type-based importance blended with reliability score
        let typeImportance = churchType.importanceScore
        let reliabilityFactor = Float(min(item.reliabilityScore, 100)) / 100.0
        let importance = typeImportance * 0.7 + reliabilityFactor * 0.3

        let isOpen = item.massSchedules?.contains(where: { schedule in
            let cal = Calendar.current
            let now = Date()
            let weekday = (cal.component(.weekday, from: now) + 5) % 7 // 0=Mon
            guard schedule.dayOfWeek == weekday else { return false }
            let comps = schedule.time.split(separator: ":").compactMap { Int($0) }
            guard comps.count >= 2 else { return false }
            let massMinutes = comps[0] * 60 + comps[1]
            let nowMinutes = cal.component(.hour, from: now) * 60 + cal.component(.minute, from: now)
            return abs(massMinutes - nowMinutes) < 30
        }) ?? false

        return ChurchAnnotation(
            id: item.id,
            coordinate: CLLocationCoordinate2D(latitude: item.lat, longitude: item.lng),
            name: item.name,
            churchType: churchType,
            isOpenNow: isOpen,
            importanceScore: importance
        )
    }
}
