# CaptchaX React Native SDK

## 项目简介

CaptchaX React Native SDK 是一款功能强大、易于集成的多类型验证码解决方案，专为 React Native 应用设计。该 SDK 提供了六种主流验证码类型，包括滑块验证码、点选验证码、拼图验证码、旋转验证码、文字验证码和图标验证码，能够有效防止自动化攻击和机器人行为，同时保持良好的用户体验。

CaptchaX SDK 的核心理念是在安全性和可用性之间取得最佳平衡。传统的图片验证码往往用户体验较差，用户需要多次尝试才能通过验证，这不仅浪费用户时间，还可能导致用户流失。CaptchaX 通过精心设计的交互方式和即时反馈机制，显著提升了验证码的通过率和用户满意度。无论是登录注册、密码找回，还是敏感操作验证，CaptchaX 都能提供可靠的保障。

本 SDK 采用纯 TypeScript 开发，提供了完整的类型定义支持，让开发者能够在集成过程中获得良好的开发体验和代码提示。所有组件都经过优化，能够在不同尺寸的移动设备上保持一致的视觉效果和流畅的交互体验。同时，SDK 支持自定义主题样式，开发者可以根据应用的整体设计风格调整验证码组件的外观，实现无缝集成。

## 核心特性

CaptchaX React Native SDK 具备多项优秀特性，使其成为移动端验证码解决方案的理想选择。

**多类型验证码支持**：SDK 内置六种不同类型的验证码组件，每种类型都针对特定的使用场景进行了优化。滑块验证码适合常规登录场景，操作简单直观；点选验证码适用于需要用户识别特定目标的场景；拼图验证码提供了更高的安全性；旋转验证码通过角度识别增加了破解难度；文字验证码适合简单快速的验证需求；图标验证码则通过图 selection 交互提供了新颖的用户体验。

**原生性能优化**：所有验证码组件都基于 React Native 的原生组件开发，确保在不同设备和操作系统版本上都能保持流畅的运行性能。动画效果采用原生驱动，滑动和旋转操作响应迅速，不会出现卡顿或延迟现象。同时，SDK 对内存占用进行了严格控制，即使在低端设备上也能正常运行。

**完整的类型支持**：整个 SDK 采用 TypeScript 开发，提供了完整的类型定义文件。开发者可以充分利用 TypeScript 的类型检查功能，在编译阶段发现潜在错误，减少运行时异常。类型定义涵盖了所有 API、组件 Props、回调函数参数等，确保代码的可靠性和可维护性。

**灵活的配置选项**：SDK 提供了丰富的配置选项，开发者可以根据实际需求定制验证码的行为和外观。支持自定义的主题颜色、尺寸大小、成功失败提示文案等。同时，所有配置项都提供了合理的默认值，开发者可以快速上手，也可以深入定制。

**Native Module 集成**：SDK 包含了完整的 iOS（Swift）和 Android（Kotlin）原生模块，为验证码的底层实现提供了稳定可靠的技术支撑。原生模块处理网络请求、数据加密、图像处理等计算密集型任务，确保验证码的安全性和响应速度。

## 安装指南

### 环境要求

在开始安装 CaptchaX SDK 之前，请确保您的开发环境满足以下要求。React Native 版本需要 0.60.0 或更高版本，这是因为 SDK 使用了 React Native 的新架构特性，如 Hooks 和并发渲染支持。Node.js 版本建议使用 14.x 或更高版本，以获得更好的性能和对现代 JavaScript 特性的支持。如果您的项目使用 Expo 进行开发，SDK 同样提供了良好的兼容性支持。

对于 iOS 开发环境，您需要安装 Xcode 11.0 或更高版本，并确保已配置好 CocoaPods 环境。iOS 部署目标建议设置为 iOS 12.0 或更高版本，以覆盖大多数设备。如果使用 Swift 进行原生开发，请确保 Swift 版本为 5.0 或更高。

