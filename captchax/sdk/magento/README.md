# CaptchaX Magento 2 插件

## 概述

CaptchaX Magento 2 插件为您的 Magento 商店提供强大的验证码保护功能。支持多种验证码类型，包括图像验证、滑块验证、图标选择、点击验证、图像旋转和语音验证。

## 功能特性

### 🎯 核心功能
- ✅ **6种验证码类型**：图像、滑块、图标、点击、旋转、语音
- ✅ **多表单保护**：客户登录、注册、联系表单、产品评论
- ✅ **前后端分离**：使用 RequireJS 和现代 JavaScript
- ✅ **多网站/多店铺支持**：可在不同网站/店铺中独立配置
- ✅ **实时验证**：AJAX 异步验证，无需页面刷新
- ✅ **安全可靠**：服务器端 Token 验证

### 🔧 技术特性
- ✅ **Magento 2.4+ 兼容**
- ✅ **RequireJS 模块化加载**
- ✅ **Magento UI 组件集成**
- ✅ **系统配置集成**
- ✅ **事件观察者模式**
- ✅ **可扩展架构**

## 系统要求

- **Magento 版本**: 2.4.0 或更高
- **PHP 版本**: 7.4 或更高
- **依赖模块**:
  - Magento_Customer
  - Magento_Config
  - Magento_Backend

## 安装步骤

### 方法一：通过 Composer 安装（推荐）

```bash
composer require captchax/magento-plugin
php bin/magento module:enable CaptchaX_Captcha
php bin/magento setup:upgrade
php bin/magento setup:di:compile
php bin/magento cache:clean
```

### 方法二：手动安装

1. 下载插件包并解压到 `/app/code/CaptchaX/Captcha` 目录
2. 执行以下命令：

```bash
php bin/magento module:enable CaptchaX_Captcha
php bin/magento setup:upgrade
php bin/magento setup:di:compile
php bin/magento cache:clean
```

## 配置说明

### 后台配置路径

`Stores > Settings > Configuration > CaptchaX > CaptchaX Configuration`

### 基础配置

1. **启用 CaptchaX**: 设置为 "Yes" 启用插件
2. **环境选择**:
   - Development（开发环境）：使用本地 API 地址
   - Production（生产环境）：使用线上 API 地址
3. **Site Key**: 从 CaptchaX 仪表板获取的网站密钥
4. **Secret Key**: 从 CaptchaX 仪表板获取的密钥
5. **API 地址**:
   - 开发环境: `http://localhost:3000`
   - 生产环境: `https://captchax.example.com`

### 表单保护配置

在 "Form Protection" 部分，可以为以下表单启用/禁用验证码：
- Customer Login Form（客户登录表单）
- Customer Registration Form（客户注册表单）
- Contact Form（联系表单）
- Product Review Form（产品评论表单）

### 验证码类型配置

在 "Captcha Types" 部分，可以：
- 设置默认验证码类型
- 启用/禁用各种验证码类型

## 验证码类型

### 1. 图像验证 (Image)
传统的图像验证码，用户需要识别并输入显示的字符。

### 2. 滑块验证 (Slider)
用户需要滑动滑块完成拼图来通过验证。

### 3. 图标选择 (Icon)
用户需要点击所有包含特定图标的图像。

### 4. 点击验证 (Point)
用户需要点击图像中的特定位置。

### 5. 图像旋转 (Rotate)
用户需要将图像旋转到正确的方向。

### 6. 语音验证 (Voice)
用户需要听取音频并输入听到的内容。

## 使用方法

### 在模板中添加验证码

#### 客户登录表单

```php
<?php echo $this->getLayout()
    ->createBlock('CaptchaX\Captcha\Block\Captcha')
    ->setTemplate('CaptchaX_Captcha::customer/login/captcha.phtml')
    ->toHtml(); ?>
```

#### 客户注册表单

```php
<?php echo $this->getLayout()
    ->createBlock('CaptchaX\Captcha\Block\Captcha')
    ->setTemplate('CaptchaX_Captcha::customer/register/captcha.phtml')
    ->toHtml(); ?>
```

#### 联系表单

```php
<?php echo $this->getLayout()
    ->createBlock('CaptchaX\Captcha\Block\Captcha')
    ->setTemplate('CaptchaX_Captcha::contact/captcha.phtml')
    ->toHtml(); ?>
```

#### 产品评论表单

```php
<?php echo $this->getLayout()
    ->createBlock('CaptchaX\Captcha\Block\Captcha')
    ->setTemplate('CaptchaX_Captcha::review/captcha.phtml')
    ->toHtml(); ?>
```

### 通过 JavaScript 初始化

```javascript
require([
    'CaptchaX_Captcha/js/captchax'
], function (CaptchaX) {
    var config = {
        siteKey: 'your-site-key',
        apiUrl: 'https://captchax.example.com',
        defaultType: 'image',
        enabledTypes: ['image', 'slider', 'icon']
    };
    
    CaptchaX.init(config);
});
```

