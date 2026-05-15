# CaptchaX PHP SDK

CaptchaX 多语言 SDK - PHP 客户端，用于 CaptchaX 验证码验证服务。

## 目录

- [功能特性](#功能特性)
- [环境配置](#环境配置)
- [快速开始](#快速开始)
- [API 文档](#api-文档)
- [测试](#测试)
- [代码覆盖率](#代码覆盖率)
- [贡献指南](#贡献指南)
- [许可证](#许可证)

## 功能特性

- 支持多种验证码类型：滑块验证码、点击验证码、拼图验证码
- 完整的错误处理机制
- 自动重试机制
- 类型提示支持
- PSR 标准兼容

## 环境配置

### 开发环境

```php
$baseUrl = 'http://localhost:3000';
```

### 生产环境

```php
$baseUrl = 'https://captchax.example.com';
```

## 快速开始

### 安装依赖

```bash
composer install
```

### 基本使用

```php
use CaptchaX\SDK\CaptchaConfig;
use CaptchaX\SDK\CaptchaXClient;

$config = new CaptchaConfig('http://localhost:3000', 'your-app-id');
$client = new CaptchaXClient($config);

// 生成滑块验证码
$slider = $client->generateSliderCaptcha(300, 200);

// 验证滑块验证码
$result = $client->verifySliderCaptcha($slider->getId(), $slider->getTargetX());
```

## API 文档

### 配置类 (CaptchaConfig)

```php
$config = new CaptchaConfig(
    'http://localhost:3000',  // baseUrl
    'app-123',                // appId (可选)
    10000,                    // timeout (毫秒，默认 10000)
    3,                        // retryTimes (默认 3)
    'v1'                      // apiVersion (默认 v1)
);
```

### 客户端类 (CaptchaXClient)

#### 生成验证码

```php
// 滑块验证码
$slider = $client->generateSliderCaptcha(
    ?int $width = null,
    ?int $height = null,
    ?string $clientInfo = null,
    ?string $scenarioId = null
);

// 点击验证码
$click = $client->generateClickCaptcha(
    ?int $charCount = null,
    ?string $clientInfo = null,
    ?string $scenarioId = null
);

// 拼图验证码
$puzzle = $client->generatePuzzleCaptcha(
    ?int $width = null,
    ?int $height = null,
    ?string $clientInfo = null,
    ?string $scenarioId = null
);
```

#### 验证验证码

```php
// 验证滑块
$result = $client->verifySliderCaptcha(string $captchaId, int $targetX, ?int $targetY = null);

// 验证点击
$result = $client->verifyClickCaptcha(string $captchaId, array $clicks);

// 验证拼图
$result = $client->verifyPuzzleCaptcha(string $captchaId, int $targetX, ?int $targetY = null);
```

#### 场景管理

```php
// 列出场景
$scenarios = $client->listScenarios();

// 创建场景
$scenario = $client->createScenario(
    string $name,
    ?string $description = null,
    ?string $difficulty = null,
    ?array $config = null
);

// 获取场景
$scenario = $client->getScenario(string $scenarioId);

// 更新场景
$scenario = $client->updateScenario(string $scenarioId, array $updates);

// 删除场景
$client->deleteScenario(string $scenarioId);
```

#### Webhook 管理

```php
// 注册 Webhook
$webhook = $client->registerWebhook(
    string $appId,
    string $url,
    array $events,
    ?string $secret = null,
    ?array $headers = null
);

// 列出 Webhooks
$webhooks = $client->listWebhooks(?string $appId = null);

// 更新 Webhook
$webhook = $client->updateWebhook(string $webhookId, array $updates);

// 注销 Webhook
$client->unregisterWebhook(string $webhookId);
```

## 测试

本 SDK 使用 PHPUnit 进行全面的测试覆盖。

### 测试文件结构

```
tests/
├── CaptchaXClientTest.php      # 基础单元测试
├── CaptchaXClientMockTest.php  # Mock 测试
├── ErrorHandlingTest.php       # 错误处理测试
├── IntegrationTest.php         # 集成测试
├── ModelsTest.php              # 模型类测试
└── TypeHintingTest.php         # 类型提示测试
```

### 运行所有测试

```bash
# 运行所有测试
./vendor/bin/phpunit

# 或使用 composer 脚本
composer test
```

### 运行特定测试套件

```bash
# 仅运行单元测试
./vendor/bin/phpunit --testsuite Unit

# 仅运行集成测试
./vendor/bin/phpunit --testsuite Integration

# 运行特定测试文件
./vendor/bin/phpunit tests/ModelsTest.php

# 运行特定测试类
./vendor/bin/phpunit tests/ModelsTest.php --filter=SliderCaptchaResultTest

# 运行特定测试方法
./vendor/bin/phpunit tests/ModelsTest.php --filter=testSliderCaptchaResultCreation
```

### 测试类型详解

#### 1. 单元测试 (CaptchaXClientTest.php)

测试 SDK 的基本功能，包括：

- 客户端创建和配置
- API 版本管理
- 客户端信息生成

```bash
./vendor/bin/phpunit tests/CaptchaXClientTest.php
```

#### 2. 模型类测试 (ModelsTest.php)

测试所有数据模型的创建、属性访问和转换：

- `SliderCaptchaResult` - 滑块验证码结果
- `SliderVerifyResult` - 滑块验证结果
- `ClickCaptchaResult` - 点击验证码结果
- `ClickVerifyResult` - 点击验证结果
- `PuzzleCaptchaResult` - 拼图验证码结果
- `PuzzleVerifyResult` - 拼图验证结果
- `Scenario` - 场景模型
- `Webhook` - Webhook 模型
- `BatchVerifyItem` - 批量验证项
- `BatchVerifyResult` - 批量验证结果
- `BatchVerifySummary` - 批量验证摘要
- `BatchVerifyResponse` - 批量验证响应
- `HealthStatus` - 健康状态
- `CharPosition` - 字符位置

```bash
./vendor/bin/phpunit tests/ModelsTest.php
```

#### 3. Mock 测试 (CaptchaXClientMockTest.php)

使用模拟对象测试客户端方法，无需真实的服务器连接：

- 验证码生成测试（滑块、点击、拼图）
- 验证码验证测试
- 批量验证测试
- 场景管理测试
- Webhook 管理测试
- 健康检查测试

```bash
./vendor/bin/phpunit tests/CaptchaXClientMockTest.php
```

#### 4. 错误处理测试 (ErrorHandlingTest.php)

测试 SDK 的错误处理能力：

- AppId 缺失错误
- HTTP 4xx 错误（400, 401, 403, 404, 429）
- HTTP 5xx 错误（500, 502, 503）
- cURL 连接错误
- cURL 超时错误
- 异常详情和堆栈跟踪

```bash
./vendor/bin/phpunit tests/ErrorHandlingTest.php
```

#### 5. 类型提示测试 (TypeHintingTest.php)

验证 PHP 类型提示和类型转换：

- 配置类类型验证
- 客户端类类型验证
- 模型类类型验证
- 异常类类型验证
- 私有方法访问测试

```bash
./vendor/bin/phpunit tests/TypeHintingTest.php
```

#### 6. 集成测试 (IntegrationTest.php)

需要运行中的 CaptchaX 服务器：

- 端到端验证码流程测试
- 场景管理集成测试
- Webhook 管理集成测试
- 批量验证集成测试
- 并发请求测试

> **注意**：集成测试需要 CaptchaX 服务器在 `http://localhost:3000` 运行。如果服务器不可用，测试会自动跳过。

```bash
./vendor/bin/phpunit tests/IntegrationTest.php
```

### 测试开发指南

#### 添加新的单元测试

```php
class MyNewTest extends \PHPUnit\Framework\TestCase
{
    public function testSomething(): void
    {
        $this->assertTrue(true);
    }
}
```

#### 添加 Mock 测试

```php
public function testMyMockedFunction(): void
{
    // 创建模拟响应
    $mockResponse = [
        'code' => 200,
        'data' => ['expected' => 'value']
    ];
    
    // 使用模拟客户端
    $mockClient = $this->createClientWithMockedRequest($client, $mockResponse);
    
    // 执行测试
    $result = $mockClient->someMethod();
    
    // 断言
    $this->assertSame('expected', $result->getExpected());
}
```

#### 添加错误处理测试

```php
public function testErrorHandling(): void
{
    $this->expectException(CaptchaXException::class);
    $this->expectExceptionCode(400);
    
    // 触发错误的代码
    $client->methodThatShouldFail();
}
```

## 代码覆盖率

### 生成覆盖率报告

```bash
# 生成 HTML 覆盖率报告
./vendor/bin/phpunit --coverage-html build/coverage

# 生成 Clover XML 报告（用于 CI/CD）
./vendor/bin/phpunit --coverage-clover build/logs/clover.xml

# 生成文本覆盖率摘要
./vendor/bin/phpunit --coverage-text
```

### 覆盖率报告位置

- HTML 报告：`build/coverage/index.html`
- Clover XML：`build/logs/clover.xml`
- Cobertura XML：`build/logs/cobertura.xml`

### 覆盖率目标

| 组件 | 目标覆盖率 |
|------|-----------|
| Models.php | ≥ 90% |
| CaptchaXClient.php | ≥ 80% |
| CaptchaXException.php | ≥ 90% |
| 总体 | ≥ 80% |

### 查看覆盖率

```bash
# 使用 PHP 内置服务器查看 HTML 报告
php -S localhost:8080 -t build/coverage

# 然后在浏览器中访问 http://localhost:8080
```

## 代码质量检查

### 运行 PHPStan 静态分析

```bash
./vendor/bin/phpstan analyse src --level=5
```

### 运行代码风格检查

```bash
./vendor/bin/phpcs --standard=PSR12 src
```

### 自动修复代码风格

```bash
./vendor/bin/phpcbf --standard=PSR12 src
```

## 贡献指南

### 提交代码

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

### 测试要求

- 所有新功能必须包含测试
- 所有测试必须通过
- 覆盖率不得低于 80%
- 遵循 PSR-12 代码风格

### 运行完整检查

```bash
# 运行所有检查
composer test && composer phpstan && composer cs
```

## 常见问题

### Q: 集成测试被跳过怎么办？

A: 确保 CaptchaX 开发服务器在 `http://localhost:3000` 运行：

```bash
# 检查服务器是否可用
curl http://localhost:3000/health
```

### Q: 如何调试失败的测试？

A: 使用 `--testdox` 和 `-v` 选项：

```bash
./vendor/bin/phpunit --testdox -v tests/ErrorHandlingTest.php
```

### Q: 如何添加新的验证码类型？

A:

1. 在 `Models.php` 中添加新的结果类
2. 在 `CaptchaXClient.php` 中添加生成和验证方法
3. 添加对应的单元测试和 Mock 测试
4. 更新本 README

## 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

## 支持

- 文档：https://docs.captchax.dev
- 问题反馈：https://github.com/captchax/sdk-php/issues
- 邮箱：support@captchax.dev
