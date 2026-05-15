# CaptchaX JavaScript SDK

<p align="center">
  <img src="https://img.shields.io/badge/Version-1.0.0-blue.svg" alt="Version">
  <img src="https://img.shields.io/badge/License-MIT-green.svg" alt="License">
  <img src="https://img.shields.io/badge/Node-%3E%3D14.0.0-brightgreen.svg" alt="Node">
</p>

CaptchaX JavaScript/TypeScript SDK 提供了对 CaptchaX 验证码服务的高级别封装，支持滑块验证、点选验证和拼图验证三种验证方式。

## 目录

- [特性](#特性)
- [安装](#安装)
- [快速开始](#快速开始)
- [API 参考](#api-参考)
- [测试](#测试)
- [示例](#示例)
- [许可证](#许可证)

## 特性

- **三种验证码类型**：滑块验证、点选验证、拼图验证
- **完整的类型定义**：使用 TypeScript 编写，提供完整的类型支持
- **Promise-based API**：基于 async/await 的现代化 API 设计
- **可配置的重试机制**：自动重试失败的请求
- **完善的错误处理**：统一的错误类型和错误处理
- **全面的测试覆盖**：单元测试、集成测试、性能测试

## 安装

### 使用 npm

```bash
npm install captchax-sdk
```

### 使用 yarn

```bash
yarn add captchax-sdk
```

### 使用 pnpm

```bash
pnpm add captchax-sdk
```

## 快速开始

### 初始化客户端

```typescript
import { CaptchaXClient } from 'captchax-sdk';

const client = new CaptchaXClient({
  baseUrl: 'https://captchax.example.com', // 或使用 http://localhost:3000 开发环境
  appId: 'your-app-id',
  timeout: 5000,
  retryTimes: 3
});
```

### 生成滑块验证码

```typescript
const captcha = await client.generateSliderCaptcha({
  width: 300,
  height: 200,
  clientInfo: 'user-browser-info',
  scenarioId: 'login-scenario'
});

console.log('验证码ID:', captcha.id);
console.log('目标位置:', captcha.target_x, captcha.target_y);
```

### 验证滑块验证码

```typescript
const result = await client.verifySliderCaptcha(
  captcha.id,
  captcha.target_x,
  captcha.target_y
);

if (result.success) {
  console.log('验证成功!');
}
```

### 生成点选验证码

```typescript
const clickCaptcha = await client.generateClickCaptcha({
  charCount: 4,
  clientInfo: 'user-info'
});

console.log('目标字符:', clickCaptcha.target_chars);
console.log('字符位置:', clickCaptcha.char_positions);
```

### 验证点选验证码

```typescript
const clicks = clickCaptcha.char_positions.map(pos => ({
  char: pos.char,
  x: pos.x,
  y: pos.y
}));

const result = await client.verifyClickCaptcha(clickCaptcha.id, clicks);

console.log('验证得分:', result.score);
```

### 生成拼图验证码

```typescript
const puzzleCaptcha = await client.generatePuzzleCaptcha({
  width: 320,
  height: 240
});
```

### 批量验证

```typescript
const results = await client.batchVerify([
  { captcha_id: 'id1', type: 'slider', target_x: 100 },
  { captcha_id: 'id2', type: 'click', target_x: 0, clicks: [] },
  { captcha_id: 'id3', type: 'puzzle', target_x: 150, target_y: 100 }
]);

console.log('成功:', results.summary.success);
console.log('失败:', results.summary.failed);
```

### 健康检查

```typescript
const health = await client.healthCheck();
console.log('服务状态:', health.status);
```

## API 参考

### CaptchaXClient

#### 构造函数

```typescript
new CaptchaXClient(config: CaptchaXConfig)
```

**配置参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| baseUrl | string | 是 | API 基础地址 |
| appId | string | 否 | 应用 ID |
| timeout | number | 否 | 请求超时时间（毫秒），默认 10000 |
| retryTimes | number | 否 | 重试次数，默认 3 |
| apiVersion | 'v1' \| 'v2' | 否 | API 版本，默认 'v1' |

#### 方法

##### 验证码生成

- `generateSliderCaptcha(options?)` - 生成滑块验证码
- `generateClickCaptcha(options?)` - 生成点选验证码
- `generatePuzzleCaptcha(options?)` - 生成拼图验证码

##### 验证码验证

- `verifySliderCaptcha(captchaId, targetX, targetY?)` - 验证滑块验证码
- `verifyClickCaptcha(captchaId, clicks)` - 验证点选验证码
- `verifyPuzzleCaptcha(captchaId, targetX, targetY?)` - 验证拼图验证码
- `batchVerify(items, options?)` - 批量验证

##### 便捷方法

- `generateAndVerifySlider(options?, callback?)` - 生成并验证滑块验证码
- `generateAndVerifyClick(options?, callback?)` - 生成并验证点选验证码

##### 健康检查

- `healthCheck()` - 检查服务健康状态

##### 场景管理

- `listScenarios()` - 列出所有场景
- `createScenario(scenario)` - 创建场景
- `getScenario(id)` - 获取场景详情
- `updateScenario(id, updates)` - 更新场景
- `deleteScenario(id)` - 删除场景

##### Webhook 管理

- `registerWebhook(webhook)` - 注册 Webhook
- `listWebhooks(options?)` - 列出 Webhook
- `updateWebhook(id, updates)` - 更新 Webhook
- `unregisterWebhook(id)` - 注销 Webhook

##### 工具方法

- `createClientInfo(info?)` - 创建客户端信息
- `setAppId(appId)` - 设置应用 ID
- `setApiVersion(version)` - 设置 API 版本

### CaptchaXError

错误类型，用于处理 API 错误和网络错误。

```typescript
try {
  await client.verifySliderCaptcha('invalid-id', 100, 100);
} catch (error) {
  if (error instanceof CaptchaXError) {
    console.error('错误码:', error.code);
    console.error('状态码:', error.statusCode);
    console.error('详细信息:', error.details);
  }
}
```

## 测试

### 测试概览

SDK 提供全面的测试覆盖，包括：

- **单元测试** (`test/unit/`)：测试各个模块的独立功能
- **Mock 测试** (`test/mock/`)：使用 Mock 数据测试业务逻辑
- **集成测试** (`test/integration/`)：使用本地服务器测试完整流程
- **性能测试** (`test/performance/`)：测试性能和并发能力

### 测试脚本

```bash
# 安装依赖
npm install

# 运行所有测试
npm test

# 运行单元测试
npm run test:unit

# 运行集成测试
npm run test:integration

# 运行性能测试
npm run test:performance

# 运行带覆盖率的测试
npm run test:coverage

# 运行所有测试类型
npm run test:all

# 监听模式运行测试
npm run test:watch
```

### 测试覆盖报告

运行覆盖率测试：

```bash
npm run test:coverage
```

覆盖率报告将生成在 `coverage/` 目录：
- `coverage/index.html` - HTML 格式报告
- `coverage/lcov.info` - LCOV 格式报告
- `coverage/coverage-summary.json` - JSON 格式摘要

**覆盖率阈值要求：**
- 分支覆盖率: 80%
- 函数覆盖率: 80%
- 行覆盖率: 80%
- 语句覆盖率: 80%

### 测试环境配置

**开发环境：**
```typescript
const client = new CaptchaXClient({
  baseUrl: 'http://localhost:3000',
  appId: 'test-app-id',
  timeout: 5000,
  retryTimes: 1
});
```

**生产环境：**
```typescript
const client = new CaptchaXClient({
  baseUrl: 'https://captchax.example.com',
  appId: 'your-app-id',
  timeout: 10000,
  retryTimes: 3
});
```

### 编写新测试

在相应的测试目录创建测试文件：

```typescript
// test/unit/my-feature.test.ts
describe('MyFeature', () => {
  it('should do something', () => {
    // test implementation
  });
});
```

详细测试文档请参阅 [TEST-README.md](./TEST-README.md)。

## 示例

### 基础使用示例

```typescript
import { CaptchaXClient } from 'captchax-sdk';

async function main() {
  const client = new CaptchaXClient({
    baseUrl: 'http://localhost:3000',
    appId: 'my-app'
  });

  // 健康检查
  const health = await client.healthCheck();
  console.log('服务状态:', health.status);

  // 生成并验证滑块验证码
  const { captcha, verifyResult } = await client.generateAndVerifySlider();
  console.log('验证码ID:', captcha.id);
  console.log('验证结果:', verifyResult.success);

  // 场景管理
  const scenario = await client.createScenario({
    name: '登录场景',
    difficulty: 'medium'
  });

  // Webhook 注册
  const webhook = await client.registerWebhook({
    app_id: 'my-app',
    url: 'https://myapp.com/webhook',
    events: ['verify.success', 'verify.fail']
  });
}

main();
```

### 浏览器环境使用

```typescript
import { CaptchaXClient } from 'captchax-sdk';

const client = new CaptchaXClient({
  baseUrl: 'https://captchax.example.com',
  appId: 'browser-app'
});

// 创建浏览器客户端信息
const clientInfo = client.createClientInfo({
  ip: await getClientIP()
});

const captcha = await client.generateSliderCaptcha({
  clientInfo
});
```

### Node.js 环境使用

```typescript
import { CaptchaXClient } from 'captchax-sdk';

const client = new CaptchaXClient({
  baseUrl: 'https://captchax.example.com',
  appId: 'node-app'
});

// 生成验证码
const captcha = await client.generateClickCaptcha({
  charCount: 4
});

// 验证验证码
const result = await client.verifyClickCaptcha(captcha.id, [
  { char: 'A', x: 100, y: 50 },
  { char: 'B', x: 200, y: 100 }
]);
```

## 浏览器兼容性

SDK 支持所有现代浏览器和 Node.js 14+ 环境。

## 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件。

## 贡献

欢迎提交 Issue 和 Pull Request！

## 联系方式

- GitHub Issues: [https://github.com/your-org/captchax/issues](https://github.com/your-org/captchax/issues)
- 邮箱: support@example.com