### 在自定义表单中使用

1. 在表单中添加隐藏的 Token 字段：
```html
<input type="hidden" name="captcha_token" id="captcha_token" value="" />
```

2. 在表单中添加验证码容器：
```html
<div id="captchax-container"></div>
```

3. 在表单提交时验证 Token：
```javascript
require(['CaptchaX_Captcha/js/captchax'], function (CaptchaX) {
    var token = CaptchaX.getToken();
    if (!token) {
        alert('Please complete the captcha verification first.');
        return false;
    }
    // 提交表单
});
```

## API 文档

### 后端验证 API

#### 验证 Token

```
POST /api/verify
```

**请求参数：**
- `secret` (string): Secret Key
- `response` (string): Captcha Token

**响应示例：**
```json
{
    "success": true,
    "error": null
}
```

**错误响应：**
```json
{
    "success": false,
    "error": "Invalid captcha token"
}
```

## 文件结构

```
CaptchaX_Captcha/
├── registration.php                 # 模块注册文件
├── etc/
│   ├── module.xml                   # 模块配置文件
│   ├── config.xml                   # 默认配置
│   ├── frontend/
│   │   ├── routes.xml              # 前端路由
│   │   └── events.xml              # 前端事件
│   └── adminhtml/
│       ├── routes.xml              # 后台路由
│       ├── system.xml              # 系统配置
│       ├── menu.xml                # 后台菜单
│       ├── acl.xml                 # 权限控制
│       └── events.xml              # 后台事件
├── Block/
│   ├── Captcha.php                 # 主验证码块
│   └── Adminhtml/
│       └── Info.php                # 管理信息块
├── Model/
│   ├── Config/
│   │   └── Data.php                # 配置数据模型
│   ├── CaptchaService.php           # 验证码服务
│   └── Source/
│       ├── CaptchaType.php         # 验证码类型选项
│       └── Environment.php          # 环境选项
├── Observer/
│   ├── CustomerLogin.php           # 客户登录观察者
│   ├── CustomerRegister.php        # 客户注册观察者
│   ├── ContactForm.php             # 联系表单观察者
│   └── ProductReview.php           # 产品评论观察者
├── Controller/
│   ├── Frontend/
│   │   └── Index.php               # 前端控制器
│   └── Adminhtml/
│       └── Index.php               # 后台控制器
└── view/
    ├── frontend/
    │   ├── requirejs-config.js     # 前端 RequireJS 配置
    │   ├── layout/                  # 布局文件
    │   ├── templates/               # 模板文件
    │   └── web/
    │       ├── js/                  # JavaScript 文件
    │       └── css/                 # 样式文件
    └── adminhtml/
        ├── requirejs-config.js     # 后台 RequireJS 配置
        └── web/
            └── js/                  # 后台 JavaScript
```

## 事件列表

### 前端事件

- `customer_login` - 客户登录时触发
- `customer_register_success` - 客户注册成功时触发
- `contact_submit` - 联系表单提交时触发
- `review_save_after` - 评论保存后触发

### 控制器事件

- `controller_action_predispatch_customer_account_loginPost` - 登录表单提交前
- `controller_action_predispatch_customer_account_createpost` - 注册表单提交前
- `controller_action_predispatch_contact_index_post` - 联系表单提交前
- `controller_action_predispatch_review_product_post` - 评论表单提交前

## 权限配置

在 `etc/adminhtml/acl.xml` 中定义了以下权限：

- `CaptchaX_Captcha::captchax` - CaptchaX 主权限
- `CaptchaX_Captcha::config` - 配置权限
- `CaptchaX_Captcha::dashboard` - 仪表板权限

## 故障排除

### 验证码不显示

1. 检查模块是否已启用：`php bin/magento module:status CaptchaX_Captcha`
2. 确认 Site Key 和 Secret Key 已正确配置
3. 检查浏览器控制台是否有 JavaScript 错误

### 验证总是失败

1. 确认 Secret Key 配置正确
2. 检查 API 服务是否正常运行
3. 查看 Magento 日志文件：`var/log/exception.log`

### 前端 JavaScript 错误

1. 清除 Magento 缓存：`php bin/magento cache:clean`
2. 清除浏览器缓存
3. 重新编译 DI：`php bin/magento setup:di:compile`

## 更新日志

### Version 1.0.0 (2026-05-15)
- 初始版本发布
- 支持 6 种验证码类型
- 支持客户登录、注册、联系表单、评论表单
- Magento 2.4+ 兼容性

## 技术支持

- 官方文档: https://captchax.example.com/docs
- 技术支持: https://captchax.example.com/support
- 邮箱: support@captchax.example.com

## 许可证

本插件遵循 MIT 许可证。

## 开发者信息

- **插件名称**: CaptchaX Magento Plugin
- **版本**: 1.0.0
- **发布日期**: 2026-05-15
- **开发者**: CaptchaX Team
