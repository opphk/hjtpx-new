# CaptchaX iOS SDK

现代化的 iOS 应用验证码解决方案，支持 Swift 6、SwiftUI 和 UIKit。

## 目录

- [特性](#特性)
- [要求](#要求)
- [安装](#安装)
- [快速开始](#快速开始)
- [详细文档](#详细文档)
- [API 参考](#api-参考)
- [示例代码](#示例代码)
- [配置](#配置)
- [验证码类型](#验证码类型)
- [错误处理](#错误处理)
- [最佳实践](#最佳实践)
- [常见问题](#常见问题)
- [更新日志](#更新日志)
- [许可证](#许可证)

## 特性

### 🎯 核心功能

- **多种验证码类型**: 滑块、点选、旋转、拼图、文字和图标验证
- **Swift 6 支持**: 完整的 Swift 6 并发支持 (async/await, Actor isolation, Sendable)
- **双框架支持**: 原生支持 SwiftUI 和 UIKit
- **Objective-C 兼容**: 完整兼容 Objective-C 项目

### 🛡️ 安全特性

- **设备指纹识别**: 高级设备识别和追踪
- **请求签名**: HMAC-SHA256 请求签名验证
- **Token 验证**: 安全的一次性验证 Token

### ⚡ 性能优化

- **智能缓存**: 高效的图片和数据缓存
- **资源预加载**: 快速加载验证码资源
- **Actor 隔离**: 线程安全的网络请求处理

### 🎨 UI/UX

- **Material Design 3**: 现代设计语言
- **流畅动画**: 精心设计的过渡动画
- **响应式布局**: 自适应不同屏幕尺寸
- **暗色模式**: 支持系统暗色模式

## 要求

- **iOS 15.0+**
- **Swift 6.0+**
- **Xcode 15.0+**
- **Swift Package Manager** 或 **CocoaPods**

## 安装

### Swift Package Manager (推荐)

在 Xcode 中添加 Package：

1. **File → Swift Packages → Add Package Dependency**
2. 输入仓库 URL: `https://github.com/opphk/hjtpx.git`
3. 选择版本 1.0.0+
4. 选择 `CaptchaX` 产品

或在 `Package.swift` 中添加：

```swift
dependencies: [
    .package(url: "https://github.com/opphk/hjtpx.git", from: "1.0.0")
]
```

### CocoaPods

在 `Podfile` 中添加：

```ruby
platform :ios, '15.0'
use_frameworks!

target 'YourApp' do
  pod 'CaptchaX', :git => 'https://github.com/opphk/hjtpx.git', :branch => 'main'
end
```

然后运行：

```bash
pod install
```

### 手动安装

1. 下载或克隆 SDK
2. 将 `Sources/CaptchaX` 文件夹拖入 Xcode 项目
3. 添加 SnapKit 依赖 (通过 SPM 或 CocoaPods)

## 快速开始

### 1. 初始化 SDK

在 `AppDelegate.swift` 或应用入口处初始化：

```swift
import CaptchaX

// 在 SwiftUI App 中
@main
struct YourApp: App {
    init() {
        CaptchaX.shared.initialize(
            apiKey: "your_api_key",
            apiSecret: "your_api_secret"
        )
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}

// 或使用环境配置
CaptchaX.shared.initialize(
    apiKey: "your_api_key",
    apiSecret: "your_api_secret"
)
```

### 2. 简单验证

```swift
import CaptchaX

class LoginViewController: UIViewController {

    func loginTapped() {
        Task {
            do {
                let result = try await CaptchaX.shared.verify(scene: "login")
                print("验证成功: \(result.token)")
                performLogin()
            } catch {
                print("验证失败: \(error)")
                showError(error)
            }
        }
    }
}
```

### 3. 使用回调方式

```swift
CaptchaX.shared.verify(scene: "login") { result in
    switch result {
    case .success(let token):
        print("验证成功: \(token.token)")
        self.performLogin()
    case .failure(let error):
        print("验证失败: \(error)")
        self.showError(error)
    }
}
```

### 4. 显示验证码视图

```swift
import CaptchaX

class ViewController: UIViewController, CaptchaXDelegate {

    override func viewDidLoad() {
        super.viewDidLoad()
        CaptchaX.shared.delegate = self

        let captchaView = CaptchaView()
        captchaView.frame = CGRect(x: 0, y: 0, width: 400, height: 450)
        captchaView.center = view.center

        captchaView.onSuccess = { token in
            print("验证成功: \(token)")
            self.performLogin()
        }

        captchaView.onError = { error in
            print("验证错误: \(error)")
        }

        captchaView.onClose = {
            print("验证码已关闭")
        }

        view.addSubview(captchaView)
        captchaView.load(captchaType: .slider)
    }

    // CaptchaXDelegate
    func captchaX(_ captcha: CaptchaX, didSuccess result: CaptchaResult) {
        print("验证成功: \(result.token)")
    }

    func captchaX(_ captcha: CaptchaX, didFailed error: Error) {
        print("验证失败: \(error)")
    }

    func captchaXDidClose(_ captcha: CaptchaX) {
        print("验证码已关闭")
    }
}
```

### 5. SwiftUI 示例

```swift
import SwiftUI
import CaptchaX

struct LoginView: View {
    @State private var isVerified = false
    @State private var showingCaptcha = false
    @State private var selectedType: CaptchaType = .slider

    var body: some View {
        Button(action: {
            showingCaptcha = true
        }) {
            Text(isVerified ? "已验证" : "登录")
                .padding()
                .background(isVerified ? Color.green : Color.blue)
                .foregroundColor(.white)
                .cornerRadius(12)
        }
        .sheet(isPresented: $showingCaptcha) {
            CaptchaView_SwiftUI(
                captchaType: selectedType,
                scene: "login",
                onSuccess: { result in
                    isVerified = true
                    showingCaptcha = false
                },
                onError: { error in
                    print("验证失败: \(error)")
                },
                onClose: {
                    showingCaptcha = false
                }
            )
        }
    }
}
```

## 详细文档

### 环境配置

SDK 支持开发和生产环境：

```swift
// 开发环境 (localhost:3000)
let devConfig = CaptchaConfig.development
CaptchaX.shared.initialize(apiKey: "dev_key", apiSecret: "dev_secret")

// 生产环境 (captchax.example.com)
let prodConfig = CaptchaConfig.production
CaptchaX.shared.initialize(apiKey: "prod_key", apiSecret: "prod_secret")
```

### 自定义配置

```swift
let config = CaptchaConfig(
    apiKey: "your_api_key",
    apiSecret: "your_api_secret",
    serverURL: "https://your-server.com",
    timeout: 30.0,
    cacheEnabled: true,
    preloadEnabled: true,
    debugMode: false
)

CaptchaX.shared.initialize(apiKey: config.apiKey, apiSecret: config.apiSecret)
```

### 设备指纹

SDK 自动收集设备信息用于安全验证：

```swift
// 获取指纹字符串
let fingerprint = CaptchaX.shared.getDeviceFingerprint()

// 收集详细信息
let deviceInfo = DeviceFingerprint.collect()
// 返回: deviceId, deviceName, systemName, systemVersion,
// model, screenBounds, processorCount, memoryTotal 等
```

### 缓存管理

```swift
// 查看缓存大小
let cacheSize = CacheManager.shared.cacheSize()
print("缓存大小: \(cacheSize / 1024 / 1024) MB")

// 清除缓存
CacheManager.shared.clearCache()

// 禁用缓存
CacheManager.shared.cacheEnabled = false

// 删除特定缓存
CacheManager.shared.removeCache(forKey: "specific_key")
```

### 资源预加载

```swift
// 预加载验证码资源
CaptchaX.shared.preload(scene: "login")
CaptchaX.shared.preload(scene: "register")
```

### 日志配置

```swift
// 启用调试日志
Logger.shared.isEnabled = true
Logger.shared.minimumLevel = .debug

// 记录日志
Logger.debug("调试信息")
Logger.info("一般信息")
Logger.warning("警告信息")
Logger.error("错误信息")
```

## API 参考

### CaptchaX (主类)

#### 属性

```swift
public static let shared: CaptchaX  // 单例实例
public var config: CaptchaConfig      // SDK 配置
public weak var delegate: CaptchaXDelegate?  // 代理回调
```

#### 方法

```swift
// 初始化 SDK
func initialize(apiKey: String, apiSecret: String)

// 异步验证 (Swift 6 async/await)
func verify(scene: String) async throws -> CaptchaResult

// 回调方式验证
func verify(scene: String, completion: @escaping @Sendable (Result<CaptchaResult, Error>) -> Void)

// 带视图的验证
func verifyWithView(scene: String, captchaType: CaptchaType) async throws -> CaptchaResult
func verifyWithView(scene: String, captchaType: CaptchaType, completion: @escaping @Sendable (Result<CaptchaResult, Error>) -> Void)

// 预加载资源
func preload(scene: String)

// 获取设备指纹
func getDeviceFingerprint() -> String

// 清理资源
func destroy()
```

### CaptchaXDelegate (代理协议)

```swift
@objc public protocol CaptchaXDelegate: AnyObject {
    func captchaX(_ captcha: CaptchaX, didSuccess result: CaptchaResult)
    func captchaX(_ captcha: CaptchaX, didFailed error: Error)
    func captchaXDidClose(_ captcha: CaptchaX)
}
```

### CaptchaConfig (配置)

```swift
@MainActor
public struct CaptchaConfig: Sendable {
    public var apiKey: String           // API 密钥
    public var apiSecret: String         // API 密钥
    public var serverURL: String         // 服务器地址
    public var timeout: TimeInterval     // 超时时间 (默认 30s)
    public var cacheEnabled: Bool        // 启用缓存
    public var preloadEnabled: Bool      // 启用预加载
    public var debugMode: Bool           // 调试模式

    // 预设配置
    public static var `default`: CaptchaConfig
    public static var development: CaptchaConfig
    public static var production: CaptchaConfig

    // 验证配置
    public func validate() -> Result<Void, CaptchaXError>
}
```

### CaptchaType (验证码类型)

```swift
public enum CaptchaType: String, Sendable, CaseIterable {
    case slider    // 滑块验证
    case click     // 点选验证
    case rotate    // 旋转验证
    case puzzle    // 拼图验证
    case text      // 文字验证
    case icon      // 图标验证

    // 属性
    public var displayName: String  // 显示名称
    public var icon: String         // SF Symbol 图标名
    public var description: String  // 描述文本
}
```

### CaptchaResult (验证结果)

```swift
public struct CaptchaResult: Codable, Sendable {
    public let token: String                      // 验证 Token
    public let expiresAt: Date?                   // Token 过期时间
    public let metadata: [String: String]?        // 额外元数据

    // 方法
    public var isValid: Bool  // Token 是否有效
}
```

### CaptchaXError (错误类型)

```swift
public enum CaptchaXError: Error, LocalizedError, Sendable {
    case notInitialized           // SDK 未初始化
    case networkError(underlying: Error)  // 网络错误
    case serverError(code: Int, message: String)  // 服务器错误
    case timeout                  // 请求超时
    case invalidConfig            // 无效配置
    case verificationFailed       // 验证失败
    case cancelled                // 验证取消
    case userCancelled            // 用户取消

    public var errorDescription: String?  // 错误描述
}
```

### CaptchaView (UIKit 视图)

```swift
public class CaptchaView: UIView {

    // 回调
    public var onSuccess: ((String) -> Void)?
    public var onError: ((Error) -> Void)?
    public var onClose: (() -> Void)?

    // 方法
    public func load(captchaType: CaptchaType)  // 加载验证码
    public func reset()                         // 重置验证码
    public func destroy()                       // 销毁视图
}
```

### CaptchaView_SwiftUI (SwiftUI 视图)

```swift
public struct CaptchaView_SwiftUI: View {
    public init(
        captchaType: CaptchaType,
        scene: String,
        onSuccess: @escaping (CaptchaResult) -> Void,
        onError: @escaping (Error) -> Void,
        onClose: @escaping () -> Void
    )
}
```

## 示例代码

### SwiftUI 完整示例

```swift
import SwiftUI
import CaptchaX

@main
struct DemoApp: App {
    init() {
        CaptchaX.shared.initialize(
            apiKey: "demo_key",
            apiSecret: "demo_secret"
        )
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}

struct ContentView: View {
    @State private var isVerified = false
    @State private var showingCaptcha = false
    @State private var selectedType: CaptchaType = .slider

    var body: some View {
        NavigationStack {
            VStack(spacing: 24) {
                // 状态显示
                VStack {
                    Image(systemName: isVerified ? "checkmark.shield.fill" : "lock.shield.fill")
                        .font(.system(size: 60))
                        .foregroundColor(isVerified ? .green : .blue)

                    Text(isVerified ? "已验证" : "未验证")
                        .font(.title2)
                }

                // 验证码类型选择
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 12) {
                        ForEach(CaptchaType.allCases, id: \.self) { type in
                            Button(action: {
                                selectedType = type
                            }) {
                                VStack {
                                    Image(systemName: type.icon)
                                        .font(.title2)
                                    Text(type.displayName)
                                        .font(.caption)
                                }
                                .padding()
                                .background(selectedType == type ? Color.blue : Color.gray.opacity(0.2))
                                .foregroundColor(selectedType == type ? .white : .primary)
                                .cornerRadius(12)
                            }
                        }
                    }
                    .padding()
                }

                // 验证按钮
                Button(action: {
                    showingCaptcha = true
                }) {
                    Text("开始验证")
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.blue)
                        .foregroundColor(.white)
                        .cornerRadius(12)
                }
                .padding(.horizontal)
            }
            .navigationTitle("CaptchaX Demo")
        }
        .sheet(isPresented: $showingCaptcha) {
            CaptchaView_SwiftUI(
                captchaType: selectedType,
                scene: "demo",
                onSuccess: { result in
                    isVerified = true
                    showingCaptcha = false
                },
                onError: { error in
                    print("验证失败: \(error)")
                },
                onClose: {
                    showingCaptcha = false
                }
            )
        }
    }
}
```

### UIKit 完整示例

```swift
import UIKit
import CaptchaX

class ViewController: UIViewController {

    private let captchaView = CaptchaView()

    override func viewDidLoad() {
        super.viewDidLoad()

        CaptchaX.shared.delegate = self
        CaptchaX.shared.initialize(
            apiKey: "demo_key",
            apiSecret: "demo_secret"
        )

        setupUI()
    }

    private func setupUI() {
        view.backgroundColor = .systemBackground

        let verifyButton = UIButton(type: .system)
        verifyButton.setTitle("打开验证码", for: .normal)
        verifyButton.titleLabel?.font = .systemFont(ofSize: 18, weight: .semibold)
        verifyButton.backgroundColor = .systemBlue
        verifyButton.setTitleColor(.white, for: .normal)
        verifyButton.layer.cornerRadius = 12
        verifyButton.addTarget(self, action: #selector(showCaptcha), for: .touchUpInside)

        view.addSubview(verifyButton)
        verifyButton.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            verifyButton.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            verifyButton.centerYAnchor.constraint(equalTo: view.centerYAnchor),
            verifyButton.widthAnchor.constraint(equalToConstant: 200),
            verifyButton.heightAnchor.constraint(equalToConstant: 50)
        ])
    }

    @objc private func showCaptcha() {
        captchaView.frame = view.bounds
        captchaView.autoresizingMask = [.flexibleWidth, .flexibleHeight]

        captchaView.onSuccess = { [weak self] token in
            print("验证成功: \(token)")
            self?.captchaView.destroy()
        }

        captchaView.onError = { error in
            print("验证失败: \(error)")
        }

        captchaView.onClose = { [weak self] in
            self?.captchaView.destroy()
        }

        view.addSubview(captchaView)
        captchaView.load(captchaType: .slider)
    }
}

extension ViewController: CaptchaXDelegate {
    func captchaX(_ captcha: CaptchaX, didSuccess result: CaptchaResult) {
        print("验证成功: \(result.token)")
    }

    func captchaX(_ captcha: CaptchaX, didFailed error: Error) {
        print("验证失败: \(error)")
    }

    func captchaXDidClose(_ captcha: CaptchaX) {
        print("验证码已关闭")
    }
}
```

### Objective-C 示例

```objc
#import <CaptchaX/CaptchaX-Swift.h>

@interface ViewController () <CaptchaXDelegate>
@end

@implementation ViewController

- (void)viewDidLoad {
    [super viewDidLoad];

    [[CaptchaXObjC shared] setDelegate:self];
    [[CaptchaXObjC shared] initializeWithApiKey:@"your_api_key"
                                      apiSecret:@"your_api_secret"];
}

- (void)showCaptcha {
    CaptchaView *captchaView = [[CaptchaView alloc] init];
    captchaView.frame = self.view.bounds;
    captchaView.onSuccess = ^(NSString *token) {
        NSLog(@"验证成功: %@", token);
        [captchaView destroy];
    };
    captchaView.onError = ^(NSError *error) {
        NSLog(@"验证失败: %@", error.localizedDescription);
    };
    captchaView.onClose = ^{
        [captchaView destroy];
    };

    [self.view addSubview:captchaView];
    [captchaView loadWithCaptchaType:CaptchaTypeSlider];
}

#pragma mark - CaptchaXDelegate

- (void)captchaXDidSuccess:(CaptchaResult *)result {
    NSLog(@"验证成功: %@", result.token);
}

- (void)captchaXDidFailed:(NSError *)error {
    NSLog(@"验证失败: %@", error.localizedDescription);
}

- (void)captchaXDidClose {
    NSLog(@"验证码已关闭");
}

@end
```

## 验证码类型

### 1. 滑块验证 (Slider)

拖动滑块完成验证：

```swift
CaptchaView_SwiftUI(
    captchaType: .slider,
    scene: "login",
    onSuccess: { result in
        print("验证成功")
    },
    onError: { error in
        print("验证失败")
    },
    onClose: { }
)
```

### 2. 点选验证 (Click)

点击指定图片完成验证：

```swift
CaptchaView_SwiftUI(
    captchaType: .click,
    scene: "login",
    onSuccess: { result in
        print("验证成功")
    },
    onError: { error in
        print("验证失败")
    },
    onClose: { }
)
```

### 3. 旋转验证 (Rotate)

旋转图片到正确角度：

```swift
CaptchaView_SwiftUI(
    captchaType: .rotate,
    scene: "login",
    onSuccess: { result in
        print("验证成功")
    },
    onError: { error in
        print("验证失败")
    },
    onClose: { }
)
```

### 4. 拼图验证 (Puzzle)

将拼图拖动到正确位置：

```swift
CaptchaView_SwiftUI(
    captchaType: .puzzle,
    scene: "login",
    onSuccess: { result in
        print("验证成功")
    },
    onError: { error in
        print("验证失败")
    },
    onClose: { }
)
```

### 5. 文字验证 (Text)

输入验证码字符：

```swift
CaptchaView_SwiftUI(
    captchaType: .text,
    scene: "login",
    onSuccess: { result in
        print("验证成功")
    },
    onError: { error in
        print("验证失败")
    },
    onClose: { }
)
```

### 6. 图标验证 (Icon)

选择包含指定图标的图片：

```swift
CaptchaView_SwiftUI(
    captchaType: .icon,
    scene: "login",
    onSuccess: { result in
        print("验证成功")
    },
    onError: { error in
        print("验证失败")
    },
    onClose: { }
)
```

## 错误处理

### 使用 Swift 6 async/await

```swift
func login() async {
    do {
        let result = try await CaptchaX.shared.verify(scene: "login")
        // 处理成功
        performLogin(token: result.token)
    } catch let error as CaptchaXError {
        switch error {
        case .notInitialized:
            print("SDK 未初始化")
        case .networkError(let underlying):
            print("网络错误: \(underlying)")
        case .serverError(let code, let message):
            print("服务器错误 [\(code)]: \(message)")
        case .timeout:
            print("请求超时")
        case .invalidConfig:
            print("无效配置")
        case .verificationFailed:
            print("验证失败")
        case .cancelled, .userCancelled:
            print("验证已取消")
        }
    } catch {
        print("未知错误: \(error)")
    }
}
```

### 使用回调

```swift
CaptchaX.shared.verify(scene: "login") { result in
    switch result {
    case .success(let token):
        print("验证成功: \(token.token)")
    case .failure(let error):
        if let captchaError = error as? CaptchaXError {
            print("错误: \(captchaError.errorDescription ?? "未知错误")")
        } else {
            print("未知错误: \(error)")
        }
    }
}
```

## 最佳实践

### 1. 早期初始化

在应用启动时初始化 SDK：

```swift
// SwiftUI App
@main
struct MyApp: App {
    init() {
        CaptchaX.shared.initialize(
            apiKey: "your_key",
            apiSecret: "your_secret"
        )
    }

    var body: some Scene {
        WindowGroup { ContentView() }
    }
}

// UIKit AppDelegate
class AppDelegate: UIResponder, UIApplicationDelegate {
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {
        CaptchaX.shared.initialize(
            apiKey: "your_key",
            apiSecret: "your_secret"
        )
        return true
    }
}
```

### 2. 场景管理

为不同场景使用不同的验证码：

```swift
// 登录
await CaptchaX.shared.verify(scene: "login")

// 注册
await CaptchaX.shared.verify(scene: "register")

// 找回密码
await CaptchaX.shared.verify(scene: "reset_password")

// 评论
await CaptchaX.shared.verify(scene: "comment")
```

### 3. 预加载优化

在用户输入信息时预加载验证码：

```swift
class LoginViewController: UIViewController {
    func textFieldDidBeginEditing(_ textField: UITextField) {
        // 用户开始输入时预加载
        CaptchaX.shared.preload(scene: "login")
    }
}
```

### 4. 缓存策略

```swift
// 根据应用需求配置缓存
let config = CaptchaConfig(
    apiKey: "key",
    apiSecret: "secret",
    cacheEnabled: true,      // 启用缓存以提高性能
    preloadEnabled: true    // 启用预加载
)
```

### 5. 资源清理

```swift
// 在 ViewController 消失时清理
override func viewWillDisappear(_ animated: Bool) {
    super.viewWillDisappear(animated)
    captchaView.destroy()
}

// 应用退出时清理
func applicationWillTerminate(_ application: UIApplication) {
    CaptchaX.shared.destroy()
}
```

## 常见问题

### Q1: SDK 初始化失败？

确保在调用任何验证方法之前先初始化：

```swift
// ✅ 正确
CaptchaX.shared.initialize(apiKey: "key", apiSecret: "secret")
let result = try await CaptchaX.shared.verify(scene: "login")

// ❌ 错误
let result = try await CaptchaX.shared.verify(scene: "login") // 未初始化
```

### Q2: 验证总是失败？

1. 检查 API Key 和 Secret 是否正确
2. 验证网络连接
3. 检查服务器 URL 配置
4. 查看错误日志

```swift
Logger.shared.minimumLevel = .debug
Logger.shared.isEnabled = true
```

### Q3: 验证码视图不显示？

1. 确保视图已添加到可见的窗口
2. 检查 frame 边界是否正确设置
3. 在 UIKit 中确保在主线程添加视图

```swift
DispatchQueue.main.async {
    self.view.addSubview(captchaView)
    captchaView.load(captchaType: .slider)
}
```

### Q4: 内存问题？

1. 验证完成后及时销毁视图
2. 定期清理缓存

```swift
// 应用启动时
CaptchaX.shared.initialize(...)

// 应用退出时
CaptchaX.shared.destroy()

// 定期清理缓存
CacheManager.shared.clearCache()
```

### Q5: 如何支持暗色模式？

SDK 自动跟随系统主题：

```swift
// CaptchaView 会自动使用 systemBackground
// CaptchaView_SwiftUI 会自动跟随 Color(.systemBackground)
```

### Q6: 如何自定义样式？

通过修改 SDK 源码或使用 SwiftUI 的 ViewModifier：

```swift
// SwiftUI 自定义样式
CaptchaView_SwiftUI(...)
    .tint(.purple)
```

## Swift 6 特性

### Async/Await

```swift
// 现代异步语法
func verifyUser() async throws {
    let result = try await CaptchaX.shared.verify(scene: "login")
    print("Token: \(result.token)")
}

// 调用
Task {
    do {
        try await verifyUser()
    } catch {
        print("Error: \(error)")
    }
}
```

### Actor Isolation

```swift
// CaptchaNetworkActor 确保线程安全
public actor CaptchaNetworkActor {
    func request<T: Decodable & Sendable>(...) async throws -> T {
        // 安全处理网络请求
    }
}
```

### Sendable Protocol

```swift
// 所有数据传输类型都遵循 Sendable
public struct CaptchaResult: Codable, Sendable { ... }
public enum CaptchaType: String, Sendable, CaseIterable { ... }
public enum CaptchaXError: Error, LocalizedError, Sendable { ... }
```

## 更新日志

### 1.0.0 (2026-05-15)

#### 新功能

- ✨ 完整的 Swift 6 支持
- 🎨 Material Design 3 设计语言
- 📱 SwiftUI 和 UIKit 完整组件
- 🔒 Actor isolation 和 Sendable 协议
- ⚡ 优化的 async/await 支持
- 🎬 流畅的动画效果
- 📐 响应式布局设计
- 🌙 暗色模式支持
- 🔧 6 种验证码类型
- 📝 完整的单元测试
- 📚 详细的中文文档

#### 验证码类型

- 🖱️ 滑块验证 (Slider)
- 👆 点选验证 (Click)
- 🔄 旋转验证 (Rotate)
- 🧩 拼图验证 (Puzzle)
- 📝 文字验证 (Text)
- 🏷️ 图标验证 (Icon)

#### 改进

- 性能优化
- 更好的错误处理
- 改进的缓存机制
- 更完善的文档

## 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 支持

- 📧 邮箱: captchax@example.com
- 🐛 GitHub Issues: https://github.com/opphk/hjtpx/issues
- 📖 文档: https://docs.captchax.com

## 技术支持

如需技术支持，请联系：

- 邮箱: captchax@example.com
- GitHub Issues: https://github.com/opphk/hjtpx/issues

## 鸣谢

感谢所有贡献者的支持！

## 版权

© 2026 CaptchaX. All rights reserved.
