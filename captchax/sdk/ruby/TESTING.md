# CaptchaX Ruby SDK 测试文档

## 测试概览

本文档描述 CaptchaX Ruby SDK 的完整测试套件。

## 测试结构

```
spec/
├── spec_helper.rb              # 测试配置和辅助方法
├── coverage_formatter.rb       # 覆盖率报告配置
├── captchaX_client_spec.rb    # Client 类主测试 (Mock 测试)
├── captchax/
│   ├── error_spec.rb          # 错误类单元测试
│   └── models_spec.rb         # 模型类单元测试
├── integration_spec.rb        # 集成测试
└── run_tests.rb              # 测试运行脚本
```

## 测试类型

### 1. 单元测试

#### 错误类测试 (error_spec.rb)

- **CaptchaXError**: 测试基本错误类的初始化和属性
- **ConfigurationError**: 测试配置错误类
- **ApiError**: 测试 API 错误类，包括 HTTP 状态码
- **TimeoutError**: 测试超时错误类
- **RetryExhaustedError**: 测试重试耗尽错误类
- **错误类层次结构**: 验证错误类继承关系

#### 模型类测试 (models_spec.rb)

测试所有模型类的：
- 初始化和属性设置
- `to_h` 方法（对象转哈希）
- `from_h` 方法（哈希转对象）
- 边界条件和默认值

覆盖的模型类：
- `CharPosition`: 字符位置
- `SliderCaptchaResult`: 滑块验证码结果
- `SliderVerifyResult`: 滑块验证结果
- `ClickCaptchaResult`: 点选验证码结果
- `ClickVerifyResult`: 点选验证结果
- `PuzzleCaptchaResult`: 拼图验证码结果
- `PuzzleVerifyResult`: 拼图验证结果
- `Scenario`: 场景
- `Webhook`: Webhook
- `BatchVerifyItem`: 批量验证项
- `BatchVerifyResult`: 批量验证结果
- `BatchVerifySummary`: 批量验证摘要
- `BatchVerifyResponse`: 批量验证响应
- `HealthStatus`: 健康状态

### 2. Mock 测试 (captchaX_client_spec.rb)

使用 WebMock 模拟 HTTP 请求，测试：

#### Client 初始化测试
- 默认配置
- 自定义配置
- API 版本控制
- 超时设置
- 重试次数配置

#### 连接管理测试
- Faraday 连接创建
- 请求头设置
- 连接缓存

#### 验证码操作测试
- 滑块验证码生成和验证
- 点选验证码生成和验证
- 拼图验证码生成和验证
- 批量验证
- 额外数据传递

#### 场景管理测试
- 创建场景
- 列出场景
- 获取单个场景
- 更新场景
- 删除场景

#### Webhook 管理测试
- 创建 Webhook
- 列出 Webhook
- 获取单个 Webhook
- 更新 Webhook
- 删除 Webhook

#### 错误处理测试
- API 错误处理
- 超时错误处理
- 连接失败处理
- 空响应处理
- 非零代码错误处理

#### 重试机制测试
- 500 错误重试
- 429 速率限制重试
- 400/404 错误不重试
- 指数退避
- 最大重试次数

#### API 版本控制测试
- 默认 v1 版本
- 自定义 v2 版本

### 3. 集成测试 (integration_spec.rb)

端到端测试完整的工作流程：

#### 开发/生产环境测试
- 开发环境配置（http://localhost:3000）
- 生产环境配置（https://captchax.example.com）
- 自定义超时和重试配置

#### 完整验证码工作流测试
- 滑块验证码：生成 → 验证
- 点选验证码：生成 → 验证
- 拼图验证码：生成 → 验证
- 批量验证工作流

#### 场景管理工作流
- 创建 → 列出 → 获取 → 更新 → 删除

#### Webhook 管理工作流
- 创建 → 列出 → 获取 → 更新 → 删除

#### 错误处理集成测试
- 网络超时处理
- 连接失败处理
- API 错误重试
- 非重试性错误处理

#### 健康检查测试
- 开发环境健康检查
- 生产环境健康检查

## 测试覆盖率

目标：80% 以上
当前覆盖率：**99.67%**

