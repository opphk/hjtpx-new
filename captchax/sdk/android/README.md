# CaptchaX Android SDK

一个功能强大的 Android 验证码 SDK，支持多种验证码类型，Kotlin 协程优化和 Jetpack Compose 组件。

## 功能特性

### 🎯 多种验证码类型
- **滑块验证码 (Slider)** - 拖动滑块完成拼图
- **点选验证码 (Click)** - 依次点击指定位置
- **拼图验证码 (Puzzle)** - 拖动滑块填充拼图
- **旋转验证码 (Rotate)** - 旋转图片至正确角度
- **文字验证码 (Text)** - 输入图中文字
- **图标验证码 (Icon)** - 选择正确的图标

### 🚀 Kotlin 协程优化
- 使用 `suspend` 函数处理异步操作
- `Flow` 用于响应式数据流
- `CoroutineScope` 管理协程生命周期
- 完善的错误处理机制

### 🎨 Jetpack Compose 支持
- Material Design 3 设计风格
- 响应式布局适配
- 流畅的动画效果
- 现代化 UI 组件

### 📦 其他特性
- 图片缓存机制
- 设备指纹识别
- 网络请求优化
- 完善的测试覆盖

## 环境配置

### 开发环境
- 服务器地址: `http://localhost:3000`
- 调试模式: 启用

### 生产环境
- 服务器地址: `https://captchax.example.com`

## 快速开始

### 1. 添加依赖

首先，在 `settings.gradle.kts` 中添加 JitPack 仓库：

```kotlin
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
        maven { url = uri("https://jitpack.io") }
    }
}
```

然后在模块的 `build.gradle.kts` 中添加依赖：

```kotlin
dependencies {
    implementation("com.captchax:sdk-android:1.0.0")
}
```

### 2. 初始化 SDK

在 Application 类中初始化 CaptchaX SDK：

```kotlin
class MyApp : Application() {
    override fun onCreate() {
        super.onCreate()
        
        CaptchaX.initialize(
            context = this,
            apiKey = "YOUR_API_KEY",
            apiSecret = "YOUR_API_SECRET",
            serverUrl = "https://captchax.example.com"
        )
    }
}
```

或者使用 Builder 模式：

```kotlin
CaptchaX.initialize(
    context = this,
    config = CaptchaConfig.builder()
        .apiKey("YOUR_API_KEY")
        .apiSecret("YOUR_API_SECRET")
        .serverUrl("https://captchax.example.com")
        .timeout(30000L)
        .cacheEnabled(true)
        .preloadEnabled(true)
        .build()
)
```

### 3. 使用验证码

#### 传统 View 方式

```kotlin
val captchaView = findViewById<CaptchaView>(R.id.captchaView)

captchaView.listener = object : CaptchaViewListener {
    override fun onSuccess(token: String) {
        // 验证成功，token 可用于后续验证
        Log.d("CaptchaX", "Verification success: $token")
    }
    
    override fun onError(error: CaptchaError) {
        // 验证失败
        Log.e("CaptchaX", "Verification failed: ${error.message}")
    }
    
    override fun onClose() {
        // 用户关闭验证码
    }
    
    override fun onReady() {
        // 验证码加载完成
    }
    
    override fun onLoading() {
        // 验证码加载中
    }
    
    override fun onLoaded() {
        // 验证码加载完成
    }
}

captchaView.load(CaptchaType.SLIDER)
```

#### Jetpack Compose 方式

```kotlin
@Composable
fun CaptchaScreen() {
    var showCaptcha by remember { mutableStateOf(false) }
    
    Button(onClick = { showCaptcha = true }) {
        Text("显示验证码")
    }
    
    if (showCaptcha) {
        CaptchaXDialog(
            type = CaptchaType.SLIDER,
            scene = "login",
            onSuccess = { token ->
                Log.d("CaptchaX", "Token: $token")
                showCaptcha = false
            },
            onError = { error ->
                Log.e("CaptchaX", "Error: ${error.message}")
                showCaptcha = false
            },
            onDismiss = { showCaptcha = false },
            requestCaptcha = { scene, type ->
                // 请求验证码数据
                captchaRepository.requestCaptcha(scene, type)
            },
            verifyCaptcha = { request ->
                // 验证结果
                captchaRepository.verify(request)
            }
        )
    }
}
```

