import XCTest
@testable import CaptchaX

final class CaptchaXTests: XCTestCase {

    override func setUp() {
        super.setUp()
        CaptchaX.shared.initialize(apiKey: "test_api_key", apiSecret: "test_api_secret")
    }

    override func tearDown() {
        CaptchaX.shared.destroy()
        super.tearDown()
    }

    func testInitialization() {
        XCTAssertNotNil(CaptchaX.shared)
        XCTAssertEqual(CaptchaX.shared.config.apiKey, "test_api_key")
        XCTAssertEqual(CaptchaX.shared.config.apiSecret, "test_api_secret")
    }

    func testDeviceFingerprint() {
        let fingerprint = CaptchaX.shared.getDeviceFingerprint()
        XCTAssertFalse(fingerprint.isEmpty)
        XCTAssertEqual(fingerprint.count, 64)
    }

    func testCaptchaTypeProperties() {
        let sliderType = CaptchaType.slider
        XCTAssertEqual(sliderType.displayName, "滑块验证")
        XCTAssertEqual(sliderType.icon, "slider.horizontal.3")
        XCTAssertEqual(sliderType.description, "请滑动完成验证")

        let clickType = CaptchaType.click
        XCTAssertEqual(clickType.displayName, "点选验证")
        XCTAssertEqual(clickType.icon, "hand.tap")
        XCTAssertEqual(clickType.description, "请点击正确的图片")

        let rotateType = CaptchaType.rotate
        XCTAssertEqual(rotateType.displayName, "旋转验证")
        XCTAssertEqual(rotateType.icon, "rotate.right")
        XCTAssertEqual(rotateType.description, "请旋转图片到正确角度")

        let puzzleType = CaptchaType.puzzle
        XCTAssertEqual(puzzleType.displayName, "拼图验证")
        XCTAssertEqual(puzzleType.icon, "puzzlepiece")
        XCTAssertEqual(puzzleType.description, "请将拼图移动到正确位置")

        let textType = CaptchaType.text
        XCTAssertEqual(textType.displayName, "文字验证")
        XCTAssertEqual(textType.icon, "textformat")
        XCTAssertEqual(textType.description, "请输入验证码")

        let iconType = CaptchaType.icon
        XCTAssertEqual(iconType.displayName, "图标验证")
        XCTAssertEqual(iconType.icon, "square.grid.2x2")
        XCTAssertEqual(iconType.description, "请选择所有匹配的图标")
    }

    func testCaptchaTypeAllCases() {
        let allCases = CaptchaType.allCases
        XCTAssertEqual(allCases.count, 6)
        XCTAssertTrue(allCases.contains(.slider))
        XCTAssertTrue(allCases.contains(.click))
        XCTAssertTrue(allCases.contains(.rotate))
        XCTAssertTrue(allCases.contains(.puzzle))
        XCTAssertTrue(allCases.contains(.text))
        XCTAssertTrue(allCases.contains(.icon))
    }

    func testCaptchaResult() {
        let result = CaptchaResult(
            token: "test_token_123",
            expiresAt: Date().adding(minutes: 5),
            metadata: ["key": "value"]
        )

        XCTAssertEqual(result.token, "test_token_123")
        XCTAssertTrue(result.isValid)
        XCTAssertEqual(result.metadata?["key"], "value")
    }

    func testCaptchaResultExpired() {
        let result = CaptchaResult(
            token: "test_token_123",
            expiresAt: Date().adding(minutes: -1)
        )

        XCTAssertFalse(result.isValid)
    }

    func testCaptchaResultNoExpiration() {
        let result = CaptchaResult(token: "test_token_123")
        XCTAssertTrue(result.isValid)
    }

    func testCaptchaConfigDefault() {
        let config = CaptchaConfig.default
        XCTAssertEqual(config.serverURL, CaptchaConfig.productionURL)
        XCTAssertEqual(config.timeout, 30.0)
        XCTAssertTrue(config.cacheEnabled)
        XCTAssertTrue(config.preloadEnabled)
        XCTAssertFalse(config.debugMode)
    }

    func testCaptchaConfigDevelopment() {
        let config = CaptchaConfig.development
        XCTAssertEqual(config.serverURL, CaptchaConfig.developmentURL)
        XCTAssertTrue(config.debugMode)
    }

    func testCaptchaConfigProduction() {
        let config = CaptchaConfig.production
        XCTAssertEqual(config.serverURL, CaptchaConfig.productionURL)
        XCTAssertFalse(config.debugMode)
    }

    func testCaptchaConfigValidation() {
        let validConfig = CaptchaConfig(apiKey: "test", serverURL: "https://example.com")
        let result = validConfig.validate()
        XCTAssertTrue(result.isSuccess)

        let invalidConfig = CaptchaConfig(apiKey: "")
        let invalidResult = invalidConfig.validate()
        XCTAssertFalse(invalidResult.isSuccess)
    }

    func testErrorTypes() {
        let notInitializedError = CaptchaXError.notInitialized
        XCTAssertEqual(notInitializedError.errorDescription, "CaptchaX has not been initialized. Please call initialize() first.")

        let timeoutError = CaptchaXError.timeout
        XCTAssertEqual(timeoutError.errorDescription, "Request timed out")

        let invalidConfigError = CaptchaXError.invalidConfig
        XCTAssertEqual(invalidConfigError.errorDescription, "Invalid configuration")

        let verificationFailedError = CaptchaXError.verificationFailed
        XCTAssertEqual(verificationFailedError.errorDescription, "Verification failed")

        let cancelledError = CaptchaXError.cancelled
        XCTAssertEqual(cancelledError.errorDescription, "Verification was cancelled")

        let userCancelledError = CaptchaXError.userCancelled
        XCTAssertEqual(userCancelledError.errorDescription, "User cancelled the verification")
    }

