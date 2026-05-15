# CaptchaX Flutter SDK 项目分析

## 项目结构

```
/workspace/captchax/sdk/flutter/
├── README.md                           # 项目文档
├── pubspec.yaml                        # SDK 依赖配置
├── lib/
│   ├── captcha_flutter.dart           # 主入口文件
│   └── src/
│       ├── models/
│       │   └── captcha_models.dart     # 数据模型
│       ├── services/
│       │   └── captcha_service.dart    # 核心服务
│       ├── utils/
│       │   └── captcha_utils.dart      # 工具类
│       └── widgets/
│           ├── captcha_slider.dart    # 滑块验证码
│           ├── captcha_click.dart     # 点选验证码
│           ├── captcha_puzzle.dart    # 拼图验证码
│           ├── captcha_rotate.dart    # 旋转验证码
│           ├── captcha_text.dart      # 文字验证码
│           └── captcha_icon.dart      # 图标验证码
└── example/                            # 示例项目
    ├── pubspec.yaml
    ├── lib/
    │   └── main.dart                   # 示例代码
    ├── android/
    │   └── app/
    │       ├── build.gradle
    │       └── src/main/
    │           └── AndroidManifest.xml
    └── ios/
        └── Runner/
            └── Info.plist
```

## 核心组件

### 1. CaptchaModels (数据模型)
- `CaptchaType`: 验证码类型枚举
- `CaptchaData`: 验证码数据模型
- `CaptchaVerifyRequest`: 验证请求模型
- `CaptchaVerifyResult`: 验证结果模型
- `CaptchaException`: 异常处理
- `CaptchaConfig`: 配置模型

### 2. CaptchaService (核心服务)
- `CaptchaX.initialize()`: SDK 初始化
- `CaptchaX.getCaptcha()`: 获取验证码
- `CaptchaX.verify()`: 验证验证码

### 3. CaptchaUtils (工具类)
- 随机数生成
- 轨迹点生成
- 距离计算
- 角度计算
- 点与图形位置关系判断

### 4. 验证码组件

#### 滑块验证码 (CaptchaSlider)
- 拖动滑块完成验证
- 跟踪滑动轨迹
- 支持自定义样式
- 状态管理：加载、验证中、成功、失败

#### 点选验证码 (CaptchaClick)
- 点击指定目标完成验证
- 可配置目标数量
- 显示点击顺序标记
- 进度指示器

#### 拼图验证码 (CaptchaPuzzle)
- 拖动拼图块到正确位置
- 自定义拼图绘制器
- 位置匹配验证
- 动画反馈

#### 旋转验证码 (CaptchaRotate)
- 旋转图片对齐缺口
- 角度实时显示
- 手势识别
- 容差范围验证

#### 文字验证码 (CaptchaText)
- 输入图片中的文字
- 文本输入验证
- 错误提示
- 自动刷新

#### 图标验证码 (CaptchaIcon)
- 从网格中选择正确图标
- 多选支持
- 视觉反馈
- 默认图标备选

## API 端点

### 获取验证码
- URL: `POST /api/v1/captcha/{type}`
- 返回: `CaptchaData`

### 验证答案
- URL: `POST /api/v1/captcha/{type}/verify`
- 请求: `CaptchaVerifyRequest`
- 返回: `CaptchaVerifyResult`

## 验证码类型
1. `slider` - 滑块验证码
2. `click` - 点选验证码
3. `puzzle` - 拼图验证码
4. `rotate` - 旋转验证码
5. `text` - 文字验证码
6. `icon` - 图标验证码

## 使用示例

```dart
// 初始化
CaptchaX.initialize(
  baseUrl: 'https://captchax.example.com',
  timeout: Duration(seconds: 30),
  enableDebug: true,
);

// 使用滑块验证码
CaptchaSlider(
  onVerified: (result) {
    print('验证成功: ${result.success}');
  },
  onError: (error) {
    print('错误: $error');
  },
)
```

## 文件统计

- Dart 文件总数: 14
- 核心 SDK 文件: 7
- 验证码组件: 6
- 示例项目文件: 3
- 配置文件: 3
- 总代码行数: ~2500+

## 平台支持

- ✅ Android (API 21+)
- ✅ iOS (12.0+)

## 依赖项

### SDK 依赖
- `flutter`: SDK
- `http`: 网络请求
- `cached_network_image`: 图片缓存
- `flutter_cache_manager`: 缓存管理

### 开发依赖
- `flutter_test`: 测试框架
- `flutter_lints`: 代码规范

## 特性

1. **完整的验证码类型支持**: 6种主流验证码类型
2. **灵活的配置选项**: 颜色、尺寸、回调等
3. **完善的错误处理**: 异常捕获和错误提示
4. **状态管理**: 加载、验证中、成功、失败状态
5. **响应式设计**: 适配不同屏幕尺寸
6. **Material Design**: 遵循 Flutter 设计规范
7. **易于集成**: 简单易用的 API
8. **示例项目**: 完整的演示代码

## 下一步

1. 运行 `flutter pub get` 获取依赖
2. 运行 `flutter analyze` 检查代码质量
3. 运行示例项目测试功能
4. 根据需要调整配置
