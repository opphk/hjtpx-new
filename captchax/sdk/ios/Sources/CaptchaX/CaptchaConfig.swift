import Foundation

@objc public protocol CaptchaXDelegate: AnyObject {
    func captchaX(_ captcha: CaptchaX, didSuccess result: CaptchaResult)
    func captchaX(_ captcha: CaptchaX, didFailed error: Error)
    func captchaXDidClose(_ captcha: CaptchaX)
}

@MainActor
public struct CaptchaConfig: Sendable {
    public static let developmentURL = "http://localhost:3000"
    public static let productionURL = "https://captchax.example.com"

    public var apiKey: String
    public var apiSecret: String
    public var serverURL: String
    public var timeout: TimeInterval
    public var cacheEnabled: Bool
    public var preloadEnabled: Bool
    public var debugMode: Bool

    public init(
        apiKey: String = "",
        apiSecret: String = "",
        serverURL: String = CaptchaConfig.productionURL,
        timeout: TimeInterval = 30.0,
        cacheEnabled: Bool = true,
        preloadEnabled: Bool = true,
        debugMode: Bool = false
    ) {
        self.apiKey = apiKey
        self.apiSecret = apiSecret
        self.serverURL = serverURL
        self.timeout = timeout
        self.cacheEnabled = cacheEnabled
        self.preloadEnabled = preloadEnabled
        self.debugMode = debugMode
    }

    public static var `default`: CaptchaConfig {
        return CaptchaConfig()
    }

    public static var development: CaptchaConfig {
        return CaptchaConfig(serverURL: developmentURL, debugMode: true)
    }

    public static var production: CaptchaConfig {
        return CaptchaConfig(serverURL: productionURL, debugMode: false)
    }

    public func validate() -> Result<Void, CaptchaXError> {
        if apiKey.isEmpty {
            return .failure(.invalidConfig)
        }
        if !serverURL.isValidURL() {
            return .failure(.invalidConfig)
        }
        return .success(())
    }
}
