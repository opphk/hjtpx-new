# CaptchaX .NET SDK 测试文档

本文档详细说明了 CaptchaX .NET SDK 的测试策略、测试类型和运行方法。

## 测试类型

### 1. 单元测试 (Unit Tests)

单元测试位于 `CaptchaXClientTests.cs` 文件中，使用 xUnit 框架编写。

**覆盖范围:**
- 验证码获取测试 (滑块、点击、拼图)
- 验证码验证测试
- 场景管理测试 (创建、获取、更新、删除)
- Webhook 管理测试
- 构造函数和配置测试

**示例:**
```csharp
[Fact]
public async Task HealthCheckAsync_ReturnsHealthStatus()
{
    var client = CreateClient();
    var result = await client.HealthCheckAsync();

    Assert.NotNull(result);
    Assert.Equal("healthy", result.Status);
}
```

### 2. 错误处理测试 (Error Handling Tests)

错误处理测试位于 `CaptchaXClientErrorHandlingTests.cs` 文件中。

**覆盖范围:**
- HTTP 错误处理 (400, 401, 403, 404, 429, 500, 503)
- 网络异常处理 (HttpRequestException, TaskCanceledException)
- 空响应和 null 数据处理
- 边界条件测试
- 模型类测试 (CharPosition, CaptchaConfig, CaptchaXException)

**示例:**
```csharp
[Fact]
public async Task HealthCheckAsync_WithHttpError_ThrowsCaptchaXException()
{
    SetupMockResponse(jsonResponse, HttpStatusCode.InternalServerError);

    var client = CreateClient();

    var exception = await Assert.ThrowsAsync<CaptchaXException>(
        () => client.HealthCheckAsync());

    exception.Message.Should().Contain("500");
}
```

### 3. 重试机制测试 (Retry Tests)

重试机制测试位于 `CaptchaXClientRetryTests.cs` 文件中，使用 Moq 框架模拟 HTTP 响应。

**覆盖范围:**
- 瞬时故障重试测试
- 指数退避算法测试
- 最大重试次数测试
- 非重试异常测试
- 零重试次数测试
- 各种验证码类型的重试测试

**示例:**
```csharp
[Fact]
public async Task HealthCheckAsync_WithTransientFailure_RetriesAndSucceeds()
{
    var callCount = 0;

    _mockHandler
        .Protected()
        .Setup<Task<HttpResponseMessage>>(
            "SendAsync",
            ItExpr.IsAny<HttpRequestMessage>(),
            ItExpr.IsAny<CancellationToken>())
        .ReturnsAsync(() =>
        {
            callCount++;
            if (callCount < 2)
            {
                throw new HttpRequestException("Temporary failure");
            }
            return CreateSuccessfulResponse();
        });

    var client = CreateClient();
    var result = await client.HealthCheckAsync();

    callCount.Should().BeGreaterOrEqualTo(2);
    result.Status.Should().Be("healthy");
}
```

### 4. 集成测试 (Integration Tests)

集成测试位于 `CaptchaX.SDK.IntegrationTests` 项目中，需要运行中的 CaptchaX 服务器。

