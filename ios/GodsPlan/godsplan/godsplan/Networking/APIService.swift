import Foundation

// MARK: - Auth response models

struct AuthUser: Decodable {
    let id: String
    let name: String?
    let email: String?
    let provider: String
}

struct AuthResponse: Decodable {
    let token: String
    let user: AuthUser
}

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

    private let session: URLSession = {
        let config = URLSessionConfiguration.default
        config.waitsForConnectivity = true
        config.timeoutIntervalForResource = 30
        return URLSession(configuration: config)
    }()

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

    // MARK: Auth

    func authenticateApple(identityToken: String, name: String?, email: String?) async throws -> AuthResponse {
        let url = URL(string: "\(base)/auth/apple")!
        var body: [String: Any] = ["identityToken": identityToken]
        if let name, !name.isEmpty { body["name"] = name }
        if let email, !email.isEmpty { body["email"] = email }
        return try await post(url, body: body, as: AuthResponse.self)
    }

    func authenticateGoogle(idToken: String) async throws -> AuthResponse {
        let url = URL(string: "\(base)/auth/google")!
        let body: [String: Any] = ["idToken": idToken]
        return try await post(url, body: body, as: AuthResponse.self)
    }

    // MARK: Device Token

    func registerDeviceToken(_ token: String, jwt: String) async throws {
        let url = URL(string: "\(base)/notifications/device-token")!
        let body: [String: Any] = ["token": token, "platform": "ios"]
        try await authenticatedPost(url, body: body, jwt: jwt)
    }

    func unregisterDeviceToken(_ token: String, jwt: String) async throws {
        let url = URL(string: "\(base)/notifications/device-token")!
        let body: [String: Any] = ["token": token]
        try await authenticatedDelete(url, body: body, jwt: jwt)
    }

    // MARK: Preferences

    func getPreferences(jwt: String) async throws -> UserPreferencesResponse {
        let url = URL(string: "\(base)/preferences")!
        return try await authenticatedGet(url, as: UserPreferencesResponse.self, jwt: jwt)
    }

    func updatePreferences(_ prefs: UserPreferencesPayload, jwt: String) async throws -> UserPreferencesResponse {
        let url = URL(string: "\(base)/preferences")!
        let body = prefs.toDict()
        return try await authenticatedPut(url, body: body, as: UserPreferencesResponse.self, jwt: jwt)
    }

    // MARK: Private helpers

    private func post<T: Decodable>(_ url: URL, body: [String: Any], as type: T.Type) async throws -> T {
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        do {
            let (data, response) = try await session.data(for: request)
            guard let http = response as? HTTPURLResponse else {
                throw APIError.invalidResponse(0)
            }
            guard (200...299).contains(http.statusCode) else {
                throw APIError.invalidResponse(http.statusCode)
            }
            return try decoder.decode(type, from: data)
        } catch let error as APIError {
            throw error
        } catch let error as DecodingError {
            throw APIError.decodingError(error)
        } catch {
            throw APIError.networkError(error)
        }
    }

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
            let (data, response) = try await session.data(from: url)
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

    // MARK: Authenticated helpers

    private func authenticatedGet<T: Decodable>(_ url: URL, as type: T.Type, jwt: String) async throws -> T {
        var request = URLRequest(url: url)
        request.setValue("Bearer \(jwt)", forHTTPHeaderField: "Authorization")
        do {
            let (data, response) = try await session.data(for: request)
            guard let http = response as? HTTPURLResponse,
                  (200...299).contains(http.statusCode) else {
                let code = (response as? HTTPURLResponse)?.statusCode ?? 0
                throw APIError.invalidResponse(code)
            }
            return try decoder.decode(type, from: data)
        } catch let error as APIError {
            throw error
        } catch let error as DecodingError {
            throw APIError.decodingError(error)
        } catch {
            throw APIError.networkError(error)
        }
    }

    @discardableResult
    private func authenticatedPost(_ url: URL, body: [String: Any], jwt: String) async throws -> Data {
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(jwt)", forHTTPHeaderField: "Authorization")
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse,
              (200...299).contains(http.statusCode) else {
            let code = (response as? HTTPURLResponse)?.statusCode ?? 0
            throw APIError.invalidResponse(code)
        }
        return data
    }

    private func authenticatedPut<T: Decodable>(_ url: URL, body: [String: Any], as type: T.Type, jwt: String) async throws -> T {
        var request = URLRequest(url: url)
        request.httpMethod = "PUT"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(jwt)", forHTTPHeaderField: "Authorization")
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        do {
            let (data, response) = try await session.data(for: request)
            guard let http = response as? HTTPURLResponse,
                  (200...299).contains(http.statusCode) else {
                let code = (response as? HTTPURLResponse)?.statusCode ?? 0
                throw APIError.invalidResponse(code)
            }
            return try decoder.decode(type, from: data)
        } catch let error as APIError {
            throw error
        } catch let error as DecodingError {
            throw APIError.decodingError(error)
        } catch {
            throw APIError.networkError(error)
        }
    }

    @discardableResult
    private func authenticatedDelete(_ url: URL, body: [String: Any], jwt: String) async throws -> Data {
        var request = URLRequest(url: url)
        request.httpMethod = "DELETE"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(jwt)", forHTTPHeaderField: "Authorization")
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse,
              (200...299).contains(http.statusCode) else {
            let code = (response as? HTTPURLResponse)?.statusCode ?? 0
            throw APIError.invalidResponse(code)
        }
        return data
    }
}

// MARK: - Preference Models

struct UserPreferencesResponse: Decodable {
    let subscribedChurches: [String]
    let language: String
    let theme: String
    let reminderEnabled: Bool
    let reminderTime: String
}

struct UserPreferencesPayload {
    var subscribedChurches: [String]?
    var language: String?
    var theme: String?
    var reminderEnabled: Bool?
    var reminderTime: String?

    func toDict() -> [String: Any] {
        var dict: [String: Any] = [:]
        if let v = subscribedChurches { dict["subscribedChurches"] = v }
        if let v = language { dict["language"] = v }
        if let v = theme { dict["theme"] = v }
        if let v = reminderEnabled { dict["reminderEnabled"] = v }
        if let v = reminderTime { dict["reminderTime"] = v }
        return dict
    }
}
