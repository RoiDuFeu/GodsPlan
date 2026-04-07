import Foundation

// MARK: - Response wrappers

private struct ListResponse<T: Decodable>: Decodable {
    let data: [T]
}

private struct SingleResponse<T: Decodable>: Decodable {
    let data: T?
    // Some endpoints return the object directly — handled via fallback
}

// MARK: - API Errors

enum APIError: LocalizedError {
    case invalidURL
    case invalidResponse(Int)
    case decodingError(Error)
    case networkError(Error)

    var errorDescription: String? {
        switch self {
        case .invalidURL: return "URL invalide."
        case .invalidResponse(let code): return "Réponse inattendue du serveur (\(code))."
        case .decodingError(let e): return "Erreur de décodage : \(e.localizedDescription)"
        case .networkError(let e): return "Erreur réseau : \(e.localizedDescription)"
        }
    }
}

// MARK: - APIService

actor APIService {
    static let shared = APIService()

    private let base = "https://godsplan-api.montparnas.fr/api/v1"

    private let decoder: JSONDecoder = {
        let d = JSONDecoder()
        d.keyDecodingStrategy = .convertFromSnakeCase
        return d
    }()

    // MARK: Churches

    func fetchChurches(limit: Int = 100, offset: Int = 0) async throws -> [ChurchListItem] {
        var components = URLComponents(string: "\(base)/churches-simple")!
        components.queryItems = [
            .init(name: "limit", value: "\(limit)"),
            .init(name: "offset", value: "\(offset)")
        ]
        return try await get(components.url!, as: ListResponse<ChurchListItem>.self).data
    }

    func fetchNearby(lat: Double, lng: Double, radius: Double = 5, limit: Int = 50) async throws -> [ChurchListItem] {
        var components = URLComponents(string: "\(base)/churches-simple/nearby")!
        components.queryItems = [
            .init(name: "lat", value: "\(lat)"),
            .init(name: "lng", value: "\(lng)"),
            .init(name: "radius", value: "\(radius)"),
            .init(name: "limit", value: "\(limit)")
        ]
        return try await get(components.url!, as: ListResponse<ChurchListItem>.self).data
    }

    func fetchChurch(id: String) async throws -> Church {
        let url = URL(string: "\(base)/churches-simple/\(id)")!
        // The detail endpoint may return the object directly or wrapped
        let data = try await rawData(for: url)
        // Try direct decode first, then wrapped
        if let church = try? decoder.decode(Church.self, from: data) {
            return church
        }
        let wrapped = try decoder.decode(SingleResponse<Church>.self, from: data)
        guard let church = wrapped.data else {
            throw APIError.invalidResponse(0)
        }
        return church
    }

    // MARK: Liturgy

    func fetchTodayLiturgy() async throws -> LiturgyResponse {
        let url = URL(string: "\(base)/liturgy/today")!
        return try await get(url, as: LiturgyResponse.self)
    }

    // MARK: Private helpers

    private func get<T: Decodable>(_ url: URL, as type: T.Type) async throws -> T {
        let data = try await rawData(for: url)
        do {
            return try decoder.decode(type, from: data)
        } catch {
            throw APIError.decodingError(error)
        }
    }

    private func rawData(for url: URL) async throws -> Data {
        do {
            let (data, response) = try await URLSession.shared.data(from: url)
            guard let http = response as? HTTPURLResponse else {
                throw APIError.invalidResponse(0)
            }
            guard (200...299).contains(http.statusCode) else {
                throw APIError.invalidResponse(http.statusCode)
            }
            return data
        } catch let error as APIError {
            throw error
        } catch {
            throw APIError.networkError(error)
        }
    }
}
