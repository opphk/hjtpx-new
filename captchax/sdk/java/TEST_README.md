# CaptchaX Java SDK 测试文档

## 目录

- [概述](#概述)
- [测试结构](#测试结构)
- [测试类型](#测试类型)
- [运行测试](#运行测试)
- [测试覆盖率](#测试覆盖率)
- [测试配置](#测试配置)
- [Mock 测试](#mock-测试)
- [集成测试](#集成测试)
- [并发测试](#并发测试)
- [异步测试](#异步测试)
- [最佳实践](#最佳实践)

## 概述

本文档描述了 CaptchaX Java SDK 的测试策略和实现细节。SDK 使用 JUnit 5、Mockito、AssertJ 和 JaCoCo 进行全面的单元测试、集成测试和覆盖率分析。

## 测试结构

```
src/test/java/com/captchax/sdk/
├── CaptchaXClientUnitTest.java       # 单元测试
├── CaptchaXClientMockTest.java       # Mock 测试
├── CaptchaXClientIntegrationTest.java # 集成测试
└── TestData.java                     # 测试数据
```

## 测试类型

### 1. 单元测试 (CaptchaXClientUnitTest)

- **构造函数测试**: 验证各种构造函数的边界条件
- **配置测试**: 验证配置构建器和 setter 方法
- **客户端信息测试**: 验证 createClientInfo 方法
- **错误处理测试**: 验证异常处理逻辑
- **模型测试**: 验证数据模型的正确性

### 2. Mock 测试 (CaptchaXClientMockTest)

- **滑块验证码测试**: 模拟滑块验证码生成和验证
- **点选验证码测试**: 模拟点选验证码操作
- **拼图验证码测试**: 模拟拼图验证码操作
- **批量验证测试**: 模拟批量验证场景
- **场景管理测试**: 模拟场景 CRUD 操作
- **Webhook 测试**: 模拟 Webhook 注册和管理
- **健康检查测试**: 模拟健康检查端点
- **错误响应测试**: 模拟各种 HTTP 错误响应

### 3. 集成测试 (CaptchaXClientIntegrationTest)

- **健康检查集成测试**: 测试与真实 MockWebServer 的交互
- **滑块验证码集成测试**: 端到端滑块验证码流程
- **点选验证码集成测试**: 端到端点选验证码流程
- **拼图验证码集成测试**: 端到端拼图验证码流程
- **批量验证集成测试**: 批量验证功能测试
- **场景管理集成测试**: 场景管理 API 测试
- **Webhook 集成测试**: Webhook 生命周期测试
- **错误处理集成测试**: 各种 HTTP 错误码处理
- **并发集成测试**: 多线程场景测试
- **异步集成测试**: 异步操作测试

## 运行测试

### 运行所有测试

```bash
mvn test
```

### 运行特定测试类

```bash
mvn test -Dtest=CaptchaXClientUnitTest
mvn test -Dtest=CaptchaXClientMockTest
mvn test -Dtest=CaptchaXClientIntegrationTest
```

### 运行特定测试方法

```bash
mvn test -Dtest=CaptchaXClientUnitTest#shouldCreateClientWithValidConfig
```

### 跳过测试

```bash
mvn clean package -DskipTests
```

### 运行测试覆盖率报告

```bash
mvn test jacoco:report
```

测试覆盖率报告将生成在 `target/site/jacoco/index.html`

## 测试覆盖率

### 目标覆盖率

- **行覆盖率**: 80%+
- **分支覆盖率**: 60%+

### JaCoCo 配置

JaCoCo 集成在 Maven 构建流程中：

```xml
<plugin>
    <groupId>org.jacoco</groupId>
    <artifactId>jacoco-maven-plugin</artifactId>
    <version>0.8.11</version>
    <executions>
        <execution>
            <id>prepare-agent</id>
            <goals>
                <goal>prepare-agent</goal>
            </goals>
        </execution>
        <execution>
            <id>report</id>
            <phase>test</phase>
            <goals>
                <goal>report</goal>
            </goals>
        </execution>
        <execution>
            <id>check</id>
            <goals>
                <goal>check</goal>
            </goals>
            <configuration>
                <rules>
                    <rule>
                        <element>BUNDLE</element>
                        <limits>
                            <limit>
                                <counter>LINE</counter>
                                <value>COVEREDRATIO</value>
                                <minimum>0.80</minimum>
                            </limit>
                            <limit>
                                <counter>BRANCH</counter>
                                <value>COVEREDRATIO</value>
                                <minimum>0.60</minimum>
                            </limit>
                        </limits>
                    </rule>
                </rules>
            </configuration>
        </execution>
    </executions>
</plugin>
```

## 测试配置

### Maven 依赖

- **JUnit 5 (junit-jupiter)**: 测试框架
- **Mockito**: Mock 对象框架
- **AssertJ**: 流畅断言库
- **JaCoCo**: 代码覆盖率工具
- **MockWebServer**: HTTP Mock 服务器

### 测试配置类

使用 `TestData` 类提供测试数据和常量：

```java
public static final String TEST_BASE_URL = "http://localhost:3000";
public static final String TEST_APP_ID = "test-app-id";
public static final int TEST_TIMEOUT = 5000;
public static final int TEST_RETRY_TIMES = 2;
```

## Mock 测试

### 使用 Mockito

```java
@ExtendWith(MockitoExtension.class)
class CaptchaXClientMockTest {

    @Mock
    private OkHttpClient mockHttpClient;

    @Mock
    private Call mockCall;

    @Test
    void shouldVerifySliderCaptcha() {
        when(mockResponse.isSuccessful()).thenReturn(true);
        when(mockResponse.body()).thenReturn(mockResponseBody);
        when(mockResponseBody.string()).thenReturn(TestData.createSliderVerifyResponse(true));

        // 测试逻辑
    }
}
```

### 验证调用次数

```java
verify(mockHttpClient, times(1)).newCall(any());
verify(mockHttpClient, never()).newCall(any());
verify(mockHttpClient, atLeastOnce()).newCall(any());
```

### 参数捕获

```java
ArgumentCaptor<Request> requestCaptor = ArgumentCaptor.forClass(Request.class);
verify(mockHttpClient).newCall(requestCaptor.capture());
Request capturedRequest = requestCaptor.getValue();
```

## 集成测试

### 使用 MockWebServer

```java
class CaptchaXClientIntegrationTest {

    private static MockWebServer mockServer;
    private CaptchaXClient client;

    @BeforeEach
    void setUp() {
        String baseUrl = mockServer.url("/").toString();
        client = new CaptchaXClient(new CaptchaConfig.Builder()
                .baseUrl(baseUrl)
                .appId("test-app")
                .timeout(5000)
                .retryTimes(1)
                .build());
    }

    @Test
    void shouldPerformHealthCheck() {
        mockServer.enqueue(new MockResponse()
                .setBody(TestData.createHealthCheckResponse())
                .addHeader("Content-Type", "application/json"));

        HealthStatus status = client.healthCheck();
        assertThat(status.getStatus()).isEqualTo("healthy");
    }
}
```

### 模拟错误响应

```java
mockServer.enqueue(new MockResponse()
        .setBody(TestData.createErrorResponse(400, "Bad Request"))
        .setResponseCode(400)
        .addHeader("Content-Type", "application/json"));

assertThatThrownBy(() -> client.healthCheck())
        .isInstanceOf(CaptchaXException.class);
```

## 并发测试

### 多线程执行器

```java
@Test
void shouldHandleConcurrentClientInfoCreation() throws Exception {
    int threadCount = 10;
    ExecutorService executor = Executors.newFixedThreadPool(threadCount);
    CountDownLatch latch = new CountDownLatch(threadCount);
    List<Future<String>> futures = new ArrayList<>();

    for (int i = 0; i < threadCount; i++) {
        futures.add(executor.submit(() -> {
            String info = client.createClientInfo(TestData.createTestExtra());
            latch.countDown();
            return info;
        }));
    }

    latch.await(10, TimeUnit.SECONDS);

    for (Future<String> future : futures) {
        assertThat(future.get()).isNotNull();
    }

    executor.shutdown();
}
```

### 突发请求测试

```java
@Test
void shouldHandleBurstRequests() throws Exception {
    int requestCount = 20;
    ExecutorService executor = Executors.newFixedThreadPool(requestCount);
    List<Future<?>> futures = new ArrayList<>();

    for (int i = 0; i < requestCount; i++) {
        futures.add(executor.submit(() -> {
            String info = client.createClientInfo(null);
            assertThat(info).isNotNull();
        }));
    }

    for (Future<?> future : futures) {
        future.get(5, TimeUnit.SECONDS);
    }

    executor.shutdown();
}
```

## 异步测试

### CompletableFuture 测试

```java
@Test
void shouldHandleAsyncOperations() throws Exception {
    CompletableFuture<String> future = CompletableFuture.supplyAsync(() -> {
        return client.createClientInfo(null);
    });

    String result = future.get(5, TimeUnit.SECONDS);
    assertThat(result).isNotNull();
    assertThat(result).contains("platform");
}
```

### 多个异步操作

```java
@Test
void shouldHandleMultipleAsyncOperations() throws Exception {
    List<CompletableFuture<String>> futures = new ArrayList<>();

    for (int i = 0; i < 5; i++) {
        futures.add(CompletableFuture.supplyAsync(() -> {
            return client.createClientInfo(Map.of("index", i));
        }));
    }

    CompletableFuture.allOf(futures.toArray(new CompletableFuture[0]))
            .get(10, TimeUnit.SECONDS);

    for (CompletableFuture<String> future : futures) {
        assertThat(future.get()).isNotNull();
    }
}
```

## 最佳实践

### 1. 命名约定

- 测试类名以 `Test` 结尾
- 测试方法名使用 `should` 前缀描述预期行为
- 使用 `@DisplayName` 提供人类可读的测试描述

```java
@Test
@DisplayName("Should throw IllegalArgumentException when baseUrl is null")
void shouldThrowWhenBaseUrlIsNull() {
    // test code
}
```

### 2. 断言使用

优先使用 AssertJ 的流畅断言：

```java
assertThat(result.getId()).isEqualTo("slider-123");
assertThat(result.getBackgroundB64()).isNotNull();
assertThat(response.getSummary().getTotal()).isGreaterThan(0);
```

### 3. 测试隔离

- 每个测试应该独立运行
- 使用 `@BeforeEach` 和 `@AfterEach` 管理测试资源
- MockWebServer 在 `@BeforeAll` 和 `@AfterAll` 中管理

### 4. 参数化测试

使用参数化测试覆盖多种输入：

```java
@ParameterizedTest
@CsvSource({
    "V1, v1",
    "V2, v2"
})
@DisplayName("Should return correct API version value")
void shouldReturnCorrectApiVersionValue(ApiVersion version, String expected) {
    assertThat(version.getValue()).isEqualTo(expected);
}
```

### 5. 异常测试

测试异常抛出：

```java
assertThatThrownBy(() -> new CaptchaXClient((String) null))
    .isInstanceOf(IllegalArgumentException.class)
    .hasMessageContaining("baseUrl");
```

### 6. 测试数据管理

使用 `TestData` 类集中管理测试数据：

```java
public static CaptchaConfig createTestConfig() {
    return new CaptchaConfig.Builder()
            .baseUrl(TEST_BASE_URL)
            .appId(TEST_APP_ID)
            .timeout(TEST_TIMEOUT)
            .retryTimes(TEST_RETRY_TIMES)
            .apiVersion(ApiVersion.V1)
            .build();
}
```

## 测试覆盖范围

### 已覆盖功能

✅ 构造函数和配置
✅ 滑块验证码生成和验证
✅ 点选验证码生成和验证
✅ 拼图验证码生成和验证
✅ 批量验证
✅ 场景管理 (CRUD)
✅ Webhook 管理 (CRUD)
✅ 健康检查
✅ 错误处理
✅ 并发操作
✅ 异步操作
✅ 各种 HTTP 错误码处理

### 测试环境

- **开发环境**: http://localhost:3000
- **生产环境**: https://captchax.example.com

## 常见问题

### Q: 如何查看测试覆盖率报告？

运行 `mvn test jacoco:report`，然后打开 `target/site/jacoco/index.html`

### Q: 如何只运行单元测试？

```bash
mvn test -Dtest=CaptchaXClientUnitTest
```

### Q: 如何调试失败的测试？

使用 `-DforkCount=0` 禁用测试 fork：

```bash
mvn test -Dtest=TestClass#testMethod -DforkCount=0
```

### Q: 如何添加新的测试用例？

1. 在 `TestData.java` 中添加测试数据
2. 在相应的测试类中添加测试方法
3. 使用 `@Nested` 组织相关测试
4. 确保测试符合最佳实践

## 参考资料

- [JUnit 5 文档](https://junit.org/junit5/docs/current/user-guide/)
- [Mockito 文档](https://site.mockito.org/)
- [AssertJ 文档](https://assertj.github.io/doc/)
- [JaCoCo 文档](https://www.eclemma.org/jacoco/trunk/doc/)
- [MockWebServer 文档](https://github.com/square/okhttp/tree/master/mockwebserver)