对于 Android 开发环境，需要 Android Studio Arctic Fox 或更高版本，以及 Gradle 6.5 或更高版本。Android 最低 SDK 版本建议设置为 21（Android 5.0），以确保在大多数 Android 设备上正常运行。Kotlin 版本建议使用 1.5.0 或更高版本。

### 安装步骤

首先，通过 npm 或 yarn 安装 CaptchaX SDK 包。在项目根目录下执行以下命令之一：

使用 npm 安装（推荐）：
```bash
npm install captchax-react-native-sdk
```

或者使用 yarn 安装：
```bash
yarn add captchax-react-native-sdk
```

安装完成后，对于 iOS 项目，需要在 ios 目录下执行 pod install 命令来安装原生依赖：
```bash
cd ios
pod install
cd ..
```

对于 Android 项目，原生模块会在构建时自动链接，无需额外配置。如果使用 React Native 0.60 以下版本，可能需要手动链接原生模块。

### 配置说明

安装完成后，需要进行基本的配置才能正常使用 SDK。首先，需要配置验证码服务的 API 地址。在应用的入口文件（如 App.tsx 或 index.js）中初始化 CaptchaX 实例：

```typescript
import { CaptchaX } from 'captchax-react-native-sdk';

const captchaX = new CaptchaX({
  baseUrl: 'https://captchax.example.com', // 生产环境地址
  timeout: 30000, // 请求超时时间（毫秒）
  headers: {
    // 可选的自定义请求头
    'X-App-Version': '1.0.0',
  },
});
```

对于 iOS 项目，如果遇到网络请求失败的问题，需要在 Info.plist 中添加 App Transport Security 配置，允许 HTTP 请求（仅适用于开发环境）。对于正式环境，建议使用 HTTPS 协议。

对于 Android 项目，如果需要支持 HTTP 请求，需要在 AndroidManifest.xml 的 application 标签中添加 android:usesCleartextTraffic="true" 属性（仅适用于开发环境）。

## 快速开始

### 基础使用示例

以下是一个完整的基础使用示例，展示了如何在登录页面中集成验证码功能：

```typescript
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Alert,
} from 'react-native';
import { CaptchaX } from 'captchax-react-native-sdk';
import SliderCaptcha from 'captchax-react-native-sdk/src/components/SliderCaptcha';
import { CaptchaType, CaptchaData, VerifyResponse } from 'captchax-react-native-sdk/src/types';

// 初始化 CaptchaX 实例
const captchaX = new CaptchaX({
  baseUrl: 'https://captchax.example.com',
});

const LoginScreen: React.FC = () => {
  const [showCaptcha, setShowCaptcha] = useState(false);
  const [captchaData, setCaptchaData] = useState<CaptchaData | null>(null);

  const handleLoginPress = async () => {
    // 显示验证码
    setShowCaptcha(true);
    
    // 加载验证码数据
    try {
      const response = await captchaX.getCaptcha('slider');
      if (response.success && response.data) {
        setCaptchaData(response.data);
      } else {
        Alert.alert('错误', '验证码加载失败');
        setShowCaptcha(false);
      }
    } catch (error) {
      Alert.alert('错误', '网络连接失败');
      setShowCaptcha(false);
    }
  };

  const handleCaptchaSuccess = (result: VerifyResponse) => {
    if (result.success) {
      Alert.alert('成功', '验证通过，正在登录...');
      // 执行登录逻辑
      setShowCaptcha(false);
    } else {
      Alert.alert('失败', result.message || '验证失败');
    }
  };

  const handleCaptchaClose = () => {
    setShowCaptcha(false);
    setCaptchaData(null);
  };

  const handleCaptchaRefresh = async () => {
    try {
      const response = await captchaX.getCaptcha('slider');
      if (response.success && response.data) {
        setCaptchaData(response.data);
      }
    } catch (error) {
      console.error('刷新验证码失败:', error);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.loginButton}
        onPress={handleLoginPress}
      >
        <Text style={styles.loginButtonText}>登录</Text>
      </TouchableOpacity>

      <Modal
        visible={showCaptcha}
        transparent
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {captchaData && (
              <SliderCaptcha
                captchaData={captchaData}
                onSuccess={handleCaptchaSuccess}
                onClose={handleCaptchaClose}
                onRefresh={handleCaptchaRefresh}
                width={300}
                height={200}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loginButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 8,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 350,
  },
});

export default LoginScreen;
```

