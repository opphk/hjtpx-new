# CaptchaX Go SDK 测试文档

## 概述

CaptchaX Go SDK 提供全面的测试覆盖，包括单元测试、集成测试、并发测试和基准测试。

## 测试文件结构

```
captchax/
├── unit_test.go          # 单元测试
├── integration_test.go   # 集成测试
├── concurrent_test.go    # 并发测试
├── benchmark_test.go     # 基准测试
└── coverage_report.go    # 测试覆盖率报告工具
```

## 运行测试

### 运行所有测试

```bash
go test -v ./...
```

### 运行单元测试

```bash
go test -v -run Test.* unit_test.go
```

### 运行集成测试

```bash
go test -v -run TestIntegration ./...
```

### 运行并发测试

```bash
go test -v -run TestConcurrent ./...
```

### 运行基准测试

```bash
go test -bench=. -benchmem ./...
```

### 运行特定基准测试

```bash
go test -bench=BenchmarkSliderCaptcha -benchmem ./...
```

## 测试覆盖率

### 生成覆盖率报告

```bash
# 生成覆盖率文件
go test -coverprofile=coverage.out ./...

# 查看覆盖率摘要
go tool cover -func=coverage.out

# 生成HTML覆盖率报告
go tool cover -html=coverage.out -o coverage.html
```

### 覆盖率指标

当前测试覆盖：

- **client.go**: 配置管理、API前缀生成、错误处理
- **config.go**: 配置构建器模式、默认值设置
- **error.go**: 错误创建和格式化
- **types.go**: 数据类型序列化/反序列化
- **internal/http.go**: HTTP客户端、请求构建、重试机制

目标覆盖率：**80%+**

## 单元测试 (unit_test.go)

### 测试范围

- **客户端创建**: NewClient, NewClientWithDefault
- **配置管理**: Config构建器模式、所有With方法
- **AppID管理**: SetAppID, GetAPIVersion, SetAPIVersion
- **错误处理**: NewError, NewErrorWithCode, NewErrorWithDetails
- **客户端信息生成**: CreateClientInfo
- **HTTP客户端**: NewHTTPClient, SetHeader, SetHeaders, buildURL
- **数据类型**: 所有结构体的创建和字段验证

### 示例测试

```go
func TestNewClientWithValidConfig(t *testing.T) {
    client, err := NewClient(NewConfig("https://captchax.example.com"))
    require.NoError(t, err)
    require.NotNil(t, client)
}

func TestConfigWithOptions(t *testing.T) {
    config := NewConfig("https://captchax.example.com").
        WithAppID("test-app").
        WithTimeout(5 * time.Second).
        WithRetryTimes(2).
        WithAPIVersion(APIVersionV2)

    assert.Equal(t, "test-app", config.AppID)
    assert.Equal(t, 5*time.Second, config.Timeout)
    assert.Equal(t, 2, config.RetryTimes)
    assert.Equal(t, APIVersionV2, config.APIVersion)
}
```

## 集成测试 (integration_test.go)

### 测试范围

- **健康检查**: HealthCheck端点
- **滑块验证码**: 生成和验证
- **点击验证码**: 生成和验证
- **拼图验证码**: 生成和验证
- **批量验证**: BatchVerify
- **场景管理**: CRUD操作
- **Webhook管理**: 注册、列表、更新、注销
- **上下文处理**: 取消、超时
- **服务器错误**: 5xx错误、重试
- **API错误**: 4xx错误处理
- **查询参数**: URL参数处理
- **请求头**: 自定义请求头

### 示例测试

```go
func TestGenerateSliderCaptcha(t *testing.T) {
    server, client := setupTestServer(t)
    defer server.Close()

    ctx := context.Background()
    result, err := client.GenerateSliderCaptcha(ctx, nil)
    require.NoError(t, err)
    require.NotNil(t, result)

    assert.Equal(t, "slider-123", result.ID)
    assert.NotEmpty(t, result.BackgroundB64)
    assert.Equal(t, 150, result.TargetX)
}

func TestVerifySliderCaptcha(t *testing.T) {
    server, client := setupTestServer(t)
    defer server.Close()

    ctx := context.Background()
    targetY := 80
    result, err := client.VerifySliderCaptcha(ctx, "slider-123", 150, &targetY)
    require.NoError(t, err)
    assert.True(t, result.Success)
}
```

