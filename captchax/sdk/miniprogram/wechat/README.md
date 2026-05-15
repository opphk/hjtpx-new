# CaptchaX 微信小程序 SDK

CaptchaX 微信小程序 SDK 为小程序应用提供安全、可靠的验证码集成解决方案。支持滑块验证码、点选验证码、拼图验证码、旋转验证码、文字验证码和图标验证码等多种验证方式。

## 功能特性

- **多种验证码类型**：支持 6 种主流验证码类型
  - 滑块验证码 (Slider)
  - 点选验证码 (Click)
  - 拼图验证码 (Puzzle)
  - 旋转验证码 (Rotate)
  - 文字验证码 (Text)
  - 图标验证码 (Icon)

- **完善的 API**：提供简洁易用的 SDK 接口
- **图片预加载**：自动下载并缓存验证码图片
- **事件驱动**：基于微信小程序组件事件机制
- **响应式设计**：适配不同屏幕尺寸
- **TypeScript 支持**：完整的类型定义
- **调试模式**：支持开发调试日志

## 目录结构

```
wechat/
├── captchax.js                 # 核心 SDK
├── README.md                   # 本文档
├── slider-captcha/             # 滑块验证码组件
│   ├── slider-captcha.js
│   ├── slider-captcha.wxml
│   ├── slider-captcha.wxss
│   └── slider-captcha.json
├── click-captcha/              # 点选验证码组件
│   ├── click-captcha.js
│   ├── click-captcha.wxml
│   ├── click-captcha.wxss
│   └── click-captcha.json
├── puzzle-captcha/             # 拼图验证码组件
│   ├── puzzle-captcha.js
│   ├── puzzle-captcha.wxml
│   ├── puzzle-captcha.wxss
│   └── puzzle-captcha.json
├── rotate-captcha/             # 旋转验证码组件
│   ├── rotate-captcha.js
│   ├── rotate-captcha.wxml
│   ├── rotate-captcha.wxss
│   └── rotate-captcha.json
├── text-captcha/               # 文字验证码组件
│   ├── text-captcha.js
│   ├── text-captcha.wxml
│   ├── text-captcha.wxss
│   └── text-captcha.json
├── icon-captcha/               # 图标验证码组件
│   ├── icon-captcha.js
│   ├── icon-captcha.wxml
│   ├── icon-captcha.wxss
│   └── icon-captcha.json
└── example/                    # 示例项目
    ├── app.js
    ├── app.json
    ├── sitemap.json
    └── pages/
        ├── index/              # 首页
        ├── slider/             # 滑块验证码示例
        ├── click/              # 点选验证码示例
        ├── puzzle/             # 拼图验证码示例
        ├── rotate/             # 旋转验证码示例
        ├── text/               # 文字验证码示例
        └── icon/               # 图标验证码示例
```

## 快速开始

### 1. 安装 SDK

将 SDK 文件复制到小程序项目根目录：

```
your-miniprogram/
├── captchax.js
├── slider-captcha/
├── click-captcha/
├── puzzle-captcha/
├── rotate-captcha/
├── text-captcha/
├── icon-captcha/
└── ... 其他小程序文件
```

### 2. 初始化 SDK

在 `app.js` 中初始化 CaptchaX SDK：

```javascript
// app.js
const CaptchaX = require('./captchax.js');

App({
  captchaX: null,

  onLaunch() {
    // 初始化 CaptchaX SDK
    this.captchaX = new CaptchaX({
      baseUrl: 'https://captchax.example.com',  // API 服务器地址
      timeout: 10000,                              // 请求超时时间（毫秒）
      debug: true                                  // 调试模式
    });

    console.log('CaptchaX SDK 初始化完成');
  }
});
```

### 3. 配置服务器域名

在小程序管理后台配置服务器域名（根据实际部署的服务器地址）：

- 登录微信公众平台
- 进入「开发」→「开发管理」→「开发设置」
- 在「服务器域名」中添加 `request` 合法域名：
  ```
  https://captchax.example.com
  ```

### 4. 页面配置

在页面的 `json` 文件中注册验证码组件：

```json
{
  "usingComponents": {
    "slider-captcha": "/slider-captcha/slider-captcha"
  }
}
```

### 5. 使用验证码组件

在 WXML 中使用验证码组件：

```xml
<view class="captcha-wrapper">
  <slider-captcha
    captchaId="{{captchaData.captchaId}}"
    backgroundImage="{{captchaData.backgroundImage}}"
    sliderImage="{{captchaData.sliderImage}}"
    targetPosition="{{captchaData.targetPosition}}"
    bindverify="onSliderVerify"
  />
</view>
```