### 使用不同验证码类型

CaptchaX SDK 支持六种不同的验证码类型，开发者可以根据实际需求选择合适的类型。以下是各种验证码类型的使用方法概述。

滑块验证码是最常用的类型之一，适合大多数场景。用户需要将滑块拖动到指定位置来完成验证。集成方式如下：

```typescript
import SliderCaptcha from 'captchax-react-native-sdk/src/components/SliderCaptcha';

// 在 Modal 中使用
<SliderCaptcha
  captchaData={captchaData}
  onSuccess={handleSuccess}
  onFail={handleFail}
  onClose={handleClose}
  onRefresh={handleRefresh}
  width={300}
  height={200}
/>
```

点选验证码要求用户按照指定顺序点击图中的多个目标位置。这种类型适合需要用户识别特定物体的场景：

```typescript
import ClickCaptcha from 'captchax-react-native-sdk/src/components/ClickCaptcha';

<ClickCaptcha
  captchaData={captchaData}
  onSuccess={handleSuccess}
  maxClicks={4}  // 指定需要点击的目标数量
  width={300}
  height={200}
/>
```

拼图验证码让用户将打乱的拼图块拖动到正确位置，结合了滑块和拼图的交互方式：

```typescript
import PuzzleCaptcha from 'captchax-react-native-sdk/src/components/PuzzleCaptcha';

<PuzzleCaptcha
  captchaData={captchaData}
  onSuccess={handleSuccess}
  puzzleSize={50}  // 拼图块大小
  width={300}
  height={200}
/>
```

旋转验证码要求用户将图片旋转到指定角度，可以通过触摸拖动或按钮控制角度：

```typescript
import RotateCaptcha from 'captchax-react-native-sdk/src/components/RotateCaptcha';

<RotateCaptcha
  captchaData={captchaData}
  onSuccess={handleSuccess}
  imageSize={200}  // 图片尺寸
  width={300}
  height={300}
/>
```

文字验证码显示一组文字或数字，要求用户正确输入：

```typescript
import TextCaptcha from 'captchax-react-native-sdk/src/components/TextCaptcha';

<TextCaptcha
  captchaData={captchaData}
  onSuccess={handleSuccess}
  placeholder="请输入上方文字"
  width={300}
  height={150}
/>
```

图标验证码展示多个图标，要求用户选择符合描述的图标：

```typescript
import IconCaptcha from 'captchax-react-native-sdk/src/components/IconCaptcha';

<IconCaptcha
  captchaData={captchaData}
  onSuccess={handleSuccess}
  iconCount={9}      // 图标总数
  targetIcons={[1, 3, 5]}  // 需要选择的图标索引
  width={300}
  height={400}
/>
```

## API 参考

### CaptchaX 类

CaptchaX 是 SDK 的核心类，提供了所有验证码相关的 API 方法。

#### 构造函数

```typescript
constructor(config: CaptchaConfig)
```

创建一个 CaptchaX 实例。config 参数包含以下配置项：

baseUrl（string）：验证码服务的 API 地址，默认为 https://captchax.example.com。开发环境可设置为 http://localhost:3000。

timeout（number）：请求超时时间，单位为毫秒，默认为 30000（30秒）。

headers（Record<string, string>）：可选的自定义请求头，可用于传递认证令牌等信息。

#### getCaptcha

```typescript
async getCaptcha(type: CaptchaType): Promise<CaptchaResponse>
```