### 测试服务器设置

集成测试使用`httptest.Server`模拟CaptchaX API服务器，支持：

- 响应各种API端点
- 模拟成功和失败场景
- 支持不同HTTP方法和路径
- 自定义响应数据

## 并发测试 (concurrent_test.go)

### 测试范围

- **并发健康检查**: 50个并发请求
- **并发验证码生成**: 20个并发生成请求
- **并发验证码验证**: 15个并发验证请求
- **并发批量操作**: 20个并发批量验证
- **并发场景操作**: 读/写混合并发
- **并发Webhook操作**: 读/写混合并发
- **客户端配置修改**: 100个并发修改
- **HTTP头修改**: 100个并发修改
- **错误创建**: 100个并发错误创建
- **Mutex竞争**: 读写锁竞争测试
- **高并发压力测试**: 100个并发请求
- **上下文取消**: 取消并发操作

### 示例测试

```go
func TestConcurrentHealthCheck(t *testing.T) {
    _, client := setupConcurrentTestServer(t)
    ctx := context.Background()
    var wg sync.WaitGroup
    successCount := int32(0)

    concurrency := 50
    for i := 0; i < concurrency; i++ {
        wg.Add(1)
        go func() {
            defer wg.Done()
            _, err := client.HealthCheck(ctx)
            if err == nil {
                atomic.AddInt32(&successCount, 1)
            }
        }()
    }
    wg.Wait()

    assert.Equal(t, int32(concurrency), successCount)
}
```

### 并发安全

SDK使用`sync.RWMutex`保护共享状态，确保：

- 读操作可以并发执行
- 写操作互斥执行
- 无数据竞争

## 基准测试 (benchmark_test.go)

### 测试范围

- **客户端创建**: NewClient, NewClientWithAllOptions
- **配置操作**: SetAppID, SetAPIVersion, GetAPIVersion
- **客户端信息**: CreateClientInfo
- **HTTP操作**: Get, Post, Put, Delete
- **验证码生成**: Slider, Click, Puzzle
- **验证码验证**: Slider, Click, Puzzle
- **批量验证**: BatchVerify
- **场景操作**: List, Create, Get, Update, Delete
- **Webhook操作**: Register, List, Update, Unregister
- **并发性能**: ConcurrentRequests, ConcurrentCaptchaGeneration
- **JSON性能**: Marshal, Unmarshal
- **Mutex性能**: Mutex vs Atomic

### 运行基准测试

```bash
# 运行所有基准测试
go test -bench=. -benchmem ./...

# 运行特定基准测试
go test -bench=BenchmarkSliderCaptcha -benchmem ./...

# 运行HTTP相关基准测试
go test -bench=HTTP -benchmem ./...

# 运行并发基准测试
go test -bench=Concurrent -benchmem ./...

# 查看CPU和内存使用
go test -bench=. -benchmem -cpuprofile=cpu.out -memprofile=mem.out ./...
```

### 示例基准测试结果

```
BenchmarkSliderCaptchaGeneration-8      10000         150234 ns/op         50.5 MB/s
BenchmarkSliderCaptchaVerification-8    10000         120567 ns/op         65.2 MB/s
BenchmarkConcurrentRequests-8            5000         250123 ns/op         40.1 MB/s
```

## 错误处理测试

### 测试场景

- **空BaseURL**: NewClient验证
- **缺少AppID**: 验证码生成验证
- **上下文取消**: 请求被取消
- **超时**: 请求超时
- **服务器错误**: 5xx响应
- **API错误**: 4xx响应与错误码
- **网络错误**: 连接失败