    func testCacheManager() {
        CacheManager.shared.cacheEnabled = true

        let testData = "test data".data(using: .utf8)!
        let testKey = "test_key"

        CacheManager.shared.cacheImage(testData, forKey: testKey)

        let cachedData = CacheManager.shared.getCachedImage(forKey: testKey)
        XCTAssertNotNil(cachedData)
        XCTAssertEqual(cachedData, testData)

        let cacheSize = CacheManager.shared.cacheSize()
        XCTAssertGreaterThan(cacheSize, 0)

        CacheManager.shared.clearCache()

        let clearedData = CacheManager.shared.getCachedImage(forKey: testKey)
        XCTAssertNil(clearedData)
    }

    func testCacheManagerDisabled() {
        CacheManager.shared.cacheEnabled = false

        let testData = "test data".data(using: .utf8)!
        let testKey = "test_key_disabled"

        CacheManager.shared.cacheImage(testData, forKey: testKey)

        let cachedData = CacheManager.shared.getCachedImage(forKey: testKey)
        XCTAssertNil(cachedData)
    }

    func testLogger() {
        Logger.shared.isEnabled = true
        Logger.shared.minimumLevel = .debug

        Logger.debug("Debug message")
        Logger.info("Info message")
        Logger.warning("Warning message")
        Logger.error("Error message")

        Logger.shared.minimumLevel = .error
        Logger.debug("Should not log")
    }

    func testExtensions() {
        let testString = "Hello World"
        XCTAssertFalse(testString.sha256.isEmpty)
        XCTAssertTrue(testString.sha256.count == 64)

        let urlString = "https://example.com"
        XCTAssertTrue(urlString.isValidURL())

        let invalidURL = "not a url"
        XCTAssertFalse(invalidURL.isValidURL())

        let base64String = testString.base64Encoded
        XCTAssertNotNil(base64String)

        let decoded = base64String?.base64Decoded
        XCTAssertEqual(decoded, testString)
    }

    func testDateExtensions() {
        let now = Date()
        XCTAssertFalse(now.iso8601String.isEmpty)

        let fiveMinutesLater = now.adding(minutes: 5)
        XCTAssertGreaterThan(fiveMinutesLater.timeIntervalSince(now), 0)

        let oneHourLater = now.adding(hours: 1)
        XCTAssertGreaterThan(oneHourLater.timeIntervalSince(now), 3600)

        let oneDayLater = now.adding(days: 1)
        XCTAssertGreaterThan(oneDayLater.timeIntervalSince(now), 86400)
    }

    func testDictionaryExtensions() {
        let dict: [String: Any] = ["key": "value", "number": 123]
        let jsonString = dict.toJSONString()
        XCTAssertNotNil(jsonString)

        let queryString = dict.toQueryString()
        XCTAssertTrue(queryString.contains("key=value"))
        XCTAssertTrue(queryString.contains("number=123"))
    }

    func testArrayExtensions() {
        let array = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
        let chunked = array.chunked(into: 3)

        XCTAssertEqual(chunked.count, 4)
        XCTAssertEqual(chunked[0], [1, 2, 3])
        XCTAssertEqual(chunked[1], [4, 5, 6])
        XCTAssertEqual(chunked[2], [7, 8, 9])
        XCTAssertEqual(chunked[3], [10])
    }

    func testOptionalStringExtensions() {
        let emptyString: String? = ""
        XCTAssertEqual(emptyString.orEmpty, "")

        let nilString: String? = nil
        XCTAssertEqual(nilString.orEmpty, "")

        XCTAssertTrue("".isNilOrEmpty)
        XCTAssertTrue(nilString.isNilOrEmpty)
        XCTAssertFalse("hello".isNilOrEmpty)
    }

    func testDataExtensions() {
        let testData = "Test data".data(using: .utf8)!
        let hexString = testData.hexString
        XCTAssertFalse(hexString.isEmpty)
        XCTAssertEqual(hexString.count, testData.count * 2)

        let decodedData = Data(hexString: hexString)
        XCTAssertNotNil(decodedData)
        XCTAssertEqual(decodedData, testData)

        let prettyJSON = testData.prettyPrintedJSON
        XCTAssertNotNil(prettyJSON)
    }

    func testEncodableExtensions() {
        let result = CaptchaResult(token: "test", expiresAt: nil, metadata: nil)
        let dict = result.toDictionary()
        XCTAssertNotNil(dict)
        XCTAssertEqual(dict?["token"] as? String, "test")

        let jsonString = result.toJSONString()
        XCTAssertNotNil(jsonString)
        XCTAssertTrue(jsonString!.contains("test"))
    }

    func testPreload() {
        CaptchaX.shared.preload(scene: "test_scene")
    }

    func testDestroy() {
        CaptchaX.shared.destroy()
        XCTAssertNotNil(CaptchaX.shared)
    }

    func testUploadResult() {
        let uploadResult = UploadResult(imageId: "img_123", url: "https://example.com/image.jpg")
        XCTAssertEqual(uploadResult.imageId, "img_123")
        XCTAssertEqual(uploadResult.url, "https://example.com/image.jpg")
    }
}

final class CaptchaNetworkActorTests: XCTestCase {

    @MainActor
    func testNetworkActorInitialization() async {
        let actor = CaptchaNetworkActor()
        await actor.setSigningKey("test_key")

        let result: PreloadResponse = try! await actor.request(
            "https://example.com/preload",
            method: .POST,
            params: ["test": "value"],
            signingKey: "test_key"
        )

        XCTAssertFalse(result.success)
    }
}
