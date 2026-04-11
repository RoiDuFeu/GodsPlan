import Foundation
import MapKit

struct ChurchCluster: Identifiable, @unchecked Sendable {
    let id: String
    let coordinate: CLLocationCoordinate2D
    let churches: [ChurchListItem]

    var count: Int { churches.count }
    var isSingle: Bool { churches.count == 1 }
    var church: ChurchListItem? { isSingle ? churches.first : nil }
}

enum MapClusterManager {
    /// Groups churches into clusters using a grid-based algorithm.
    /// Only clusters churches within the visible region (+ 50% padding).
    static func cluster(_ churches: [ChurchListItem], cellSize: Double, visibleRegion: MKCoordinateRegion) -> [ChurchCluster] {
        guard !churches.isEmpty else { return [] }

        // Visible bounds with 50% padding to avoid pop-in at edges
        let padLat = visibleRegion.span.latitudeDelta * 0.5
        let padLng = visibleRegion.span.longitudeDelta * 0.5
        let minLat = visibleRegion.center.latitude - visibleRegion.span.latitudeDelta / 2 - padLat
        let maxLat = visibleRegion.center.latitude + visibleRegion.span.latitudeDelta / 2 + padLat
        let minLng = visibleRegion.center.longitude - visibleRegion.span.longitudeDelta / 2 - padLng
        let maxLng = visibleRegion.center.longitude + visibleRegion.span.longitudeDelta / 2 + padLng

        var grid: [String: [ChurchListItem]] = [:]

        for church in churches {
            // Filter to visible region
            guard church.lat >= minLat && church.lat <= maxLat &&
                  church.lng >= minLng && church.lng <= maxLng else { continue }

            let col = Int(floor(church.lng / cellSize))
            let row = Int(floor(church.lat / cellSize))
            let key = "\(col)_\(row)"
            grid[key, default: []].append(church)
        }

        return grid.map { key, group in
            // Single-pass average
            var sumLat = 0.0, sumLng = 0.0
            for c in group { sumLat += c.lat; sumLng += c.lng }
            let n = Double(group.count)
            return ChurchCluster(
                id: key,
                coordinate: CLLocationCoordinate2D(latitude: sumLat / n, longitude: sumLng / n),
                churches: group
            )
        }
    }

    /// Returns a cell size appropriate for the given map span.
    static func cellSize(for span: MKCoordinateSpan) -> Double {
        let delta = max(span.latitudeDelta, span.longitudeDelta)
        return delta / 10.0
    }
}