```
Line Coverage: 99.67% (306 / 307)
```

## 测试配置

### 环境变量

- `COVERAGE=true`: 启用覆盖率报告生成
- `COVERAGE=lcov`: 生成 LCOV 格式的覆盖率报告

### WebMock 配置

- 启用：模拟 HTTP 请求
- 禁用真实网络连接（允许 localhost）
- 自动清理测试桩

### SimpleCov 配置

- 最小覆盖率阈值：80%
- 跟踪文件：`lib/**/*.rb`
- 过滤器：排除 `spec/` 和 `vendor/`

## 运行测试

### 运行所有测试

```bash
bundle exec rspec
# 或
ruby run_tests.rb
```

### 运行特定测试文件

```bash
# 单元测试
bundle exec rspec spec/captchax/error_spec.rb
bundle exec rspec spec/captchax/models_spec.rb

# Mock 测试
bundle exec rspec spec/captchaX_client_spec.rb

# 集成测试
bundle exec rspec spec/integration_spec.rb
```

### 生成覆盖率报告

```bash
COVERAGE=true bundle exec rspec
```

报告生成位置：
- HTML 报告：`coverage/index.html`
- LCOV 报告：`coverage/lcov/lcov.info`

### 运行带格式化的测试

```bash
bundle exec rspec --format documentation
```

## 测试环境

### Ruby 版本

- 最低要求：Ruby 3.0
- 推荐版本：Ruby 3.2+

### 依赖

- `rspec ~> 3.12`: 测试框架
- `webmock ~> 3.18`: HTTP 请求模拟
- `simplecov ~> 0.22`: 覆盖率工具
- `simplecov-lcov ~> 0.8`: LCOV 格式支持
- `faraday ~> 2.7`: HTTP 客户端

### API 环境

- **开发环境**: http://localhost:3000
- **生产环境**: https://captchax.example.com

## 最佳实践

### 测试命名

使用清晰的描述性测试名称：

```ruby
describe '#generate_slider_captcha' do
  it 'generates slider captcha with default parameters'
  it 'passes scenario_id when provided'
  it 'raises error when API returns non-zero code'
end
```

### Mock 使用

- 使用 WebMock 模拟外部 HTTP 请求
- 避免测试间的状态泄漏
- 每个测试使用独立的 stub

### 断言风格

```ruby
expect(result[:id]).to eq('captcha-123')
expect(result[:success]).to be true
expect(client).to be_a(CaptchaX::Client)
```

### 错误测试

```ruby
expect { client.health_check }.to raise_error(CaptchaX::ApiError) do |error|
  expect(error.http_status).to eq(500)
end
```

## CI/CD 集成

### GitHub Actions 示例

```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: ruby/setup-ruby@v1
        with:
          ruby-version: 3.2
      - name: Install dependencies
        run: bundle install
      - name: Run tests
        run: COVERAGE=lcov bundle exec rspec
      - name: Upload coverage
        uses: actions/upload-artifact@v3
        with:
          name: coverage
          path: coverage/
```

## 故障排除

### 问题：WebMock stub 不匹配

**解决方案**：
- 检查请求的 URL、方法和 headers
- 使用 `to_raise` 进行异常模拟
- 确保 stub 在请求前定义

### 问题：覆盖率报告未生成

**解决方案**：
- 确认 `COVERAGE=true` 环境变量已设置
- 检查 SimpleCov 是否正确加载
- 查看 `coverage/` 目录权限

### 问题：测试超时

**解决方案**：
- 减少重试次数：`retry_times: 1`
- 增加超时时间：`timeout: 30_000`
- 禁用重试机制进行快速测试

## 持续改进

### 添加新测试

1. 为新功能添加单元测试
2. 为 API 端点添加 Mock 测试
3. 添加集成测试覆盖完整流程
4. 更新本文档

### 覆盖率监控

- 定期检查覆盖率报告
- 保持覆盖率在 80% 以上
- 添加缺失的边界条件测试

## 贡献指南

提交 PR 时，请确保：

1. 所有测试通过
2. 覆盖率未下降
3. 添加了新功能的测试
4. 更新了相关文档