#### 使用 CaptchaButton 组件

```kotlin
@Composable
fun LoginScreen() {
    CaptchaButton(
        scene = "login",
        type = CaptchaType.SLIDER,
        text = "完成验证",
        onSuccess = { token ->
            // 验证成功
        },
        onError = { error ->
            // 验证失败
        },
        requestCaptcha = { scene, type ->
            repository.requestCaptcha(scene, type)
        },
        verifyCaptcha = { request ->
            repository.verify(request)
        }
    )
}
```

### 4. 验证码类型详解

#### 滑块验证码 (Slider)

```kotlin
// 加载滑块验证码
captchaView.load(CaptchaType.SLIDER)

// 监听拖动进度
val progress = captchaView.getProgress()
```

#### 点选验证码 (Click)

```kotlin
// 加载点选验证码
captchaView.load(CaptchaType.CLICK)

// 点击位置会自动收集
val clickPoints = captchaView.getClickPoints()
```

#### 旋转验证码 (Rotate)

```kotlin
// 加载旋转验证码
captchaView.load(CaptchaType.ROTATE)

// 获取当前旋转角度
val angle = captchaView.getRotationAngle()
```

#### 文字验证码 (Text)

```kotlin
// 加载文字验证码
captchaView.load(CaptchaType.TEXT)

// 获取输入的文字
val text = captchaView.getInputText()
```

#### 图标验证码 (Icon)

```kotlin
// 加载图标验证码
captchaView.load(CaptchaType.ICON)

// 获取选择的图标
val selectedIcons = captchaView.getSelectedIcons()
```

### 5. 验证 API

```kotlin
// 方式一：回调方式
CaptchaX.verify(activity, "login") { result ->
    result.onSuccess { token ->
        Log.d("CaptchaX", "Token: $token")
    }.onFailure { error ->
        Log.e("CaptchaX", "Error: ${error.message}")
    }
}

// 方式二：Flow 方式
val flow = captchaRepository.requestCaptcha("login", CaptchaType.SLIDER)
flow.collect { state ->
    when (state) {
        is CaptchaRepository.CaptchaState.Loading -> {
            // 显示加载状态
        }
        is CaptchaRepository.CaptchaState.Success -> {
            // 获取验证码数据
            val data = state.data
        }
        is CaptchaRepository.CaptchaState.Error -> {
            // 处理错误
            val error = state.error
        }
    }
}
```

### 6. 预加载验证码

```kotlin
// 预加载验证码数据
CaptchaX.preload("login")
```

## Kotlin 协程优化

### Flow 数据流

```kotlin
// 请求验证码，返回 Flow
val captchaFlow: Flow<CaptchaState<CaptchaData>> = 
    captchaRepository.requestCaptcha(scene, type)

// 收集状态
captchaFlow.collect { state ->
    when (state) {
        is CaptchaState.Loading -> showLoading()
        is CaptchaState.Success -> showCaptcha(state.data)
        is CaptchaState.Error -> showError(state.error)
    }
}
```

### Suspend 函数

```kotlin
// 同步验证
suspend fun verifyCaptcha(request: VerificationRequest): Result<String> {
    return verificationManager.verify(request)
}

// 调用
viewModelScope.launch {
    val result = verifyCaptcha(request)
    result.onSuccess { token ->
        // 处理成功
    }
}
```

### CoroutineScope 管理

```kotlin
class CaptchaViewModel : ViewModel() {
    
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
    
    fun loadCaptcha() {
        scope.launch {
            try {
                val data = repository.loadCaptcha()
                _captchaData.value = data
            } catch (e: Exception) {
                _error.value = e.message
            }
        }
    }
    
    override fun onCleared() {
        super.onCleared()
        scope.cancel()
    }
}
```

## 错误处理

CaptchaX 定义了多种错误类型：