获取指定类型的验证码。type 参数支持以下值：slider、click、puzzle、rotate、text、icon。返回 CaptchaResponse 对象，包含验证码数据和操作结果。

#### verifyCaptcha

```typescript
async verifyCaptcha(request: VerifyRequest): Promise<VerifyResponse>
```

提交验证码验证请求。request 参数包含 captchaId、track（用户操作轨迹）和 userResponse（用户响应数据）。返回 VerifyResponse 对象，包含验证结果。

#### verifySliderCaptcha

```typescript
async verifySliderCaptcha(
  captchaId: string,
  offsetX: number,
  track: CaptchaTrack[]
): Promise<VerifyResponse>
```

便捷方法，用于验证滑块验证码。offsetX 为滑块的水平偏移量。

#### verifyClickCaptcha

```typescript
async verifyClickCaptcha(
  captchaId: string,
  positions: Array<{ x: number; y: number }>,
  track: CaptchaTrack[]
): Promise<VerifyResponse>
```

便捷方法，用于验证点选验证码。positions 为用户点击的位置坐标数组。

#### verifyRotateCaptcha

```typescript
async verifyRotateCaptcha(
  captchaId: string,
  angle: number,
  track: CaptchaTrack[]
): Promise<VerifyResponse>
```

便捷方法，用于验证旋转验证码。angle 为图片的旋转角度。

#### verifyTextCaptcha

```typescript
async verifyTextCaptcha(
  captchaId: string,
  text: string,
  track: CaptchaTrack[]
): Promise<VerifyResponse>
```

便捷方法，用于验证文字验证码。text 为用户输入的文字。

#### verifyIconCaptcha

```typescript
async verifyIconCaptcha(
  captchaId: string,
  selectedIcons: number[],
  track: CaptchaTrack[]
): Promise<VerifyResponse>
```

便捷方法，用于验证图标验证码。selectedIcons 为用户选择的图标索引数组。

#### verifyPuzzleCaptcha

```typescript
async verifyPuzzleCaptcha(
  captchaId: string,
  offsetX: number,
  offsetY: number,
  track: CaptchaTrack[]
): Promise<VerifyResponse>
```

便捷方法，用于验证拼图验证码。offsetX 和 offsetY 分别为拼图块的水平垂直偏移量。

#### updateConfig

```typescript
updateConfig(config: Partial<CaptchaConfig>): void
```

更新 SDK 配置。可以部分更新配置项，未提供的配置项保持原有值。

### 类型定义

#### CaptchaConfig

验证码配置接口，定义如下：

```typescript
interface CaptchaConfig {
  baseUrl: string;
  timeout?: number;
  headers?: Record<string, string>;
}
```

#### CaptchaType

验证码类型枚举，支持以下值：slider、click、puzzle、rotate、text、icon。

#### CaptchaData

验证码数据接口，定义如下：

```typescript
interface CaptchaData {
  captchaId: string;
  imageUrl?: string;
  backgroundImage?: string;
  thumbnailUrl?: string;
  track: CaptchaTrack[];
  expiresAt: string;
  puzzleImage?: string;
  targetAngle?: number;
  text?: string;
  icons?: string[];
  clickPositions?: Array<{ x: number; y: number }>;
}
```

#### CaptchaTrack

用户操作轨迹接口，定义如下：

```typescript
interface CaptchaTrack {
  x: number;
  y: number;
  timestamp: number;
}
```

#### CaptchaResponse

验证码获取响应接口，定义如下：

```typescript
interface CaptchaResponse {
  success: boolean;
  data?: CaptchaData;
  error?: string;
  message?: string;
}
```

#### VerifyRequest

验证码验证请求接口，定义如下：

```typescript
interface VerifyRequest {
  captchaId: string;
  track: CaptchaTrack[];
  userResponse: SliderResponse | ClickResponse | RotateResponse | TextResponse | IconResponse | PuzzleResponse;
}
```

