import Foundation

@MainActor
public final class CaptchaX: @unchecked Sendable {
    public static let shared = CaptchaX()

    public var config: CaptchaConfig
    @objc public weak var delegate: CaptchaXDelegate?

    private var isInitialized = false
    private let fingerprint: String
    private var sessionToken: String?
    private let networkActor = CaptchaNetworkActor()

    private init() {
        self.config = CaptchaConfig.default
        self.fingerprint = DeviceFingerprint.generate()
    }

    public func initialize(apiKey: String, apiSecret: String) {
        config.apiKey = apiKey
        config.apiSecret = apiSecret
        isInitialized = true

        if config.cacheEnabled {
            CacheManager.shared.cacheEnabled = true
        }

        Task {
            await networkActor.setSigningKey(apiSecret)
        }

        Logger.info("CaptchaX initialized with API Key: \(apiKey.prefix(8))...")
    }

    public func verify(scene: String) async throws -> CaptchaResult {
        guard isInitialized else {
            let error = CaptchaXError.notInitialized
            Logger.error(error.localizedDescription)
            throw error
        }

        guard !config.apiKey.isEmpty else {
            throw CaptchaXError.invalidConfig
        }

        Logger.debug("Starting verification for scene: \(scene)")

        do {
            let result = try await performVerification(scene: scene)
            await MainActor.run {
                self.delegate?.captchaX(self, didSuccess: result)
            }
            return result
        } catch {
            await MainActor.run {
                self.delegate?.captchaX(self, didFailed: error)
            }
            throw error
        }
    }

    public func verify(scene: String, completion: @escaping @Sendable (Result<CaptchaResult, Error>) -> Void) {
        guard isInitialized else {
            let error = CaptchaXError.notInitialized
            Logger.error(error.localizedDescription)
            completion(.failure(error))
            return
        }

        guard !config.apiKey.isEmpty else {
            completion(.failure(CaptchaXError.invalidConfig))
            return
        }

        Logger.debug("Starting verification for scene: \(scene)")

        Task {
            do {
                let result = try await performVerification(scene: scene)
                await MainActor.run {
                    self.delegate?.captchaX(self, didSuccess: result)
                    completion(.success(result))
                }
            } catch {
                await MainActor.run {
                    self.delegate?.captchaX(self, didFailed: error)
                    completion(.failure(error))
                }
            }
        }
    }

    public func verifyWithView(scene: String, captchaType: CaptchaType) async throws -> CaptchaResult {
        return try await verify(scene: scene)
    }

    public func verifyWithView(scene: String, captchaType: CaptchaType, completion: @escaping @Sendable (Result<CaptchaResult, Error>) -> Void) {
        verify(scene: scene, completion: completion)
    }

    public func preload(scene: String) {
        guard config.preloadEnabled else { return }
        Logger.debug("Preloading captcha for scene: \(scene)")

        Task {
            do {
                let endpoint = "\(config.serverURL)/api/v1/captcha/preload"
                let params: [String: Any] = [
                    "appId": config.apiKey,
                    "scene": scene,
                    "fingerprint": fingerprint
                ]

                let _: PreloadResponse = try await networkActor.request(
                    endpoint,
                    method: .POST,
                    params: params,
                    signingKey: config.apiSecret
                )
                Logger.debug("Preload completed for scene: \(scene)")
            } catch {
                Logger.warning("Preload failed: \(error.localizedDescription)")
            }
        }
    }

    public func destroy() {
        Logger.info("Destroying CaptchaX instance")
        isInitialized = false
        sessionToken = nil
        delegate = nil
        CacheManager.shared.clearCache()
    }

    public func getDeviceFingerprint() -> String {
        return fingerprint
    }