```kotlin
// 网络错误
CaptchaError.NetworkError("Network failed")

// 服务器错误
CaptchaError.ServerError("Server error", "ERROR_CODE")

// 验证错误
CaptchaError.ValidationError("Invalid input")

// 超时错误
CaptchaError.TimeoutError("Request timeout")

// 取消错误
CaptchaError.CancelledError()

// 未知错误
CaptchaError.UnknownError("Unknown error")
```

处理错误：

```kotlin
captchaView.listener = object : CaptchaViewListener {
    override fun onError(error: CaptchaError) {
        when (error) {
            is CaptchaError.NetworkError -> {
                // 网络问题，提示用户检查网络
            }
            is CaptchaError.ValidationError -> {
                // 验证失败，可以重试
            }
            is CaptchaError.TimeoutError -> {
                // 请求超时
            }
            else -> {
                // 其他错误
            }
        }
    }
}
```

## 配置选项

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `apiKey` | String | 必需 | API 密钥 |
| `apiSecret` | String | 必需 | API 密钥 |
| `serverUrl` | String | 必需 | 服务器地址 |
| `timeout` | Long | 30000 | 请求超时时间(ms) |
| `cacheEnabled` | Boolean | true | 是否启用缓存 |
| `preloadEnabled` | Boolean | true | 是否启用预加载 |

## API 参考

### CaptchaX

主要入口类，提供 SDK 初始化和验证码操作。

```kotlin
object CaptchaX {
    // 初始化
    fun initialize(context: Context, config: CaptchaConfig)
    
    // 验证
    fun verify(activity: Activity, scene: String, callback: (Result<String>) -> Unit)
    
    // 预加载
    fun preload(scene: String)
    
    // 获取验证码视图
    fun getCaptchaView(activity: Activity, type: CaptchaType, listener: CaptchaViewListener): CaptchaView
    
    // 销毁
    fun destroy()
}
```

### CaptchaConfig

配置类，使用 Builder 模式创建。

```kotlin
val config = CaptchaConfig.builder()
    .apiKey("key")
    .apiSecret("secret")
    .serverUrl("url")
    .timeout(30000L)
    .cacheEnabled(true)
    .preloadEnabled(true)
    .build()
```

### CaptchaRepository

数据仓库类，处理验证码数据的请求和验证。

```kotlin
class CaptchaRepository {
    // 请求验证码
    fun requestCaptcha(scene: String, type: CaptchaType): Flow<CaptchaState<CaptchaData>>
    
    // 验证滑块
    suspend fun verifySlider(token: String, distance: Float): Result<String>
    
    // 验证点击
    suspend fun verifyClicks(token: String, points: List<Pair<Float, Float>>): Result<String>
    
    // 验证旋转
    suspend fun verifyRotation(token: String, angle: Float): Result<String>
    
    // 验证文字
    suspend fun verifyText(token: String, text: String): Result<String>
    
    // 验证图标
    suspend fun verifyIcon(token: String, icons: List<String>): Result<String>
}
```

### CaptchaStateHolder

状态管理器，管理和跟踪验证码状态。

```kotlin
val holder = CaptchaStateHolder()

// 状态
val state: StateFlow<CaptchaState>

// 进度
val progress: StateFlow<Float>

// 点击点
val clickPoints: StateFlow<List<Pair<Float, Float>>>

// 旋转角度
val rotationAngle: StateFlow<Float>

// 剩余尝试次数
val remainingAttempts: StateFlow<Int>
```

## Compose 组件

### CaptchaXDialog

完整的验证码对话框组件。

```kotlin
CaptchaXDialog(
    type = CaptchaType.SLIDER,
    scene = "login",
    onSuccess = { token -> },
    onError = { error -> },
    onDismiss = { },
    requestCaptcha = { scene, type -> },
    verifyCaptcha = { request -> }
)
```

### CaptchaButton

验证码按钮组件。

```kotlin
CaptchaButton(
    scene = "login",
    type = CaptchaType.SLIDER,
    text = "验证",
    onSuccess = { token -> },
    onError = { error -> },
    requestCaptcha = { scene, type -> },
    verifyCaptcha = { request -> }
)
```

### CaptchaTypeSelector

验证码类型选择器。