#### VerifyResponse

验证码验证响应接口，定义如下：

```typescript
interface VerifyResponse {
  success: boolean;
  message?: string;
  score?: number;
  token?: string;
}
```

## 组件参考

### SliderCaptcha（滑块验证码组件）

滑块验证码是最直观易用的验证码类型，通过拖动滑块完成验证。

#### Props

captchaData（CaptchaData，必填）：验证码数据对象，包含验证码图片和相关信息。

onSuccess（function，必填）：验证成功回调函数，接收 VerifyResponse 参数。

onFail（function，可选）：验证失败回调函数，接收错误信息字符串参数。

onClose（function，可选）：关闭验证码弹窗回调函数。

onRefresh（function，可选）：刷新验证码回调函数。

width（number，可选）：验证码容器宽度，默认为 300。

height（number，可选）：验证码图片高度，默认为 200。

imageWidth（number，可选）：图片宽度，默认为 300。

imageHeight（number，可选）：图片高度，默认为 200。

targetPosition（object，可选）：目标位置坐标，格式为 { x: number, y: number }。

#### 使用示例

```typescript
import SliderCaptcha from 'captchax-react-native-sdk/src/components/SliderCaptcha';

const [captchaData, setCaptchaData] = useState(null);

<SliderCaptcha
  captchaData={captchaData}
  onSuccess={(result) => {
    console.log('验证成功:', result);
    // 执行后续操作
  }}
  onFail={(error) => {
    console.log('验证失败:', error);
  }}
  onRefresh={() => {
    // 重新加载验证码
  }}
  width={300}
  height={200}
/>
```

### ClickCaptcha（点选验证码组件）

点选验证码要求用户按照指定顺序点击图中的多个目标。

#### Props

captchaData（CaptchaData，必填）：验证码数据对象。

onSuccess（function，必填）：验证成功回调函数。

onFail（function，可选）：验证失败回调函数。

onClose（function，可选）：关闭验证码弹窗回调函数。

onRefresh（function，可选）：刷新验证码回调函数。

width（number，可选）：验证码容器宽度，默认为 300。

height（number，可选）：验证码图片高度，默认为 200。

targetPositions（array，可选）：目标位置坐标数组。

maxClicks（number，可选）：最大点击次数，默认为 4。

#### 使用示例

```typescript
import ClickCaptcha from 'captchax-react-native-sdk/src/components/ClickCaptcha';

<ClickCaptcha
  captchaData={captchaData}
  onSuccess={(result) => {
    console.log('验证成功:', result);
  }}
  maxClicks={4}  // 要求点击4个目标
  width={300}
  height={200}
/>
```

### PuzzleCaptcha（拼图验证码组件）

拼图验证码将滑块验证码和拼图概念结合，用户需要将拼图块拖动到正确位置。

#### Props

captchaData（CaptchaData，必填）：验证码数据对象。

onSuccess（function，必填）：验证成功回调函数。

onFail（function，可选）：验证失败回调函数。

onClose（function，可选）：关闭验证码弹窗回调函数。

onRefresh（function，可选）：刷新验证码回调函数。

width（number，可选）：验证码容器宽度，默认为 300。

height（number，可选）：验证码图片高度，默认为 200。

targetPosition（object，可选）：拼图目标位置坐标。

imageWidth（number，可选）：图片宽度，默认为 300。

imageHeight（number，可选）：图片高度，默认为 200。

puzzleSize（number，可选）：拼图块大小，默认为 50。

#### 使用示例

```typescript
import PuzzleCaptcha from 'captchax-react-native-sdk/src/components/PuzzleCaptcha';

<PuzzleCaptcha
  captchaData={captchaData}
  onSuccess={(result) => {
    console.log('验证成功:', result);
  }}
  puzzleSize={50}
  width={300}
  height={200}
/>
```

### RotateCaptcha（旋转验证码组件）