在 JS 中处理验证逻辑：

```javascript
// 获取验证码
async loadCaptcha() {
  try {
    const captchaData = await app.captchaX.getCaptcha('slider', {});
    this.setData({ captchaData });
  } catch (error) {
    console.error('加载验证码失败:', error);
  }
},

// 处理验证结果
async onSliderVerify(e) {
  const verifyData = e.detail;
  
  try {
    const result = await app.captchaX.verify('slider', verifyData);
    
    if (result.success) {
      console.log('验证成功');
    } else {
      console.log('验证失败');
    }
  } catch (error) {
    console.error('验证请求失败:', error);
  }
}
```

## API 参考

### CaptchaX 构造函数

```javascript
const captchaX = new CaptchaX(options);
```

**参数说明：**

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| baseUrl | string | 否 | https://captchax.example.com | API 服务器地址 |
| timeout | number | 否 | 10000 | 请求超时时间（毫秒） |
| debug | boolean | 否 | false | 是否开启调试模式 |

### getCaptcha()

获取验证码。

```javascript
async getCaptcha(type, options)
```

**参数说明：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| type | string | 是 | 验证码类型：`slider`、`click`、`puzzle`、`rotate`、`text`、`icon` |
| options | object | 否 | 获取验证码的可选参数 |

**返回值：**

```javascript
{
  captchaId: "xxx",              // 验证码 ID
  imageUrl: "xxx",               // 图片 URL
  backgroundImage: "xxx",        // 背景图片 URL
  sliderImage: "xxx",            // 滑块图片 URL
  thumbnailUrl: "xxx",           // 缩略图 URL
  track: [],                     // 轨迹数据
  targetPosition: { x: 0, y: 0 }, // 目标位置
  expiresAt: "xxx"              // 过期时间
}
```

### verify()

验证验证码。

```javascript
async verify(type, verifyData)
```

**参数说明：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| type | string | 是 | 验证码类型 |
| verifyData | object | 是 | 验证数据对象 |

**verifyData 格式：**

```javascript
{
  captchaId: "xxx",              // 验证码 ID（必填）
  track: [],                      // 用户操作轨迹
  userResponse: {}                // 用户响应数据
}
```

**返回值：**

```javascript
{
  success: true,
  data: {
    valid: true,
    message: "验证成功"
  }
}
```

### preloadImage()

预加载图片。

```javascript
async preloadImage(url)
```

**返回值：** 本地临时文件路径

### setConfig()

更新 SDK 配置。

```javascript
setConfig(options)
```

## 验证码组件

### 1. 滑块验证码 (Slider Captcha)

拖动滑块完成拼图验证。

**组件属性：**

| 属性 | 类型 | 必填 | 说明 |
|------|------|------|------|
| captchaId | string | 是 | 验证码 ID |
| backgroundImage | string | 是 | 背景图片 URL |
| sliderImage | string | 是 | 滑块图片 URL |
| targetPosition | number | 是 | 目标位置 |
| sliderSize | object | 否 | 滑块尺寸 |
| trackLength | number | 否 | 轨道长度 |
| disabled | boolean | 否 | 是否禁用 |

**事件：**

| 事件名 | 说明 | 返回值 |
|--------|------|--------|
| verify | 验证事件 | 验证数据对象 |

**示例代码：**

```xml
<slider-captcha
  captchaId="{{captchaData.captchaId}}"
  backgroundImage="{{captchaData.backgroundImage}}"
  sliderImage="{{captchaData.sliderImage}}"
  targetPosition="{{captchaData.targetPosition}}"
  sliderSize="{{captchaData.sliderSize}}"
  trackLength="300"
  bindverify="onSliderVerify"
/>
```

### 2. 点选验证码 (Click Captcha)

点击指定位置完成验证。

**组件属性：**

| 属性 | 类型 | 必填 | 说明 |
|------|------|------|------|
| captchaId | string | 是 | 验证码 ID |
| backgroundImage | string | 是 | 背景图片 URL |
| targetCount | number | 否 | 需要点击的目标数量 |
| imageSize | object | 否 | 图片尺寸 |
| disabled | boolean | 否 | 是否禁用 |

**事件：**

| 事件名 | 说明 | 返回值 |
|--------|------|--------|
| verify | 验证事件 | 验证数据对象 |

**示例代码：**