```kotlin
CaptchaTypeSelector(
    onTypeSelected = { type -> }
)
```

## 测试

### 运行单元测试

```bash
./gradlew test
```

### 运行所有测试

```bash
./gradlew testDebugUnitTest
```

### 查看测试覆盖率

```bash
./gradlew testDebugUnitTestCoverage
```

## 性能优化

### 1. 图片缓存

SDK 内置 LRU 图片缓存，减少重复下载：

```kotlin
// 获取缓存的验证码图片
val cachedBitmap = imageCache.get(type.name)

// 手动缓存图片
imageCache.put(type.name, bitmap)

// 清空缓存
imageCache.clear()
```

### 2. 预加载

提前加载验证码数据，提升用户体验：

```kotlin
// 在用户登录页面
CaptchaX.preload("login")

// 实际需要验证码时，加载更快
captchaView.load(CaptchaType.SLIDER)
```

### 3. 协程优化

合理使用协程，避免内存泄漏：

```kotlin
class CaptchaManager {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
    private var loadJob: Job? = null
    
    fun loadCaptcha() {
        loadJob?.cancel()
        loadJob = scope.launch {
            // 加载验证码
        }
    }
    
    fun destroy() {
        loadJob?.cancel()
        scope.cancel()
    }
}
```

## 安全性

### 1. 请求签名

所有请求都经过 HMAC-SHA256 签名：

```kotlin
private fun signRequest(requestBuilder: Request.Builder, endpoint: String, params: Map<String, Any>) {
    val timestamp = System.currentTimeMillis().toString()
    val nonce = UUID.randomUUID().toString()
    
    val signString = buildString {
        append(apiKey)
        append(timestamp)
        append(nonce)
        params.entries.sortedBy { it.key }.forEach { append(it.key).append(it.value) }
    }
    
    val signature = hmacSha256(signString, apiSecret)
    
    requestBuilder
        .addHeader("X-API-Key", apiKey)
        .addHeader("X-Timestamp", timestamp)
        .addHeader("X-Nonce", nonce)
        .addHeader("X-Signature", signature)
}
```

### 2. 设备指纹

采集设备信息用于安全验证：

```kotlin
val fingerprint = DeviceFingerprint.generate()
val deviceInfo = DeviceFingerprint.collect()
```

## 常见问题

### Q: 如何处理网络错误？

A: 设置错误监听器：

```kotlin
captchaView.listener = object : CaptchaViewListener {
    override fun onError(error: CaptchaError) {
        when (error) {
            is CaptchaError.NetworkError -> {
                // 提示用户检查网络
            }
            is CaptchaError.TimeoutError -> {
                // 请求超时，可以重试
            }
        }
    }
}
```

### Q: 如何自定义验证码样式？

A: 在 Compose 中使用主题：

```kotlin
CaptchaXTheme(darkTheme = false) {
    CaptchaXDialog(
        type = CaptchaType.SLIDER,
        // ...
    )
}
```

### Q: 如何限制验证尝试次数？

A: 使用 CaptchaStateHolder：

```kotlin
val remainingAttempts = captchaStateHolder.remainingAttempts
remainingAttempts.collect { attempts ->
    if (attempts <= 0) {
        // 达到最大尝试次数
    }
}
```

### Q: 如何获取验证结果？

A: 多种方式：

```kotlin
// 方式一：回调
captchaView.listener = object : CaptchaViewListener {
    override fun onSuccess(token: String) {
        // 处理 token
    }
}

// 方式二：Result
CaptchaX.verify(activity, "login") { result ->
    result.onSuccess { token -> }
    result.onFailure { error -> }
}

// 方式三：Flow
viewModelScope.launch {
    captchaRepository.requestCaptcha(scene, type).collect { state ->
        // 处理状态
    }
}
```

## 更新日志

### v1.0.0 (2024-01-01)
- 初始版本发布
- 支持 6 种验证码类型
- Kotlin 协程优化
- Jetpack Compose 组件
- 完整的测试覆盖

## 许可证

MIT License

## 联系方式

- 邮箱: support@captchax.com
- 网站: https://captchax.com
- GitHub: https://github.com/captchax/android-sdk