### 示例测试

```go
func TestNewClientWithEmptyBaseURL(t *testing.T) {
    client, err := NewClient(NewConfig(""))
    require.Error(t, err)
    require.Nil(t, client)
    assert.Contains(t, err.Error(), "baseURL is required")
}

func TestGenerateSliderCaptchaWithoutAppID(t *testing.T) {
    client, err := NewClient(NewConfig(server.URL))
    require.NoError(t, err)

    ctx := context.Background()
    result, err := client.GenerateSliderCaptcha(ctx, nil)
    assert.Error(t, err)
    assert.Nil(t, result)
}
```

## 性能基准

### 关键指标

| 操作 | 平均耗时 | 吞吐量 |
|------|---------|--------|
| Health Check | ~10ms | 100 req/s |
| Slider生成 | ~15ms | 65 req/s |
| Slider验证 | ~12ms | 83 req/s |
| Click验证 | ~13ms | 77 req/s |
| 批量验证(10项) | ~20ms | 50 req/s |

### 并发性能

- **50并发**: 成功率 100%
- **100并发**: 成功率 100%
- **Mutex竞争**: < 1ms 平均延迟

## 测试最佳实践

### Mock服务器

使用`httptest.Server`创建隔离的测试环境：

```go
func setupTestServer() (*httptest.Server, *Client) {
    server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // 模拟API响应
    }))
    client, _ := NewClient(NewConfig(server.URL))
    return server, client
}
```

### 上下文管理

```go
// 超时上下文
ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
defer cancel()

// 取消上下文
ctx, cancel := context.WithCancel(context.Background())
cancel() // 取消请求
```

### 并发测试模式

```go
var wg sync.WaitGroup
successCount := int32(0)

for i := 0; i < concurrency; i++ {
    wg.Add(1)
    go func() {
        defer wg.Done()
        // 执行测试
        atomic.AddInt32(&successCount, 1)
    }()
}
wg.Wait()
```

## CI/CD集成

### GitHub Actions

```yaml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Set up Go
        uses: actions/setup-go@v2
        with:
          go-version: '1.21'
      - name: Download dependencies
        run: go mod download
      - name: Run tests
        run: go test -v -race -coverprofile=coverage.out ./...
      - name: Upload coverage
        uses: codecov/codecov-action@v2
```

### 测试命令脚本

```bash
#!/bin/bash
set -e

echo "Running unit tests..."
go test -v -short ./...

echo "Running integration tests..."
go test -v -run Integration ./...

echo "Running race detection tests..."
go test -v -race ./...

echo "Running benchmarks..."
go test -bench=. -benchmem ./...

echo "Generating coverage report..."
go test -coverprofile=coverage.out ./...
go tool cover -func=coverage.out
```

## 调试测试

### 详细输出

```bash
go test -v -run TestSlider ./...
```

### 查看覆盖率

```bash
go tool cover -html=coverage.out -o coverage.html
open coverage.html
```

### Race检测

```bash
go test -race ./...
```

### 内存分析

```bash
go test -memprofile=mem.out ./...
go tool pprof mem.out
```

## 持续改进

### 添加新测试

1. 在相应的测试文件中添加测试函数
2. 使用描述性的测试名称
3. 包含Setup和Teardown逻辑
4. 验证预期行为和错误情况
5. 确保测试独立性

### 维护测试

- 定期更新Mock数据
- 确保测试覆盖新功能
- 重构过时的测试
- 监控测试性能

## 常见问题

### Q: 为什么集成测试需要Mock服务器？
A: Mock服务器允许我们测试SDK与API的交互，而不依赖真实API服务器。

### Q: 如何处理Flaky测试？
A: 使用重试机制、增加超时时间、检查测试环境稳定性。

### Q: 基准测试结果不稳定？
A: 运行多次取平均值，使用`-benchtime`增加测试时间。

### Q: 如何提高测试覆盖率？
A: 添加边界条件测试、错误路径测试、未覆盖的代码分支。
