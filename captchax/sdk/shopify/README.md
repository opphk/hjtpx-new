# CaptchaX Shopify 插件

CaptchaX Shopify 插件为您的 Shopify 商店提供全面的验证码保护解决方案，支持多种验证码类型，有效防止机器人和恶意攻击。

## 功能特性

### 核心功能

- **多类型验证码支持**：集成6种验证码类型（图像、滑块、九宫格、网格、图标、旋转）
- **多页面覆盖**：支持登录、注册、联系表单、评论表单、结账页面、密码重置等
- **无缝集成**：专为 Shopify 设计的原生集成方案
- **实时统计**：完整的验证码使用数据分析
- **灵活配置**：可通过后台管理界面灵活配置各种设置

### 技术特性

- 基于 Shopify App Bridge 和 Polaris 设计系统
- 支持 Embedded App SDK
- 响应式设计，适配各种设备
- 安全的 API 验证机制
- 支持开发环境和生产环境

## 项目结构

```
captchax/sdk/shopify/
├── server.js                      # Express 服务器主文件
├── package.json                   # 项目依赖配置
├── shopify.app.toml              # Shopify 应用配置
├── README.md                     # 项目文档
│
├── server/                       # 后端服务
│   ├── captchax-client.js        # CaptchaX 客户端
│   └── routes/                    # 路由模块
│       ├── auth.js               # 认证路由
│       ├── captcha.js            # 验证码路由
│       ├── admin.js              # 管理后台路由
│       └── api.js                # API 路由
│
├── frontend/                      # 前端资源
│   ├── components/               # React 组件
│   │   └── CaptchaWidget.jsx     # 验证码组件
│   ├── pages/                    # HTML 页面
│   │   ├── index.html            # 首页/落地页
│   │   └── admin.html            # 管理后台页面
│   ├── styles/                    # 样式文件
│   │   ├── captcha.css           # 验证码样式
│   │   └── admin.css             # 管理后台样式
│   └── scripts/                  # JavaScript 脚本
│       ├── captchax.js           # CaptchaX SDK
│       ├── landing.js            # 落地页脚本
│       └── admin.js              # 管理后台脚本
│
└── config/                       # 配置文件目录
```

## 验证码类型

### 1. 图像验证码 (image)

用户需要从多张图像中选择包含指定内容的图像。

- 适用场景：通用验证场景
- 安全性：⭐⭐⭐
- 用户体验：⭐⭐⭐⭐

### 2. 滑块验证码 (slider)

拖动滑块到正确位置完成拼图验证。

- 适用场景：登录、注册页面
- 安全性：⭐⭐⭐⭐
- 用户体验：⭐⭐⭐⭐⭐

### 3. 九宫格验证码 (concat)

按指定顺序点击图像进行验证。

- 适用场景：需要较高安全性的验证
- 安全性：⭐⭐⭐⭐
- 用户体验：⭐⭐⭐

### 4. 网格验证码 (grid)

从网格中选择所有符合条件的多张图像。

- 适用场景：敏感操作验证
- 安全性：⭐⭐⭐⭐⭐
- 用户体验：⭐⭐⭐

### 5. 图标验证码 (icon)

点击所有包含指定图标的图像。

- 适用场景：高安全性需求
- 安全性：⭐⭐⭐⭐⭐
- 用户体验：⭐⭐⭐⭐

### 6. 旋转验证码 (rotate)

将图像旋转到正确方向完成验证。

- 适用场景：交互式验证
- 安全性：⭐⭐⭐⭐
- 用户体验：⭐⭐⭐

## 安装部署

### 环境要求

- Node.js >= 16.0.0
- npm >= 8.0.0
- Shopify Partner 账户
- Shopify 商店（用于测试）

### 安装步骤

1. **安装依赖**

```bash
cd /workspace/captchax/sdk/shopify
npm install
```

2. **配置环境变量**

创建 `.env` 文件并配置以下变量：

```env
SHOPIFY_API_KEY=your_shopify_api_key
SHOPIFY_API_SECRET=your_shopify_api_secret
SHOPIFY_SCOPES=read_products, write_products, read_script_tags, write_script_tags
SHOPIFY_HOST=https://your-app-host.com

CAPTCHAX_API_KEY=your_captchax_api_key
CAPTCHAX_API_SECRET=your_captchax_api_secret
NODE_ENV=development
PORT=3000
```

3. **配置 Shopify App**

编辑 `shopify.app.toml` 文件，更新应用配置：

```toml
scopes = "read_products, write_products, read_script_tags, write_script_tags"

[app_proxy]
url = "https://captchax.example.com"
```

4. **启动开发服务器**

```bash
npm run dev
```

5. **部署到生产环境**

```bash
npm run build
npm run deploy
```

## 使用指南

### 前端集成

#### 方式一：使用 SDK（推荐）

在商店主题的 `theme.liquid` 文件中添加：

```liquid
{% if content_for_header contains 'shopify' %}
<script src="https://captchax.example.com/sdk/shopify.js"></script>
<script>
  CaptchaX.init({
    shop: '{{ request.host }}',
    apiKey: 'your-api-key',
    types: ['login', 'register', 'contact', 'comment'],
    theme: 'light',
    language: 'zh-CN'
  });
</script>
{% endif %}
```

#### 方式二：手动集成

在需要验证码的表单页面添加：