```xml
<click-captcha
  captchaId="{{captchaData.captchaId}}"
  backgroundImage="{{captchaData.backgroundImage}}"
  targetCount="4"
  imageSize="{{captchaData.imageSize}}"
  bindverify="onClickVerify"
/>
```

### 3. 拼图验证码 (Puzzle Captcha)

移动拼图块到正确位置。

**组件属性：**

| 属性 | 类型 | 必填 | 说明 |
|------|------|------|------|
| captchaId | string | 是 | 验证码 ID |
| backgroundImage | string | 是 | 背景图片 URL |
| puzzleImage | string | 是 | 拼图图片 URL |
| targetPosition | object | 是 | 目标位置 {x, y} |
| imageSize | object | 否 | 图片尺寸 |
| disabled | boolean | 否 | 是否禁用 |

**事件：**

| 事件名 | 说明 | 返回值 |
|--------|------|--------|
| verify | 验证事件 | 验证数据对象 |

**示例代码：**

```xml
<puzzle-captcha
  captchaId="{{captchaData.captchaId}}"
  backgroundImage="{{captchaData.backgroundImage}}"
  puzzleImage="{{captchaData.puzzleImage}}"
  targetPosition="{{captchaData.targetPosition}}"
  imageSize="{{captchaData.imageSize}}"
  bindverify="onPuzzleVerify"
/>
```

### 4. 旋转验证码 (Rotate Captcha)

旋转图片到正确角度。

**组件属性：**

| 属性 | 类型 | 必填 | 说明 |
|------|------|------|------|
| captchaId | string | 是 | 验证码 ID |
| imageUrl | string | 是 | 图片 URL |
| targetAngle | number | 是 | 目标角度 |
| imageSize | object | 否 | 图片尺寸 |
| disabled | boolean | 否 | 是否禁用 |

**事件：**

| 事件名 | 说明 | 返回值 |
|--------|------|--------|
| verify | 验证事件 | 验证数据对象 |

**示例代码：**

```xml
<rotate-captcha
  captchaId="{{captchaData.captchaId}}"
  imageUrl="{{captchaData.imageUrl}}"
  targetAngle="{{captchaData.targetAngle}}"
  imageSize="{{captchaData.imageSize}}"
  bindverify="onRotateVerify"
/>
```

### 5. 文字验证码 (Text Captcha)

选择正确的文字答案。

**组件属性：**

| 属性 | 类型 | 必填 | 说明 |
|------|------|------|------|
| captchaId | string | 是 | 验证码 ID |
| imageUrl | string | 是 | 图片 URL |
| question | string | 是 | 问题文本 |
| options | array | 是 | 选项列表 |
| imageSize | object | 否 | 图片尺寸 |
| disabled | boolean | 否 | 是否禁用 |

**事件：**

| 事件名 | 说明 | 返回值 |
|--------|------|--------|
| verify | 验证事件 | 验证数据对象 |
| refresh | 刷新事件 | - |

**示例代码：**

```xml
<text-captcha
  captchaId="{{captchaData.captchaId}}"
  imageUrl="{{captchaData.imageUrl}}"
  question="{{captchaData.question}}"
  options="{{captchaData.options}}"
  imageSize="{{captchaData.imageSize}}"
  bindverify="onTextVerify"
  bindrefresh="onTextRefresh"
/>
```

### 6. 图标验证码 (Icon Captcha)

选择正确的图标。

**组件属性：**

| 属性 | 类型 | 必填 | 说明 |
|------|------|------|------|
| captchaId | string | 是 | 验证码 ID |
| imageUrl | string | 是 | 图片 URL |
| icons | array | 是 | 图标列表 |
| targetIcon | string | 是 | 目标图标 |
| imageSize | object | 否 | 图片尺寸 |
| disabled | boolean | 否 | 是否禁用 |

**事件：**

| 事件名 | 说明 | 返回值 |
|--------|------|--------|
| verify | 验证事件 | 验证数据对象 |
| refresh | 刷新事件 | - |

**示例代码：**

```xml
<icon-captcha
  captchaId="{{captchaData.captchaId}}"
  imageUrl="{{captchaData.imageUrl}}"
  icons="{{captchaData.icons}}"
  targetIcon="{{captchaData.targetIcon}}"
  imageSize="{{captchaData.imageSize}}"
  bindverify="onIconVerify"
  bindrefresh="onIconRefresh"
/>
```

## API 端点

### 获取验证码

```
POST /api/v1/captcha/{type}
```

**请求参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| type | string | 验证码类型 |

**响应示例：**

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

### 验证验证码

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

**响应示例：**

```json
{
  "success": true,
  "data": {
    "valid": true,
    "message": "验证成功"
  }
}
```