旋转验证码要求用户将图片旋转到指定角度。

#### Props

captchaData（CaptchaData，必填）：验证码数据对象。

onSuccess（function，必填）：验证成功回调函数。

onFail（function，可选）：验证失败回调函数。

onClose（function，可选）：关闭验证码弹窗回调函数。

onRefresh（function，可选）：刷新验证码回调函数。

width（number，可选）：验证码容器宽度，默认为 300。

height（number，可选）：验证码容器高度，默认为 300。

targetAngle（number，可选）：目标旋转角度。

imageSize（number，可选）：图片尺寸，默认为 200。

#### 使用示例

```typescript
import RotateCaptcha from 'captchax-react-native-sdk/src/components/RotateCaptcha';

<RotateCaptcha
  captchaData={captchaData}
  onSuccess={(result) => {
    console.log('验证成功:', result);
  }}
  imageSize={200}
  width={300}
  height={300}
/>
```

### TextCaptcha（文字验证码组件）

文字验证码显示一组文字或数字，要求用户正确输入。

#### Props

captchaData（CaptchaData，必填）：验证码数据对象。

onSuccess（function，必填）：验证成功回调函数。

onFail（function，可选）：验证失败回调函数。

onClose（function，可选）：关闭验证码弹窗回调函数。

onRefresh（function，可选）：刷新验证码回调函数。

width（number，可选）：验证码容器宽度，默认为 300。

height（number，可选）：验证码图片高度，默认为 200。

expectedText（string，可选）：期望用户输入的文字。

placeholder（string，可选）：输入框占位符，默认为“请输入上方文字”。

inputWidth（number，可选）：输入框宽度，默认为 250。

#### 使用示例

```typescript
import TextCaptcha from 'captchax-react-native-sdk/src/components/TextCaptcha';

<TextCaptcha
  captchaData={captchaData}
  onSuccess={(result) => {
    console.log('验证成功:', result);
  }}
  placeholder="请输入验证码"
  width={300}
  height={200}
/>
```

### IconCaptcha（图标验证码组件）

图标验证码展示多个图标，要求用户选择符合描述的图标。

#### Props

captchaData（CaptchaData，必填）：验证码数据对象。

onSuccess（function，必填）：验证成功回调函数。

onFail（function，可选）：验证失败回调函数。

onClose（function，可选）：关闭验证码弹窗回调函数。

onRefresh（function，可选）：刷新验证码回调函数。

width（number，可选）：验证码容器宽度，默认为 300。

height（number，可选）：验证码容器高度，默认为 400。

iconCount（number，可选）：显示的图标数量，默认为 9。

targetIcons（array，可选）：需要选择的图标索引数组。

iconsPerRow（number，可选）：每行显示的图标数量，默认为 3。

#### 使用示例

```typescript
import IconCaptcha from 'captchax-react-native-sdk/src/components/IconCaptcha';

<IconCaptcha
  captchaData={captchaData}
  onSuccess={(result) => {
    console.log('验证成功:', result);
  }}
  iconCount={9}
  targetIcons={[1, 3, 5]}  // 需要选择第2、4、6个图标
  width={300}
  height={400}
/>
```

## 原生模块集成

CaptchaX SDK 包含了针对 iOS 和 Android 平台的原生模块，用于处理底层的网络请求和数据处理任务。这些原生模块经过优化，能够提供更好的性能和稳定性。

### iOS 原生模块

iOS 原生模块使用 Swift 语言开发，位于 ios 目录下。核心文件包括 CaptchaXModule.swift 和 CaptchaXModule.m（Objective-C 桥接文件）。

CaptchaXModule 提供了以下功能：setBaseUrl 方法用于设置 API 地址；setTimeout 方法用于设置请求超时时间；getCaptcha 方法用于获取验证码；verifyCaptcha 方法用于验证验证码；trackUserAction 方法用于记录用户操作轨迹。