```html
<div id="captcha-container"></div>

<script>
  const captcha = new CaptchaXWidget({
    shop: 'your-store.myshopify.com',
    type: 'slider',
    position: 'bottom-right',
    onVerify: (result) => {
      console.log('Verification successful:', result);
      // 提交表单
    },
    onError: (error) => {
      console.error('Verification failed:', error);
    }
  });
  
  captcha.mount('#captcha-container');
</script>
```

### 后台管理

访问管理后台：`/admin` 或通过 Shopify Partner 后台进入应用

#### 仪表盘

查看验证码使用统计：
- 总验证次数
- 成功率
- 平均响应时间
- 拦截恶意请求数

#### 配置管理

为不同页面启用和配置验证码：
- 登录页面
- 注册页面
- 联系表单
- 评论表单
- 结账页面
- 密码重置

#### 数据统计

查看详细的验证码使用数据：
- 验证趋势图
- 按页面类型分布
- 按验证码类型分布
- 数据导出功能

## API 文档

### 创建验证码

**POST** `/captcha/create`

```json
{
  "shop": "your-store.myshopify.com",
  "type": "image",
  "options": {
    "theme": "light",
    "language": "zh-CN"
  }
}
```

响应：
```json
{
  "success": true,
  "token": "base64-encoded-token",
  "expiresAt": 1704067200000,
  "type": "image",
  "config": {
    "apiUrl": "https://captchax.example.com",
    "timeout": 300000
  }
}
```

### 验证验证码

**POST** `/captcha/verify`

```json
{
  "token": "base64-encoded-token",
  "response": {
    "type": "image",
    "selected": [1, 3, 5]
  }
}
```

响应：
```json
{
  "success": true,
  "result": "success",
  "message": "验证成功"
}
```

### 获取统计

**GET** `/captcha/stats/:shop`

参数：
- `startDate`: 开始日期（可选）
- `endDate`: 结束日期（可选）

响应：
```json
{
  "success": true,
  "data": {
    "totalVerifications": 12580,
    "successRate": 0.95,
    "averageResponseTime": 150,
    "byType": {
      "image": 8000,
      "slider": 4000,
      "concat": 3000,
      "grid": 500,
      "icon": 247,
      "rotate": 100
    }
  }
}
```

## 开发指南

### 添加新的验证码类型

1. 在 `server/captchax-client.js` 中添加类型常量：

```javascript
static CUSTOM_TYPE = 'custom';
```

2. 在前端组件中添加渲染逻辑：

```javascript
// frontend/components/CaptchaWidget.jsx
renderCustomCaptcha() {
  // 实现自定义验证码渲染逻辑
}
```

3. 在 `renderCaptchaContent()` 方法中添加 case：

```javascript
case 'custom':
  return this.renderCustomCaptcha();
```

### 添加新的页面支持

1. 在 `server/routes/admin.js` 中添加配置项：

```javascript
const newPageConfig = {
  enabled: false,
  type: 'image',
  label: '新页面'
};
```

2. 在前端管理界面添加对应的 UI 控件

### Webhook 配置

CaptchaX Shopify 插件支持以下 Webhook：

- `app/uninstalled`：应用卸载时清理数据
- `shop/update`：商店信息更新

## 配置文件说明

### package.json

主要依赖：
- `@shopify/app-bridge`：Shopify App Bridge 库
- `@shopify/polaris`：Shopify Polaris UI 组件库
- `express`：Node.js Web 框架
- `react`：React 框架

### shopify.app.toml

应用配置文件，包含：
- OAuth 权限范围
- App Proxy 配置
- Webhook 配置
- App Home 配置
- 扩展配置

## 故障排除

### 常见问题

**Q: 验证码无法加载？**

检查：
1. API URL 配置是否正确
2. 网络连接是否正常
3. 浏览器控制台是否有错误信息

**Q: 验证总是失败？**

检查：
1. Token 是否过期
2. API Key 和 Secret 是否正确
3. 签名验证是否通过

**Q: 管理后台无法访问？**

检查：
1. 是否已完成 Shopify OAuth 授权
2. 访问令牌是否有效
3. 路由配置是否正确

### 日志查看

开发环境日志直接在终端输出：
```bash
npm run dev
```

生产环境查看日志：
```bash
# 查看应用日志
tail -f logs/app.log

# 查看错误日志
tail -f logs/error.log
```

## 安全考虑

- 所有 API 请求使用 HTTPS 加密传输
- Token 使用 HMAC-SHA256 签名验证
- API Key 和 Secret 存储在环境变量中
- 定期轮换访问令牌
- 实施请求频率限制

## 性能优化

- 使用 CDN 加速静态资源
- 实现验证码组件懒加载
- 缓存统计数据
- 使用 Web Workers 处理复杂计算
- 实施请求去重

## 浏览器兼容性

- Chrome >= 80
- Firefox >= 75
- Safari >= 13
- Edge >= 80
- iOS Safari >= 13
- Chrome for Android >= 80

## 版本历史

### v1.0.0 (2024-01-01)

- 初始版本发布
- 支持6种验证码类型
- 完整的 Shopify 集成
- 管理后台界面
- 数据统计分析功能

## 许可证

MIT License

## 技术支持

- 邮箱：support@captchax.example.com
- 文档：https://docs.captchax.example.com
- GitHub：https://github.com/captchax/shopify-plugin

## 更新日志

### 2024-01-15
- 优化验证码加载性能
- 修复部分设备上的显示问题

### 2024-01-10
- 添加旋转验证码类型
- 优化滑块验证码交互体验

### 2024-01-01
- 正式发布 v1.0.0
- 支持所有6种验证码类型
- 完整的 Shopify 集成

---

© 2024 CaptchaX. All rights reserved.
