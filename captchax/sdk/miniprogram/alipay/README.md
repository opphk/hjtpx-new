# CaptchaX 支付宝小程序 SDK

## 简介

CaptchaX 支付宝小程序 SDK 是一款功能强大的多类型验证码解决方案，支持 6 种不同类型的验证码组件，帮助开发者快速在支付宝小程序中集成安全可靠的验证功能。

## 功能特性

- **6 种验证码类型**：滑块、点选、拼图、旋转、文字、图标
- **简单易用**：组件化设计，一键集成
- **灵活配置**：支持自定义样式和回调
- **安全可靠**：多重验证机制，防止恶意攻击
- **良好的用户体验**：流畅的交互设计

## 快速开始

### 安装

将 SDK 文件夹复制到您的项目中即可使用。

### 基本使用

#### 1. 在页面中引入组件

```json
{
  "usingComponents": {
    "captcha": "/path/to/captchax"
  }
}
```

#### 2. 在 AXML 中使用组件

```html
<captcha
  id="captcha"
  appId="{{appId}}"
  type="slider"
  onVerify="onVerify"
  onClose="onCaptchaClose"
  onError="onCaptchaError"
/>
```

#### 3. 在 JS 中调用

```javascript
Page({
  data: {
    appId: 'your-app-id'
  },

  showCaptcha() {
    const captchaComponent = this.selectComponent('#captcha');
    if (captchaComponent) {
      captchaComponent.show({ type: 'slider' });
    }
  },

  onVerify(result) {
    console.log('验证成功:', result);
    // 处理验证结果
  },

  onCaptchaClose() {
    console.log('验证码已关闭');
  },

  onCaptchaError(error) {
    console.error('验证出错:', error);
  }
});
```

## 验证码类型

### 1. 滑块验证 (slider)

拖动滑块完成拼图验证，适用于用户登录、注册等场景。

```javascript
captchaComponent.show({ type: 'slider' });
```

### 2. 点选验证 (click)

根据提示依次点击图片中的目标位置，适用于高安全级别操作。

```javascript
captchaComponent.show({ type: 'click' });
```

### 3. 拼图验证 (puzzle)

将打乱的拼图块拖动到正确位置，视觉体验好。

```javascript
captchaComponent.show({ type: 'puzzle' });
```

### 4. 旋转验证 (rotate)

旋转图片使其与参考图对齐，操作直观。

```javascript
captchaComponent.show({ type: 'rotate' });
```

### 5. 文字验证 (text)

识别并输入图片中显示的文字，经典验证方式。

```javascript
captchaComponent.show({ type: 'text' });
```

### 6. 图标验证 (icon)

从多个图标中选择符合描述的图标，简单易用。

```javascript
captchaComponent.show({ type: 'icon' });
```

## API 文档

### 组件属性

| 属性名 | 类型 | 说明 |
|--------|------|------|
| appId | String | 您的应用 ID |
| type | String | 验证码类型 |
| apiBase | String | API 基础地址（可选） |
| onVerify | Function | 验证成功回调 |
| onClose | Function | 关闭回调 |
| onError | Function | 错误回调 |

### 组件方法

#### show(options)

显示验证码。

```javascript
captchaComponent.show({
  type: 'slider'  // 验证码类型
});
```

#### hide()

隐藏验证码。

```javascript
captchaComponent.hide();
```

### 回调参数

#### onVerify 回调

验证成功时触发，返回验证结果。

```javascript
{
  type: 'slider',     // 验证码类型
  data: {
    position: 120,   // 滑块位置
    target: 120      // 目标位置
  }
}
```

#### onError 回调

验证出错时触发。

```javascript
{
  message: '验证失败',
  code: 'VERIFY_ERROR'
}
```

## 配置说明

### 环境配置

SDK 支持开发和生产两种环境：

- **开发环境**: `http://localhost:3000`
- **生产环境**: `https://captchax.example.com`

可以在初始化时指定 API 地址：

```javascript
<captcha
  apiBase="https://your-api-server.com"
  appId="{{appId}}"
  type="slider"
  onVerify="onVerify"
/>
```

### 自定义样式

组件样式可以通过 CSS 进行自定义覆盖：

```css
.captcha-modal {
  border-radius: 16px;
}

.captcha-header {
  background: #fff;
}
```

## 目录结构

```
alipay/
├── src/
│   ├── captchax.js          # 主组件
│   ├── captchax.json        # 组件配置
│   ├── captchax.axml        # 组件模板
│   ├── captchax.acss        # 组件样式
│   ├── captchax-core.js     # 核心类
│   ├── utils/
│   │   ├── config.js        # 配置
│   │   └── api.js           # API 封装
│   └── components/
│       ├── slider-captcha/   # 滑块验证
│       ├── click-captcha/    # 点选验证
│       ├── puzzle-captcha/   # 拼图验证
│       ├── rotate-captcha/   # 旋转验证
│       ├── text-captcha/     # 文字验证
│       └── icon-captcha/     # 图标验证
├── example/                  # 示例项目
│   ├── app.js
│   ├── app.json
│   ├── app.acss
│   └── pages/
│       ├── slider/
│       ├── click/
│       ├── puzzle/
│       ├── rotate/
│       ├── text/
│       └── icon/
├── package.json
└── README.md
```

## 示例项目

示例项目位于 `example/` 目录下，展示了每种验证码类型的基本用法。

运行示例：

1. 在支付宝开发者工具中导入 `example/` 文件夹
2. 配置您的 AppId
3. 启动项目预览

## 注意事项

1. 请确保在 `app.json` 中正确配置组件路径
2. 验证码组件需要在页面加载完成后才能调用
3. 建议在网络请求时使用开发环境 API 地址
4. 生产环境请使用正式的 API 服务地址

## 常见问题

### Q: 验证码无法显示怎么办？

A: 请检查：
- 组件路径是否正确配置
- AppId 是否有效
- 网络请求是否正常

### Q: 验证总是失败？

A: 请检查：
- 验证逻辑是否正确
- API 服务是否正常运行
- 错误回调中的具体错误信息

### Q: 如何自定义验证码样式？

A: 可以通过覆盖组件的 CSS 样式来自定义外观。

## 更新日志

### v1.0.0 (2024-01-01)

- 初始版本发布
- 支持 6 种验证码类型
- 提供完整的示例项目

## 技术支持

如有问题，请联系技术支持团队。

## 许可证

MIT License