在项目中集成 iOS 原生模块时，需要确保在 Xcode 项目中正确配置了 Swift 版本和依赖。如果使用 CocoaPods 管理依赖，原生模块会自动链接。

### Android 原生模块

Android 原生模块使用 Kotlin 语言开发，位于 android 目录下。核心文件包括 CaptchaXModule.kt 和 CaptchaXPackage.kt。

CaptchaXModule 提供了与 iOS 版本相同的功能接口，确保两个平台的行为一致。CaptchaXPackage 用于注册原生模块到 React Native 容器中。

在 Android 项目中，如果使用 React Native 0.60 及以上版本，原生模块会自动链接。如果需要手动集成，需要在 MainApplication.java 中添加包注册代码。

## 最佳实践

### 验证码使用建议

在实际应用中合理使用验证码非常重要。过度使用验证码会影响用户体验，而使用不足则可能无法有效防止自动化攻击。以下是一些最佳实践建议。

**选择合适的验证码类型**：根据不同的使用场景选择最合适的验证码类型。登录注册场景推荐使用滑块验证码或拼图验证码，操作简单且安全可靠。敏感操作（如修改密码、支付）推荐使用点选验证码或旋转验证码，提供更高的安全性。简单的表单验证可以使用文字验证码或图标验证码。

**控制验证码显示频率**：不要在每次操作时都要求用户完成验证码，这会严重影响用户体验。建议在以下情况下触发验证码：用户首次登录时；检测到异常行为时；执行敏感操作时；长时间未活动后重新操作时；同一 IP 或设备短时间内多次尝试时。

**提供清晰的反馈信息**：当验证码验证失败时，应该向用户提供清晰的错误提示信息，帮助用户理解问题所在。同时，应该提供刷新验证码的选项，让用户能够重新尝试。

**记录用户行为轨迹**：CaptchaX SDK 会自动记录用户完成验证码时的操作轨迹（track）。这些数据对于分析用户行为模式和检测异常非常重要。建议将轨迹数据与验证码验证结果一起保存，用于后续的安全分析。

### 性能优化建议

为了确保验证码组件在各种设备上都能流畅运行，建议遵循以下性能优化建议。

**延迟加载验证码**：不要在页面初始化时就加载验证码，这会增加首屏加载时间。应该在用户即将进行需要验证的操作时（如点击登录按钮）再加载验证码。

**缓存验证码数据**：CaptchaX SDK 会在验证成功后返回 token，建议在一定时间内（通常为 5 分钟）缓存这个 token。在此期间，用户再次访问时可以直接使用缓存的 token，无需重新验证。

**优化图片资源**：验证码图片可能会占用较大的内存，建议使用适当尺寸的图片（通常 300x200 像素足够）。同时，确保图片格式为 WebP 或 JPEG，避免使用过大的 PNG 图片。

**控制动画帧率**：验证码组件中的动画效果会影响性能。建议将动画帧率控制在 60fps，同时避免在动画过程中进行复杂的计算操作。

### 安全性考虑

验证码虽然能够有效防止自动化攻击，但自身也需要做好安全保护。以下是一些安全性考虑要点。

**使用 HTTPS**：生产环境必须使用 HTTPS 协议传输验证码数据，避免中间人攻击和信息泄露。CaptchaX SDK 默认使用 HTTPS，如果必须使用 HTTP，请确保在安全的网络环境下。

**验证服务端**：验证码的验证过程必须在服务端完成，客户端只负责展示和收集用户输入。任何在客户端完成的验证都可能被绕过。

**防止重放攻击**：CaptchaX SDK 返回的验证 token 应该设置有效期，并且只能使用一次。在服务端实现时，应该记录已使用的 token，防止重放攻击。

**保护 API 密钥**：如果验证码服务需要 API 密钥，应该将密钥存储在服务端，而不是客户端应用代码中。客户端通过接口获取验证码数据，而不是直接访问验证码服务的 API。