## 示例项目

示例项目位于 `example/` 目录下，演示了所有验证码组件的使用方法。

### 运行示例

1. 打开微信开发者工具
2. 导入 `example/` 目录作为项目
3. 配置 AppID（可使用测试号）
4. 在 `app.js` 中修改 `baseUrl` 为实际的服务器地址
5. 编译运行项目

### 示例页面

- **首页** (`pages/index/`)：展示所有验证码类型入口
- **滑块验证** (`pages/slider/`)：滑块验证码演示
- **点选验证** (`pages/click/`)：点选验证码演示
- **拼图验证** (`pages/puzzle/`)：拼图验证码演示
- **旋转验证** (`pages/rotate/`)：旋转验证码演示
- **文字验证** (`pages/text/`)：文字验证码演示
- **图标验证** (`pages/icon/`)：图标验证码演示

## 最佳实践

### 1. 验证码加载

```javascript
async loadCaptchaWithRetry(type, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const captchaData = await app.captchaX.getCaptcha(type, {});
      return captchaData;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}
```

### 2. 错误处理

```javascript
async onVerify(e) {
  try {
    const result = await app.captchaX.verify('slider', e.detail);
    
    if (result.success && result.data && result.data.valid) {
      // 验证成功
      wx.showToast({
        title: '验证成功',
        icon: 'success'
      });
    } else {
      // 验证失败，刷新验证码
      wx.showToast({
        title: result.message || '验证失败',
        icon: 'none'
      });
      this.loadCaptcha();
    }
  } catch (error) {
    console.error('验证失败:', error);
    wx.showToast({
      title: '网络错误',
      icon: 'none'
    });
  }
}
```

### 3. 禁用状态管理

```javascript
Page({
  data: {
    isVerified: false,
    captchaDisabled: false
  },

  async onVerify(e) {
    this.setData({ captchaDisabled: true });
    
    try {
      const result = await app.captchaX.verify('slider', e.detail);
      this.setData({ isVerified: result.success });
    } finally {
      this.setData({ captchaDisabled: false });
    }
  }
})
```

### 4. 图片预加载

```javascript
async preloadCaptchaImages(captchaData) {
  const sdk = getApp().captchaX;
  const urls = [
    captchaData.backgroundImage,
    captchaData.sliderImage
  ].filter(Boolean);

  try {
    const paths = await sdk.preloadImages(urls);
    console.log('图片预加载完成:', paths);
    return paths;
  } catch (error) {
    console.error('图片预加载失败:', error);
  }
}
```

## 配置说明

### 开发环境

```javascript
const captchaX = new CaptchaX({
  baseUrl: 'http://localhost:3000',  // 本地开发服务器
  debug: true,
  timeout: 10000
});
```

### 生产环境

```javascript
const captchaX = new CaptchaX({
  baseUrl: 'https://captchax.example.com',  // 生产服务器
  debug: false,
  timeout: 10000
});
```

## 注意事项

1. **域名配置**：确保已在小程序管理后台配置合法的服务器域名
2. **网络请求**：建议在网络请求失败时提供重试机制
3. **用户体验**：验证失败后自动刷新验证码，避免用户重复操作
4. **安全考虑**：不要在客户端存储验证码敏感信息
5. **性能优化**：可以使用图片预加载提升用户体验
6. **适配性测试**：在不同屏幕尺寸的设备上测试验证码组件

## 常见问题

### Q: 验证码加载失败怎么办？

A: 请检查以下几点：
1. 服务器地址配置是否正确
2. 是否已在小程序管理后台配置合法域名
3. 网络连接是否正常
4. 服务器是否正常运行

### Q: 如何处理验证超时？

A: 可以在 `app.js` 中设置较长的超时时间，并在页面中添加重试按钮：

```javascript
const captchaX = new CaptchaX({
  timeout: 15000  // 15秒超时
});
```

### Q: 验证码图片显示异常？

A: 检查图片 URL 是否正确，以及图片格式是否被小程序支持。推荐使用 JPG/PNG 格式。

### Q: 如何实现自定义验证码样式？

A: 可以通过覆盖组件的 wxss 样式来自定义外观，但需要注意不要修改核心交互逻辑。

## 更新日志

### v1.0.0 (2026-05-15)

- 初始版本发布
- 支持 6 种验证码类型
- 提供完整的示例项目

## 技术支持

如有问题或建议，请通过以下方式联系我们：

- 邮箱：support@captchax.example.com
- 官网：https://captchax.example.com

## License

MIT License
