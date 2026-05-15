# CaptchaX HarmonyOS SDK

CaptchaX HarmonyOS SDK 是专为鸿蒙操作系统设计的验证码集成解决方案，支持多种验证码类型，包括滑块验证、点选验证、拼图验证、旋转验证、文字验证和图标验证。

## 功能特性

### 支持的验证码类型

- **滑块验证 (Slider Captcha)**: 用户通过拖动滑块完成拼图验证
- **点选验证 (Click Captcha)**: 用户点击图像中的指定目标完成验证
- **拼图验证 (Puzzle Captcha)**: 用户将拼图块移动到正确位置完成验证
- **旋转验证 (Rotate Captcha)**: 用户旋转图像到指定角度完成验证
- **文字验证 (Text Captcha)**: 用户输入显示的文字完成验证
- **图标验证 (Icon Captcha)**: 用户选择包含特定内容的图标完成验证

### 核心功能

- 单例模式设计，简化 SDK 初始化和管理
- 支持自定义服务器地址配置
- 内置网络请求重试机制
- 支持本地数据持久化存储
- 完整的回调事件系统
- 响应式布局，适配不同设备尺寸
- 支持 Flat 和 Foldable 设备

## 项目结构

```
captchax/sdk/harmonyos/
├── entry/                          # 示例应用
│   └── src/main/
│       ├── ets/
│       │   └── pages/
│       │       └── Index.ets       # 示例首页
│       ├── resources/               # 资源文件
│       └── module.json5            # 模块配置
├── library/                        # SDK 库
│   └── src/main/
│       ├── ets/
│       │   ├── core/
│       │   │   └── CaptchaX.ets    # 核心 SDK 类
│       │   ├── components/
│       │   │   ├── SliderCaptcha.ets      # 滑块验证码组件
│       │   │   ├── ClickCaptcha.ets       # 点选验证码组件
│       │   │   ├── PuzzleCaptcha.ets      # 拼图验证码组件
│       │   │   ├── RotateCaptcha.ets      # 旋转验证码组件
│       │   │   ├── TextCaptcha.ets        # 文字验证码组件
│       │   │   ├── IconCaptcha.ets        # 图标验证码组件
│       │   │   └── CaptchaContainer.ets   # 验证码容器组件
│       │   ├── services/
│       │   │   ├── network.service.ets    # 网络服务
│       │   │   └── storage.service.ets   # 存储服务
│       │   ├── types/
│       │   │   └── captcha.types.ets     # 类型定义
│       │   └── index.ets                  # 导出索引
│       ├── resources/                     # 资源文件
│       ├── app.json5                      # 应用配置
│       └── module.json5                  # 模块配置
└── build-profile.json5             # 构建配置
```

## 快速开始

### 环境要求

- HarmonyOS SDK API Version 9+
- ArkTS 开发语言
- DevEco Studio 3.0+

### 安装

1. 将 `library` 目录添加到您的项目中
2. 在项目的 `module.json5` 中添加依赖配置

```json
{
  "dependencies": {
    "captchax_sdk": "./library"
  }
}
```

### 初始化 SDK

```typescript
import { CaptchaX } from 'captchax_sdk';

// 初始化 SDK
const captchaX = CaptchaX.getInstance({
  baseUrl: 'http://localhost:3000',  // 服务器地址
  timeout: 30000,                     // 请求超时时间（毫秒）
  retryCount: 3,                      // 重试次数
  retryDelay: 1000                    // 重试延迟（毫秒）
});

// 在应用入口初始化
await captchaX.initialize(context);

// 设置回调
captchaX.setCallbacks({
  onReady: () => {
    console.info('SDK 初始化完成');
  },
  onError: (error) => {
    console.error('SDK 错误:', error);
  },
  onExpire: () => {
    console.info('验证码已过期');
  },
  onClose: () => {
    console.info('验证码已关闭');
  }
});
```

### 获取验证码

```typescript
// 获取滑块验证码
const sliderResponse = await captchaX.getCaptcha(CaptchaType.SLIDER);

if (sliderResponse.success && sliderResponse.data) {
  const captchaData = sliderResponse.data;
  // 使用 captchaData 渲染验证码组件
}
```

### 验证结果

```typescript
const result = await captchaX.verify({
  captchaId: 'captcha_id_from_data',
  userResponse: {
    sliderX: 200,
    track: [{ x: 10, y: 20, timestamp: 100 }]
  }
});

if (result.verified) {
  console.info('验证成功，Token:', result.token);
} else {
  console.error('验证失败:', result.message);
}
```

## 验证码组件使用

### 滑块验证码

