# CaptchaX Flutter SDK

CaptchaX Flutter SDK 是一个功能强大的多类型验证码解决方案，支持滑块、点选、拼图、旋转、文字和图标等多种验证码类型。

## 功能特性

- 🎯 **滑块验证码**: 拖动滑块完成验证
- 👆 **点选验证码**: 点击指定图片完成验证  
- 🧩 **拼图验证码**: 拖动拼图块完成验证
- 🔄 **旋转验证码**: 旋转图片角度完成验证
- 📝 **文字验证码**: 输入文字完成验证
- 🎨 **图标验证码**: 选择指定图标完成验证

## 安装

在 `pubspec.yaml` 中添加依赖：

```yaml
dependencies:
  captcha_flutter: ^1.0.0
```

然后运行：

```bash
flutter pub get
```

## 快速开始

### 基本配置

```dart
import 'package:captcha_flutter/captcha_flutter.dart';

CaptchaX.initialize(
  baseUrl: 'https://captchax.example.com',
  timeout: Duration(seconds: 30),
);
```

### 使用滑块验证码

```dart
CaptchaSlider(
  onVerified: (result) {
    print('验证结果: $result');
  },
  onError: (error) {
    print('错误: $error');
  },
)
```

### 使用点选验证码

```dart
CaptchaClick(
  onVerified: (result) {
    print('验证结果: $result');
  },
)
```

### 使用拼图验证码

```dart
CaptchaPuzzle(
  onVerified: (result) {
    print('验证结果: $result');
  },
)
```

## API 文档

### 初始化

```dart
CaptchaX.initialize({
  required String baseUrl,
  Duration timeout = const Duration(seconds: 30),
  String? apiKey,
  bool enableDebug = false,
})
```

### 验证码类型

- `CaptchaType.slider` - 滑块验证码
- `CaptchaType.click` - 点选验证码
- `CaptchaType.puzzle` - 拼图验证码
- `CaptchaType.rotate` - 旋转验证码
- `CaptchaType.text` - 文字验证码
- `CaptchaType.icon` - 图标验证码

### 服务方法

#### 获取验证码

```dart
final captchaData = await CaptchaX.getCaptcha(CaptchaType.slider);
```

#### 验证答案

```dart
final result = await CaptchaX.verify(
  CaptchaType.slider,
  captchaId: 'xxx',
  userResponse: {'track': [...]},
);
```

## 平台支持

- ✅ Android (API 21+)
- ✅ iOS (12.0+)

## 示例项目

示例项目位于 `example/` 目录，运行方式：

```bash
cd example
flutter run
```

## 配置说明

### Android 配置

在 `android/app/build.gradle` 中确保支持 Java 8：

```gradle
android {
    compileSdkVersion 33
    defaultConfig {
        minSdkVersion 21
    }
}
```

添加网络权限：

```xml
<uses-permission android:name="android.permission.INTERNET"/>
```

### iOS 配置

在 `ios/Runner/Info.plist` 中添加：

```xml
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsArbitraryLoads</key>
    <true/>
</dict>
```

## 错误处理

SDK 提供完善的错误处理机制：

```dart
try {
  final result = await CaptchaX.verify(...);
} on CaptchaException catch (e) {
  print('验证码错误: ${e.message}');
  print('错误码: ${e.code}');
}
```

## 许可证

MIT License - 详见 LICENSE 文件

## 联系方式

- 官网: https://captchax.example.com
- 技术支持: support@captchax.example.com