    private func performVerification(scene: String) async throws -> CaptchaResult {
        let endpoint = "\(config.serverURL)/api/v1/captcha/verify"

        let deviceInfo = DeviceFingerprint.collect()
        let params: [String: Any] = [
            "appId": config.apiKey,
            "scene": scene,
            "fingerprint": fingerprint,
            "deviceInfo": deviceInfo,
            "timestamp": Int(Date().timeIntervalSince1970 * 1000)
        ]

        let response: VerifyResponse = try await networkActor.request(
            endpoint,
            method: .POST,
            params: params,
            signingKey: config.apiSecret
        )

        guard response.success, let token = response.token else {
            throw CaptchaXError.verificationFailed
        }

        sessionToken = token
        return CaptchaResult(
            token: token,
            expiresAt: response.expiresAt,
            metadata: response.metadata
        )
    }
}

private struct PreloadResponse: Codable, Sendable {
    let success: Bool
    let preloadId: String?
}

private struct VerifyResponse: Codable, Sendable {
    let success: Bool
    let token: String?
    let expiresAt: Date?
    let metadata: [String: String]?
}

public actor CaptchaNetworkActor {
    private let session: URLSession
    private var signingKey: String?

    init() {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30.0
        config.timeoutIntervalForResource = 60.0
        config.requestCachePolicy = .reloadIgnoringLocalCacheData
        self.session = URLSession(configuration: config)
    }

    func setSigningKey(_ key: String) {
        self.signingKey = key
    }

    func request<T: Decodable & Sendable>(
        _ endpoint: String,
        method: HTTPMethod = .GET,
        params: [String: Any]? = nil,
        signingKey: String? = nil
    ) async throws -> T {
        guard let url = URL(string: endpoint) else {
            throw CaptchaXError.invalidConfig
        }

        var request = URLRequest(url: url)
        request.httpMethod = method.rawValue
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("CaptchaX-iOS-SDK/1.0.0", forHTTPHeaderField: "User-Agent")

        if let params = params, method != .GET {
            request.httpBody = try? JSONSerialization.data(withJSONObject: params)
        }

        request = signRequest(request, secret: signingKey ?? self.signingKey ?? "")

        do {
            let (data, response) = try await session.data(for: request)

            guard let httpResponse = response as? HTTPURLResponse else {
                throw CaptchaXError.networkError(underlying: NSError(domain: "CaptchaNetworkActor", code: -1))
            }

            guard (200...299).contains(httpResponse.statusCode) else {
                let message = String(data: data, encoding: .utf8) ?? "Unknown error"
                throw CaptchaXError.serverError(code: httpResponse.statusCode, message: message)
            }

            let decoder = JSONDecoder()
            decoder.dateDecodingStrategy = .iso8601
            return try decoder.decode(T.self, from: data)
        } catch let error as CaptchaXError {
            throw error
        } catch is DecodingError {
            throw CaptchaXError.verificationFailed
        } catch {
            throw CaptchaXError.networkError(underlying: error)
        }
    }

    private func signRequest(_ request: URLRequest, secret: String) -> URLRequest {
        var signedRequest = request

        guard !secret.isEmpty else {
            return signedRequest
        }

        let timestamp = String(Int(Date().timeIntervalSince1970 * 1000))
        let signature = generateSignature(for: request, timestamp: timestamp, secret: secret)

        signedRequest.setValue(timestamp, forHTTPHeaderField: "X-CaptchaX-Timestamp")
        signedRequest.setValue(signature, forHTTPHeaderField: "X-CaptchaX-Signature")

        return signedRequest
    }

    private func generateSignature(for request: URLRequest, timestamp: String, secret: String) -> String {
        let method = request.httpMethod ?? "GET"
        let path = request.url?.path ?? ""
        let body = request.httpBody.flatMap { String(data: $0, encoding: .utf8) } ?? ""

        let stringToSign = "\(method)\(path)\(timestamp)\(body)"
        let key = secret.data(using: .utf8)!

        let signature = stringToSign.hmacSHA256(key: key)
        return signature.base64EncodedString()
    }
}