```typescript
import { SliderCaptcha } from 'captchax_sdk';

@Entry
@Component
struct SliderPage {
  build() {
    Column() {
      SliderCaptcha({
        backgroundImage: 'https://example.com/bg.jpg',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        targetX: 200,
        width: 300,
        height: 200,
        onVerified: (result) => {
          console.info('滑块验证成功', JSON.stringify(result));
        },
        onError: (error) => {
          console.error('滑块验证失败', error);
        },
        onRefresh: () => {
          console.info('刷新验证码');
        }
      })
    }
  }
}
```

### 点选验证码

```typescript
import { ClickCaptcha } from 'captchax_sdk';

@Entry
@Component
struct ClickPage {
  private targets: ClickTarget[] = [
    { x: 100, y: 80, width: 40, height: 40 },
    { x: 200, y: 120, width: 40, height: 40 }
  ];

  build() {
    Column() {
      ClickCaptcha({
        backgroundImage: 'https://example.com/bg.jpg',
        width: 300,
        height: 200,
        targets: this.targets,
        onVerified: (result) => {
          console.info('点选验证成功', JSON.stringify(result));
        }
      })
    }
  }
}
```

### 拼图验证码

```typescript
import { PuzzleCaptcha } from 'captchax_sdk';

@Entry
@Component
struct PuzzlePage {
  build() {
    Column() {
      PuzzleCaptcha({
        backgroundImage: 'https://example.com/bg.jpg',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        puzzleUrl: 'https://example.com/puzzle.jpg',
        targetX: 200,
        targetY: 50,
        width: 300,
        height: 200,
        onVerified: (result) => {
          console.info('拼图验证成功', JSON.stringify(result));
        }
      })
    }
  }
}
```

### 旋转验证码

```typescript
import { RotateCaptcha } from 'captchax_sdk';

@Entry
@Component
struct RotatePage {
  build() {
    Column() {
      RotateCaptcha({
        imageUrl: 'https://example.com/image.jpg',
        targetAngle: 45,
        width: 200,
        height: 200,
        onVerified: (result) => {
          console.info('旋转验证成功', JSON.stringify(result));
        }
      })
    }
  }
}
```

### 文字验证码

```typescript
import { TextCaptcha } from 'captchax_sdk';

@Entry
@Component
struct TextPage {
  build() {
    Column() {
      TextCaptcha({
        text: 'ABC123',
        hint: '请输入上方文字',
        width: 300,
        onVerified: (result) => {
          console.info('文字验证成功', JSON.stringify(result));
        }
      })
    }
  }
}
```

### 图标验证码

```typescript
import { IconCaptcha } from 'captchax_sdk';

@Entry
@Component
struct IconPage {
  build() {
    Column() {
      IconCaptcha({
        imageUrl: 'https://example.com/bg.jpg',
        instruction: '请点击所有包含"汽车"的图标',
        width: 300,
        height: 200,
        onVerified: (result) => {
          console.info('图标验证成功', JSON.stringify(result));
        }
      })
    }
  }
}
```

## API 参考

### CaptchaX 类

#### `getInstance(config?: CaptchaConfig): CaptchaX`

获取 CaptchaX 单例实例。

**参数：**
- `config`: 可选的配置对象

**返回：**
- CaptchaX 实例

#### `initialize(context: any): Promise<void>`

初始化 SDK。

**参数：**
- `context`: 应用上下文

#### `updateConfig(config: CaptchaConfig): void`

更新 SDK 配置。

#### `setCallbacks(callbacks: CaptchaCallbacks): void`

设置回调函数。

#### `getCaptcha(type: CaptchaType): Promise<CaptchaResponse<CaptchaData>>`

获取指定类型的验证码。

**参数：**
- `type`: 验证码类型

**返回：**
- 验证码响应对象

#### `verify(request: CaptchaVerifyRequest): Promise<CaptchaResult>`

验证验证码结果。

**参数：**
- `request`: 验证请求对象

**返回：**
- 验证结果对象

#### `refresh(type: CaptchaType): Promise<CaptchaResponse<CaptchaData>>`

刷新验证码。

#### `close(): void`

关闭当前验证码。

### 枚举类型

#### `CaptchaType`

验证码类型枚举：

- `SLIDER`: 滑块验证
- `CLICK`: 点选验证
- `PUZZLE`: 拼图验证
- `ROTATE`: 旋转验证
- `TEXT`: 文字验证
- `ICON`: 图标验证

### 接口类型

#### `CaptchaConfig`

SDK 配置接口：

