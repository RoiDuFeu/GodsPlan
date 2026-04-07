import Foundation
import MapKit

struct ChurchCluster: Identifiable {
    let id: String
    let coordinate: CLLocationCoordinate2D
    let churches: [ChurchListItem]

    var count: Int { churches.count }
    var isSingle: Bool { churches.count == 1 }
    var church: ChurchListItem? { isSingle ? churches.first : nil }
}

enum MapClusterManager {
    /// Groups churches into clusters using a grid-based algorithm.
    /// `cellSize` is in degrees — smaller values produce finer clusters.
    static func cluster(_ churches: [ChurchListItem], cellSize: Double) -> [ChurchCluster] {
        guard !churches.isEmpty else { return [] }

        var grid: [String: [ChurchListItem]] = [:]

        for church in churches {
            let col = Int(floor(church.lng / cellSize))
            let row = Int(floor(church.lat / cellSize))
            let key = "\(col)_\(row)"
            grid[key, default: []].append(church)
        }

        return grid.map { key, group in
            let avgLat = group.reduce(0.0) { $0 + $1.lat } / Double(group.count)
            let avgLng = group.reduce(0.0) { $0 + $1.lng } / Double(group.count)
            return ChurchCluster(
                id: key,
                coordinate: CLLocationCoordinate2D(latitude: avgLat, longitude: avgLng),
                churches: group
            )
        }
    }

    /// Returns a cell size appropriate for the given map span.
    static func cellSize(for span: MKCoordinateSpan) -> Double {
        let delta = max(span.latitudeDelta, span.longitudeDelta)
        // Aim for roughly 8-12 cells across the visible area
        return delta / 10.0
    }
}
