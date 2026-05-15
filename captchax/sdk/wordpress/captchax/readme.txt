=== CaptchaX - 行为验证码 ===
Contributors: captchax
Tags: captcha, verification, security, anti-spam, login, comment, register, woocommerce, contact-form
Requires at least: 5.0
Tested up to: 6.4
Requires PHP: 7.4
Stable tag: 1.1.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

CaptchaX 现代化行为验证码系统，支持滑块、点选、拼图等多种验证方式，全面保护 WordPress 网站安全。

== Description ==

CaptchaX 是一个功能强大的 WordPress 验证码插件，为网站提供全面的安全保护。本插件采用先进的风险控制算法，能够智能识别真实用户与机器人的行为差异。

= 核心特性 =

* **多场景表单保护**: 支持登录、注册、评论、密码找回、联系表单等多种场景
* **多种验证方式**: 支持滑块验证、点选验证、拼图验证、旋转验证、文字验证
* **完整 WooCommerce 集成**: 保护结账、登录、注册等电商核心流程
* **Contact Form 7 集成**: 自动与联系表单插件集成
* **REST API 支持**: 提供完整的 API 接口供第三方系统调用
* **多语言支持**: 内置中英文语言包
* **主题定制**: 支持浅色和深色主题

= 支持的表单 =

* 评论表单
* 登录表单
* 注册表单
* 找回密码表单
* 重置密码表单
* 联系表单（Contact Form 7）
* WooCommerce 结账表单
* WooCommerce 登录表单
* WooCommerce 注册表单

= 技术特性 =

* WordPress 5.0+ 兼容
* PHP 7.4+ 支持
* REST API 支持
* AJAX 无刷新验证
* 国际化支持（i18n）
* 安全过滤（sanitize）
* nonce 验证
* HMAC-SHA256 签名验证

== Installation ==

1. 上传 `captchax` 文件夹到 `/wp-content/plugins/` 目录
2. 在 WordPress 的'插件'菜单中激活插件
3. 在设置页面（设置 > CaptchaX）配置您的 API Key 和 API Secret
4. 选择需要保护的表单和验证码类型

= 配置 API =

访问 [CaptchaX 官网](https://captchax.com) 注册账号并创建应用，获取 API Key 和 API Secret。

开发环境服务器地址: `http://localhost:3000`
生产环境服务器地址: `https://captchax.example.com`

== Frequently Asked Questions ==

= 如何获取 API Key？ =

访问 [CaptchaX 官网](https://captchax.com) 注册账号并创建应用，在应用详情中获取 API Key 和 API Secret。

= 支持哪些验证类型？ =

当前支持以下验证类型：
* 滑块验证 - 拖动滑块完成拼图
* 点选验证 - 按顺序点击指定区域
* 拼图验证 - 将拼图块拖入正确位置
* 旋转验证 - 将图片旋转至正确角度
* 文字验证 - 输入显示的字符或计算数学题

= 如何自定义主题？ =

在设置页面选择浅色或深色主题，验证码组件会自动应用对应的主题样式。

= 如何在自定义表单中使用？ =

使用简码 `[captchax scene="custom"]` 在任意位置插入验证码，或通过 REST API `/wp-json/captchax/v1/verify` 进行验证。

= WooCommerce 集成需要额外配置吗？ =

安装并启用 WooCommerce 插件后，在 CaptchaX 设置页面的 WooCommerce 设置区域启用相应功能即可。

== Changelog ==

= 1.1.0 =
* 新增 WooCommerce 完整集成支持（结账、登录、注册、密码找回）
* 新增 Contact Form 7 深度集成
* 新增密码重置表单保护
* 新增联系表单保护
* 增强 REST API（设置、状态、脚本接口）
* 增强前端 JavaScript API 和事件系统
* 支持自定义错误消息
* 支持跳过已登录用户验证选项

= 1.0.0 =
* 初始版本发布
* 支持评论、登录、注册、找回密码表单
* 支持多种验证码类型
* 支持浅色和深色主题
* 内置中英文国际化

== Upgrade Notice ==

= 1.1.0 =
新增 WooCommerce 集成和 Contact Form 7 集成，推荐所有用户升级。

= 1.0.0 =
初始版本发布