```typescript
interface CaptchaConfig {
  baseUrl?: string;      // 服务器基础地址
  timeout?: number;       // 请求超时时间（毫秒）
  retryCount?: number;    // 重试次数
  retryDelay?: number;    // 重试延迟（毫秒）
  locale?: string;        // 语言设置
}
```

#### `CaptchaData`

验证码数据接口：

```typescript
interface CaptchaData {
  captchaId: string;           // 验证码 ID
  imageUrl?: string;            // 图片地址
  backgroundImage?: string;      // 背景图片地址
  thumbnailUrl?: string;         // 缩略图地址
  track?: TrackPoint[];          // 拖动轨迹
  expiresAt?: string;            // 过期时间
  data?: Record<string, any>;   // 其他数据
}
```

#### `CaptchaCallbacks`

回调函数接口：

```typescript
interface CaptchaCallbacks {
  onReady?: () => void;                              // SDK 就绪回调
  onVerify?: (result: CaptchaResult) => void;        // 验证完成回调
  onError?: (error: string) => void;                 // 错误回调
  onExpire?: () => void;                             // 过期回调
  onClose?: () => void;                               // 关闭回调
}
```

## 服务器端集成

### API 端点

#### 获取验证码

```
POST /api/v1/captcha/{type}
```

**请求参数：**
```json
{
  "locale": "zh_CN"
}
```

**响应：**
```json
{
  "success": true,
  "data": {
    "captchaId": "xxx",
    "imageUrl": "xxx",
    "backgroundImage": "xxx",
    "thumbnailUrl": "xxx",
    "track": [],
    "expiresAt": "xxx"
  }
}
```

#### 验证验证码

```
POST /api/v1/captcha/{type}/verify
```

**请求参数：**
```json
{
  "captchaId": "xxx",
  "track": [],
  "userResponse": {}
}
```

**响应：**
```json
{
  "success": true,
  "token": "xxx",
  "expiresIn": 300
}
```

## 设备适配

### 响应式尺寸

SDK 组件支持响应式布局，自动适配不同屏幕尺寸：

- 手机 (Phone)
- 平板 (Tablet)
- 折叠屏设备 (Foldable)

### 使用示例

```typescript
import display from '@ohos.display';

// 获取屏幕尺寸
const displayData = display.getDefaultDisplaySync();
const screenWidth = displayData.width;
const screenHeight = displayData.height;

// 计算验证码容器尺寸
const containerWidth = Math.min(360, screenWidth * 0.9);
const containerHeight = 450;

// 应用到组件
CaptchaContainer({
  width: containerWidth,
  height: containerHeight
})
```

## 错误处理

### 错误类型

- `NETWORK_ERROR`: 网络错误
- `TIMEOUT`: 请求超时
- `INVALID_CAPTCHA`: 无效验证码
- `EXPIRED_CAPTCHA`: 验证码过期
- `VERIFY_FAILED`: 验证失败

### 处理示例

```typescript
try {
  const response = await captchaX.getCaptcha(CaptchaType.SLIDER);

  if (!response.success) {
    // 处理业务错误
    console.error('获取验证码失败:', response.error);
    return;
  }

  // 处理成功
  const data = response.data;
} catch (error) {
  // 处理异常
  console.error('发生异常:', error);
}
```

## 最佳实践

### 1. SDK 初始化

建议在应用启动时尽早初始化 SDK：

```typescript
// 在 Ability 的 onCreate 中初始化
onCreate(want, launchParam) {
  CaptchaX.getInstance().initialize(this.context);
}
```

### 2. 回调处理

使用箭头函数或绑定 this 以确保正确访问组件状态：

```typescript
captchaX.setCallbacks({
  onVerify: (result) => {
    this.isVerified = result.verified;
    this.token = result.token;
  }
});
```

### 3. 错误重试

合理使用刷新功能：

```typescript
CaptchaContainer({
  onRefresh: async () => {
    // 显示加载状态
    this.isLoading = true;

    try {
      const response = await captchaX.refresh(this.currentType);
      // 更新验证码数据
    } finally {
      // 隐藏加载状态
      this.isLoading = false;
    }
  }
})
```

### 4. 性能优化

- 避免频繁创建 SDK 实例，使用单例模式
- 合理设置请求超时时间
- 在不需要时及时关闭验证码

## 许可证

本项目采用 MIT 许可证。详情请参阅 LICENSE 文件。

## 版本历史

### 1.0.0 (2026-05-15)

- 初始版本发布
- 支持 6 种验证码类型
- 完整的 SDK 功能
- 示例应用

## 技术支持

- 邮箱: support@captchax.com
- 官网: https://captchax.example.com
- 文档: https://docs.captchax.example.com

## 贡献指南

欢迎提交 Issue 和 Pull Request。
