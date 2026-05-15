import Foundation

public enum CaptchaType: String, Sendable, CaseIterable {
    case slider
    case click
    case rotate
    case puzzle
    case text
    case icon

    public var displayName: String {
        switch self {
        case .slider: return "滑块验证"
        case .click: return "点选验证"
        case .rotate: return "旋转验证"
        case .puzzle: return "拼图验证"
        case .text: return "文字验证"
        case .icon: return "图标验证"
        }
    }

    public var icon: String {
        switch self {
        case .slider: return "slider.horizontal.3"
        case .click: return "hand.tap"
        case .rotate: return "rotate.right"
        case .puzzle: return "puzzlepiece"
        case .text: return "textformat"
        case .icon: return "square.grid.2x2"
        }
    }

    public var description: String {
        switch self {
        case .slider: return "请滑动完成验证"
        case .click: return "请点击正确的图片"
        case .rotate: return "请旋转图片到正确角度"
        case .puzzle: return "请将拼图移动到正确位置"
        case .text: return "请输入验证码"
        case .icon: return "请选择所有匹配的图标"
        }
    }
}

public enum CaptchaXError: Error, LocalizedError, Sendable {
    case notInitialized
    case networkError(underlying: Error)
    case serverError(code: Int, message: String)
    case timeout
    case invalidConfig
    case verificationFailed
    case cancelled
    case userCancelled

    public var errorDescription: String? {
        switch self {
        case .notInitialized:
            return "CaptchaX has not been initialized. Please call initialize() first."
        case .networkError(let underlying):
            return "Network error: \(underlying.localizedDescription)"
        case .serverError(let code, let message):
            return "Server error [\(code)]: \(message)"
        case .timeout:
            return "Request timed out"
        case .invalidConfig:
            return "Invalid configuration"
        case .verificationFailed:
            return "Verification failed"
        case .cancelled:
            return "Verification was cancelled"
        case .userCancelled:
            return "User cancelled the verification"
        }
    }
}

public struct CaptchaResult: Codable, Sendable {
    public let token: String
    public let expiresAt: Date?
    public let metadata: [String: String]?

    public init(token: String, expiresAt: Date? = nil, metadata: [String: String]? = nil) {
        self.token = token
        self.expiresAt = expiresAt
        self.metadata = metadata
    }

    public var isValid: Bool {
        guard let expiresAt = expiresAt else { return true }
        return expiresAt > Date()
    }
}

public struct UploadResult: Codable, Sendable {
    public let imageId: String
    public let url: String?

    public init(imageId: String, url: String? = nil) {
        self.imageId = imageId
        self.url = url
    }
}