## 常见问题

### 验证码加载失败怎么办

验证码加载失败可能有多种原因。首先检查网络连接是否正常，确保设备能够访问验证码服务 API 地址。如果是开发环境，检查是否正确配置了 HTTP 协议（生产环境必须使用 HTTPS）。检查防火墙设置，确保允许访问验证码服务的端口。确认验证码服务是否正常运行，可以尝试直接访问 API 地址进行测试。如果问题仍然存在，可以查看 SDK 的日志输出获取更多调试信息。

### 如何自定义验证码样式

CaptchaX SDK 提供了多种方式自定义验证码样式。基础的自定义可以通过组件的 props 实现，如设置 width、height 参数调整尺寸。更深层次的自定义可以通过覆盖组件的样式实现，SDK 的组件都使用了 StyleSheet 进行样式管理，可以传入自定义样式对象。对于完全自定义的外观，可以基于 SDK 提供的数据和回调函数，自己实现验证码组件的 UI。

### 验证码超时如何处理

验证码数据包含过期时间（expiresAt），超过这个时间后验证码会失效。当用户操作超时（如填写表单时间过长）时，应该提示用户验证码已过期，并提供刷新选项。CaptchaX SDK 的组件会自动处理超时情况，用户可以随时点击刷新按钮获取新的验证码。

### 如何在不同屏幕尺寸上适配

CaptchaX SDK 的验证码组件使用了响应式设计，能够在不同屏幕尺寸上自动调整布局。组件的 width 和 height 属性支持数值和百分比两种形式。对于小屏幕设备，建议将 width 设置为屏幕宽度的 90% 左右，以避免内容溢出。如果需要更精细的控制，可以使用 Dimensions API 获取屏幕尺寸，然后动态计算验证码组件的大小。

### Native Module 链接失败怎么处理

如果在 iOS 上遇到 Native Module 链接失败的问题，首先尝试清理构建缓存并重新安装依赖。对于 CocoaPods 项目，在 ios 目录下执行 pod install --repo-update。如果问题仍然存在，检查 Podfile 中是否正确包含了 SDK 的依赖。同时确保 Xcode 项目中正确配置了 Swift 版本（需要 5.0 或更高）。对于手动集成的情况，检查是否正确添加了原生模块文件到项目中。

对于 Android 上的问题，首先确认 Kotlin 插件版本与原生模块兼容。检查 build.gradle 文件中的依赖配置是否正确。确保在 MainApplication.java 或 MainApplication.kt 中正确注册了 CaptchaXPackage。如果使用 React Native 0.60 以下版本，可能需要手动运行 react-native link 命令进行链接。

## 更新日志

### v1.0.0（当前版本）

初始版本发布，包含以下功能：六种验证码类型完整实现，包括滑块验证码、点选验证码、拼图验证码、旋转验证码、文字验证码和图标验证码；完整的 TypeScript 类型定义支持；iOS（Swift）和 Android（Kotlin）原生模块集成；丰富的配置选项和回调函数支持；示例项目和详细的中文文档。

## 许可证

CaptchaX React Native SDK 基于 MIT 许可证开源，您可以自由使用、修改和分发本 SDK。使用本 SDK 意味着您同意遵守以下条款：将本 SDK 用于合法的目的，不用于任何违法或有害的应用；保留源代码中的版权声明和许可证声明；在修改后的代码中明确标注所做的更改；开源项目在使用本 SDK 时也需要遵循相同的许可证条款。

## 技术支持

如果您在使用过程中遇到任何问题，可以通过以下方式获取帮助。查看本 README 文档中的常见问题章节，可能已经包含了您遇到的问题的解决方案。如果问题未能解决，可以查看项目仓库的 Issue 页面，搜索是否已有类似问题的讨论。对于企业用户，可以通过官方渠道联系技术支持团队获取更专业的帮助。我们持续改进 SDK，欢迎提出宝贵的意见和建议。
