# CaptchaX JavaScript SDK - Test Documentation

## 测试概览

CaptchaX JavaScript SDK 提供完整的测试覆盖，包括单元测试、Mock 测试、集成测试和性能测试。

## 测试框架

- **Jest**: 主要测试框架
- **Supertest**: HTTP 集成测试
- **ts-jest**: TypeScript 支持

## 测试脚本

```bash
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
```

## 测试结构

```
test/
├── setup.ts                 # Jest 全局设置
├── client.test.ts          # 基础客户端测试
├── unit/                   # 单元测试
│   ├── client.test.ts     # 客户端单元测试
│   └── http.test.ts       # HTTP 客户端单元测试
├── mock/                   # Mock 测试
│   └── captcha-flow.test.ts # 验证码流程 Mock 测试
├── integration/            # 集成测试
│   ├── test-server.ts     # 测试服务器
│   └── client.integration.test.ts # 集成测试
└── performance/            # 性能测试
    └── client.performance.test.ts # 性能测试
```

## 测试覆盖范围

### 1. 单元测试

#### HttpClient 单元测试
- 构造函数测试
- Header 设置测试
- GET/POST/PUT/DELETE 请求测试
- 错误处理测试
  - HTTP 错误 (4xx, 5xx)
  - 网络错误
  - 超时处理
- 重试机制测试
- 去重请求测试

#### CaptchaXClient 单元测试
- 构造函数测试
- API 版本管理测试
- 健康检查测试
- 滑块验证码测试
  - 生成验证码
  - 验证验证码
- 点选验证码测试
  - 生成验证码
  - 验证验证码
- 拼图验证码测试
  - 生成验证码
  - 验证验证码
- 批量验证测试
- 场景管理测试
  - 创建场景
  - 获取场景
  - 更新场景
  - 删除场景
  - 列出场景
- Webhook 管理测试
  - 注册 Webhook
  - 列出 Webhook
  - 更新 Webhook
  - 注销 Webhook
- 客户端信息生成测试
- 生成并验证流程测试

### 2. Mock 测试

#### 验证码流程测试
- 滑块验证码完整流程
- 点选验证码完整流程
- 拼图验证码完整流程
- 批量验证流程
- 错误处理
  - 网络错误重试
  - HTTP 错误处理
  - 超时处理
- API 版本切换
- 自定义 Header
- 并发请求处理
- 请求去重

### 3. 集成测试

集成测试使用本地 Express 服务器模拟真实 API 端点。

#### 测试端点
- `/health` - 健康检查
- `/api/v1/captcha/slider` - 滑块验证码
- `/api/v1/captcha/slider/verify` - 滑块验证
- `/api/v1/captcha/click` - 点选验证码
- `/api/v1/captcha/click/verify` - 点选验证
- `/api/v1/captcha/puzzle` - 拼图验证码
- `/api/v1/captcha/puzzle/verify` - 拼图验证
- `/api/v1/captcha/batch/verify` - 批量验证
- `/api/v1/captcha/scenarios` - 场景管理
- `/api/v1/captcha/webhook` - Webhook 管理

#### 测试场景
- 健康检查
- 滑块验证码生成和验证
- 点选验证码生成和验证
- 拼图验证码生成和验证
- 批量验证
- 场景 CRUD 操作
- Webhook CRUD 操作
- 错误处理
- API 版本切换

### 4. 性能测试

#### 单请求性能测试
- 滑块验证码生成性能
- 滑块验证码验证性能
- 点选验证码生成性能
- 拼图验证码生成性能
- 健康检查性能

#### 并发请求性能测试
- 10 个并发请求
- 50 个并发请求
- 100 个并发请求
- 200 个并发请求 (突发流量)

#### 批量操作性能测试
- 小批量验证 (10 项)
- 大批量验证 (50 项)

#### 场景操作性能测试
- 场景 CRUD 性能
- 场景列表性能

#### Webhook 操作性能测试
- Webhook CRUD 性能

#### 资源使用测试
- 内存使用测试
- 持续负载测试
- 延迟测试

## 覆盖率报告

运行覆盖率测试：

```bash
npm run test:coverage
```

覆盖率报告将生成在 `coverage/` 目录：
- `coverage/index.html` - HTML 格式报告
- `coverage/lcov.info` - LCOV 格式报告
- `coverage/coverage-summary.json` - JSON 格式摘要

### 覆盖率阈值

项目要求达到以下覆盖率目标：
- 分支覆盖率: 80%
- 函数覆盖率: 80%
- 行覆盖率: 80%
- 语句覆盖率: 80%

## 测试环境配置

### 开发环境
```typescript
const client = new CaptchaXClient({
  baseUrl: 'http://localhost:3000',
  appId: 'your-app-id',
  timeout: 5000,
  retryTimes: 2
});
```

### 生产环境
```typescript
const client = new CaptchaXClient({
  baseUrl: 'https://captchax.example.com',
  appId: 'your-app-id',
  timeout: 10000,
  retryTimes: 3
});
```

## Mock 数据

测试使用以下 Mock 数据：

### 滑块验证码结果
```typescript
{
  id: 'slider-mock-123',
  background_b64: 'mock-background-base64',
  slider_b64: 'mock-slider-base64',
  target_x: 200,
  target_y: 150
}
```

### 点选验证码结果
```typescript
{
  id: 'click-mock-123',
  image: 'mock-image-base64',
  target_chars: ['A', 'B', 'C'],
  char_positions: [
    { char: 'A', x: 100, y: 50 },
    { char: 'B', x: 200, y: 100 },
    { char: 'C', x: 300, y: 150 }
  ]
}
```

### 拼图验证码结果
```typescript
{
  id: 'puzzle-mock-123',
  background_b64: 'mock-bg-base64',
  puzzle_b64: 'mock-puzzle-base64',
  target_x: 180,
  target_y: 120
}
```

## 最佳实践

### 编写新测试

1. 在相应的测试目录创建测试文件
2. 使用清晰的 describe 和 it 块
3. 添加有意义的测试描述
4. 确保测试是独立的
5. 使用 beforeEach/afterEach 进行清理

### 测试命名约定

```typescript
describe('FeatureName', () => {
  describe('subFeature', () => {
    it('should do something specific', () => {
      // test implementation
    });
  });
});
```

### Mock 使用

```typescript
// Mock fetch
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  status: 200,
  json: jest.fn().mockResolvedValue({ data: 'mock' })
});

// 清理 Mock
afterEach(() => {
  jest.clearAllMocks();
});
```

## 持续集成

测试可以在 CI 环境中自动运行：

```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '16'
      - run: npm install
      - run: npm run test:coverage
```

## 故障排除

### 测试失败

1. 检查网络连接
2. 验证测试服务器是否运行
3. 检查 Mock 数据是否正确
4. 查看详细的测试输出

### 覆盖率不达标

1. 增加缺失的测试用例
2. 检查代码路径覆盖
3. 使用 `--coverage` 查看详细报告

## 性能基准

### 期望性能指标

| 操作 | 平均延迟 | P95 延迟 |
|------|---------|---------|
| 健康检查 | < 30ms | < 50ms |
| 验证码生成 | < 100ms | < 200ms |
| 验证码验证 | < 50ms | < 100ms |
| 批量验证 (10项) | < 1000ms | < 2000ms |

### 并发处理能力

- 200 并发请求成功率 > 95%
- 持续负载 > 100 req/s