**测试配置:**
通过环境变量配置:
- `CAPTCHAX_BASE_URL`: 服务器地址 (默认: http://localhost:3000)
- `CAPTCHAX_APP_ID`: 应用 ID (默认: test-app-id)

**覆盖范围:**
- 端到端滑块验证码流程
- 端到端点击验证码流程
- 端到端拼图验证码流程
- 场景管理完整流程
- Webhook 管理完整流程
- API V2 版本测试
- 超时和认证测试

**示例:**
```csharp
[Fact(Skip = "Requires running CaptchaX server")]
public async Task CaptchaFlow_EndToEndSliderVerification_Succeeds()
{
    using var client = new CaptchaXClient(CreateConfig());

    var captcha = await client.GenerateSliderCaptchaAsync();
    var verifyResult = await client.VerifySliderCaptchaAsync(
        captcha.Id, captcha.TargetX);

    verifyResult.Success.Should().BeTrue();
}
```

### 5. 性能基准测试 (Performance Benchmarks)

性能基准测试位于 `CaptchaXClientBenchmarks.cs` 文件中，使用 BenchmarkDotNet 框架。

**基准测试项目:**
- HealthCheckBenchmark: 健康检查性能
- GenerateSliderCaptchaBenchmark: 滑块验证码生成性能
- VerifySliderCaptchaBenchmark: 滑块验证码验证性能
- GenerateClickCaptchaBenchmark: 点击验证码生成性能
- VerifyClickCaptchaBenchmark: 点击验证码验证性能
- GeneratePuzzleCaptchaBenchmark: 拼图验证码生成性能
- VerifyPuzzleCaptchaBenchmark: 拼图验证码验证性能
- BatchVerifyBenchmark: 批量验证性能
- ListScenariosBenchmark: 场景列表查询性能
- CreateScenarioBenchmark: 场景创建性能
- GetScenarioBenchmark: 场景获取性能
- UpdateScenarioBenchmark: 场景更新性能
- ListWebhooksBenchmark: Webhook 列表查询性能
- CreateWebhookBenchmark: Webhook 创建性能
- GetWebhookBenchmark: Webhook 获取性能
- UpdateWebhookBenchmark: Webhook 更新性能

**并发基准测试:**
- ConcurrentSliderCaptchaGeneration_10Parallel: 10 并发验证码生成
- ConcurrentSliderCaptchaGeneration_50Parallel: 50 并发验证码生成
- SequentialCaptchaGeneration_10Iterations: 10 次顺序验证码生成
- SequentialCaptchaGeneration_100Iterations: 100 次顺序验证码生成

## 运行测试

### 运行所有单元测试

```bash
cd src/CaptchaX.SDK.Tests
dotnet test
```

### 运行特定测试类

```bash
# 只运行错误处理测试
dotnet test --filter "FullyQualifiedName~ErrorHandling"

# 只运行重试测试
dotnet test --filter "FullyQualifiedName~Retry"

# 只运行单元测试
dotnet test --filter "FullyQualifiedName~Tests"
```

### 运行集成测试

```bash
# 首先设置环境变量
export CAPTCHAX_BASE_URL=http://localhost:3000
export CAPTCHAX_APP_ID=your-app-id

# 运行集成测试
cd src/CaptchaX.SDK.IntegrationTests
dotnet test
```

### 运行性能基准测试

```bash
cd src/CaptchaX.SDK.Tests
dotnet run --configuration Release --project .
```

或者直接运行基准测试项目:

```bash
cd src/CaptchaX.SDK.Tests
dotnet run --configuration Release
```

## 测试覆盖率目标

- 单元测试覆盖率: 80%+
- 关键路径覆盖率: 100%
- 错误处理覆盖率: 90%+

## 测试框架版本

- xUnit: 2.6.2
- Moq: 4.20.70
- FluentAssertions: 6.12.0
- BenchmarkDotNet: (包含在项目中)
- Microsoft.NET.Test.Sdk: 17.8.0

## 测试最佳实践

1. **使用 Moq 进行依赖隔离**: 使用 Moq 模拟 HttpMessageHandler，避免实际 HTTP 请求
2. **使用 FluentAssertions**: 使用流畅的断言 API 提高测试可读性
3. **测试边界条件**: 覆盖空值、零值、负数和最大值等边界条件
4. **测试错误处理**: 确保所有异常情况都被正确处理
5. **测试并发场景**: 验证 SDK 在多线程环境下的正确性
6. **性能基准测试**: 使用 BenchmarkDotNet 监控性能变化

## 持续集成

测试在以下情况下自动运行:
- 每次代码提交 (Pull Request)
- 每次推送到主分支
- 每日凌晨构建

## 故障排除

### 集成测试失败

1. 确保 CaptchaX 服务器正在运行
2. 检查环境变量配置是否正确
3. 验证网络连接和防火墙设置
4. 检查服务器日志以获取详细错误信息

### 基准测试性能下降

1. 确保在 Release 模式下运行基准测试
2. 关闭其他占用资源的程序
3. 多次运行取平均值
4. 检查是否有代码变更影响性能

## 相关文档

- [CaptchaX SDK 主文档](../README.md)
- [API 参考文档](../docs/api-reference.md)
- [使用示例](../examples/README.md)
