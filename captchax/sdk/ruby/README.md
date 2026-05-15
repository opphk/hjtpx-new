# CaptchaX Ruby SDK

CaptchaX Ruby SDK 为 Ruby 应用程序提供了 CaptchaX 验证码服务的集成接口。

## 安装

将以下内容添加到你的 `Gemfile`:

```ruby
gem 'captchax', '~> 1.0.0'
```

然后执行:

```bash
bundle install
```

## 快速开始

### 初始化客户端

```ruby
require 'captchax'

# 开发环境
client = CaptchaX.new(
  base_url: 'http://localhost:3000',
  app_id: 'your-app-id',
  timeout: 10_000,
  retry_times: 3
)

# 生产环境
client = CaptchaX.new(
  base_url: 'https://captchax.example.com',
  app_id: 'your-app-id',
  timeout: 30_000,
  retry_times: 5,
  api_version: :v2
)
```

### 滑块验证码

```ruby
# 生成滑块验证码
captcha = client.generate_slider_captcha(
  scenario_id: 'login-scenario',
  extra_data: { user_id: '123' }
)
captcha_id = captcha[:id]
background_image = captcha[:background_b64]
slider_image = captcha[:slider_b64]
target_x = captcha[:target_x]

# 验证滑块验证码
result = client.verify_slider_captcha(
  captcha_id: captcha_id,
  distance: 0.95
)
puts "验证结果: #{result[:success]}"
```

### 点选验证码

```ruby
# 生成点选验证码
captcha = client.generate_click_captcha(
  scenario_id: 'signup-scenario',
  extra_data: { session_id: 'abc' }
)
captcha_id = captcha[:id]
image = captcha[:image]
target_chars = captcha[:target_chars]
char_positions = captcha[:char_positions]

# 验证点选验证码
clicks = [
  CaptchaX::CharPosition.new(char: 'A', x: 100, y: 50),
  CaptchaX::CharPosition.new(char: 'B', x: 200, y: 150)
]
result = client.verify_click_captcha(
  captcha_id: captcha_id,
  clicks: clicks
)
puts "验证结果: #{result[:success]}, 得分: #{result[:score]}"
```

### 拼图验证码

```ruby
# 生成拼图验证码
captcha = client.generate_puzzle_captcha(
  scenario_id: 'puzzle-scenario',
  extra_data: { device: 'mobile' }
)
captcha_id = captcha[:id]

# 验证拼图验证码
result = client.verify_puzzle_captcha(
  captcha_id: captcha_id,
  distance: 0.98
)
puts "验证结果: #{result[:success]}"
```

### 批量验证

```ruby
items = [
  CaptchaX::BatchVerifyItem.new(
    captcha_id: 'captcha-1',
    type: 'slider',
    target_x: 200,
    target_y: 100
  ),
  CaptchaX::BatchVerifyItem.new(
    captcha_id: 'captcha-2',
    type: 'click',
    clicks: [CaptchaX::CharPosition.new(char: 'A', x: 100, y: 50)]
  )
]

result = client.batch_verify(items: items)
puts "总计: #{result[:summary][:total]}, 成功: #{result[:summary][:success]}"
```

### 场景管理

```ruby
# 创建场景
scenario = client.create_scenario(
  name: 'Login Captcha',
  description: 'Login page captcha',
  difficulty: 'medium',
  config: { timeout: 60 }
)

# 列出所有场景
scenarios = client.list_scenarios

# 获取单个场景
scenario = client.get_scenario('scenario-id')

# 更新场景
updated = client.update_scenario(
  scenario_id: 'scenario-id',
  name: 'Updated Name',
  difficulty: 'hard'
)

# 删除场景
client.delete_scenario('scenario-id')
```

### Webhook 管理

```ruby
# 创建 Webhook
webhook = client.create_webhook(
  url: 'https://example.com/webhook',
  events: %w[verify.success verify.fail],
  secret: 'your-secret',
  headers: { 'Authorization' => 'Bearer token' }
)

# 列出所有 Webhook
webhooks = client.list_webhooks

# 获取单个 Webhook
webhook = client.get_webhook('webhook-id')

# 更新 Webhook
client.update_webhook(webhook_id: 'webhook-id', enabled: false)

# 删除 Webhook
client.delete_webhook('webhook-id')
```

### 健康检查

```ruby
health = client.health_check
puts "服务状态: #{health[:status]}"
```

## 错误处理

SDK 定义了以下错误类:

```ruby
begin
  client.generate_slider_captcha
rescue CaptchaX::ConfigurationError => e
  puts "配置错误: #{e.message}"
rescue CaptchaX::ApiError => e
  puts "API 错误: #{e.message}, HTTP状态: #{e.http_status}, 代码: #{e.code}"
rescue CaptchaX::TimeoutError => e
  puts "请求超时: #{e.message}"
rescue CaptchaX::RetryExhaustedError => e
  puts "重试次数耗尽: #{e.message}"
end
```

## 测试

### 测试环境设置

安装测试依赖:

```bash
bundle install
```

### 运行测试

运行所有测试:

```bash
bundle exec rspec
```

运行特定测试文件:

```bash
bundle exec rspec spec/captchax/error_spec.rb
bundle exec rspec spec/captchax/models_spec.rb
bundle exec rspec spec/captchaX_client_spec.rb
bundle exec rspec spec/integration_spec.rb
```

### 生成覆盖率报告

运行测试并生成覆盖率报告:

```bash
COVERAGE=true bundle exec rspec
```

覆盖率报告将生成在 `coverage/` 目录。

生成 LCOV 格式报告 (用于 CI/CD):

```bash
COVERAGE=lcov bundle exec rspec
```

生成的文件:
- `coverage/index.html` - HTML 覆盖率报告
- `coverage/lcov/lcov.info` - LCOV 格式报告

### 测试覆盖率目标

- 单元测试: 覆盖所有模型类和错误类
- Mock 测试: 覆盖所有 API 方法和错误处理
- 集成测试: 覆盖完整的工作流程和错误处理

目标覆盖率: 80% 以上

### 测试结构

```
spec/
├── spec_helper.rb              # 测试配置和辅助方法
├── coverage_formatter.rb       # 覆盖率报告配置
├── captchaX_client_spec.rb    # Client 类主测试 (Mock 测试)
├── captchax/
│   ├── error_spec.rb          # 错误类单元测试
│   └── models_spec.rb         # 模型类单元测试
└── integration_spec.rb        # 集成测试
```

### 测试环境配置

测试使用以下配置:

- **开发环境**: `http://localhost:3000`
- **生产环境**: `https://captchax.example.com`
- **超时**: 10 秒
- **重试次数**: 3 次

### 常见测试场景

1. **验证码生成和验证流程**: 端到端测试滑块、点选和拼图验证码的生成和验证流程
2. **错误处理**: 测试网络超时、连接失败、API 错误等场景
3. **重试机制**: 测试指数退避重试逻辑
4. **并发请求**: 测试批量验证功能
5. **API 版本控制**: 测试不同 API 版本的行为

## 配置选项

| 选项 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `base_url` | String | 必需 | API 基础 URL |
| `app_id` | String | nil | 应用 ID |
| `timeout` | Integer | 10000 | 请求超时 (毫秒) |
| `retry_times` | Integer | 3 | 重试次数 |
| `api_version` | Symbol | :v1 | API 版本 (`:v1` 或 `:v2`) |

## 许可证

MIT License
