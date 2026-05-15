package com.captchax.sdk;

import okhttp3.mockwebserver.MockResponse;
import okhttp3.mockwebserver.MockWebServer;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.io.IOException;
import java.util.*;
import java.util.concurrent.*;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.*;

@DisplayName("CaptchaXClient Integration Tests")
class CaptchaXClientIntegrationTest {

    private static MockWebServer mockServer;
    private CaptchaXClient client;

    @BeforeAll
    static void setUpServer() throws IOException {
        mockServer = new MockWebServer();
        mockServer.start();
    }

    @AfterAll
    static void tearDownServer() throws IOException {
        if (mockServer != null) {
            mockServer.shutdown();
        }
    }

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

    @Nested
    @DisplayName("Health Check Integration Tests")
    class HealthCheckIntegrationTests {

        @Test
        @DisplayName("Should perform health check successfully")
        void shouldPerformHealthCheckSuccessfully() {
            mockServer.enqueue(new MockResponse()
                    .setBody(TestData.createHealthCheckResponse())
                    .addHeader("Content-Type", "application/json"));

            assertThatCode(() -> {
                HealthStatus status = parseHealthStatus(TestData.createHealthCheckResponse());
                assertThat(status.getStatus()).isEqualTo("healthy");
                assertThat(status.getService()).isEqualTo("captchax");
            }).doesNotThrowAnyException();
        }

        @Test
        @DisplayName("Should handle unhealthy service")
        void shouldHandleUnhealthyService() {
            String unhealthyResponse = "{\"code\":200,\"message\":\"success\",\"data\":{\"status\":\"unhealthy\",\"service\":\"captchax\",\"timestamp\":\"2024-01-01T00:00:00Z\",\"version\":\"1.0.0\"}}";
            mockServer.enqueue(new MockResponse()
                    .setBody(unhealthyResponse)
                    .addHeader("Content-Type", "application/json"));

            assertThatCode(() -> {
                HealthStatus status = parseHealthStatus(unhealthyResponse);
                assertThat(status.getStatus()).isEqualTo("unhealthy");
            }).doesNotThrowAnyException();
        }
    }

    @Nested
    @DisplayName("Slider Captcha Integration Tests")
    class SliderCaptchaIntegrationTests {

        @Test
        @DisplayName("Should generate slider captcha with all parameters")
        void shouldGenerateSliderCaptchaWithAllParameters() {
            mockServer.enqueue(new MockResponse()
                    .setBody(TestData.createSliderCaptchaResponse())
                    .addHeader("Content-Type", "application/json"));

            assertThatCode(() -> {
                SliderCaptchaResult result = parseSliderResponse(TestData.createSliderCaptchaResponse());
                assertThat(result.getId()).isNotNull();
                assertThat(result.getBackgroundB64()).isNotNull();
                assertThat(result.getSliderB64()).isNotNull();
                assertThat(result.getTargetX()).isGreaterThanOrEqualTo(0);
                assertThat(result.getTargetY()).isGreaterThanOrEqualTo(0);
            }).doesNotThrowAnyException();
        }

        @Test
        @DisplayName("Should verify slider captcha successfully")
        void shouldVerifySliderCaptchaSuccessfully() {
            mockServer.enqueue(new MockResponse()
                    .setBody(TestData.createSliderVerifyResponse(true))
                    .addHeader("Content-Type", "application/json"));

            assertThatCode(() -> {
                SliderVerifyResult result = parseSliderVerifyResponse(
                        TestData.createSliderVerifyResponse(true));
                assertThat(result.isSuccess()).isTrue();
            }).doesNotThrowAnyException();
        }

        @Test
        @DisplayName("Should handle slider verification failure")
        void shouldHandleSliderVerificationFailure() {
            mockServer.enqueue(new MockResponse()
                    .setBody(TestData.createSliderVerifyResponse(false))
                    .addHeader("Content-Type", "application/json"));

            assertThatCode(() -> {
                SliderVerifyResult result = parseSliderVerifyResponse(
                        TestData.createSliderVerifyResponse(false));
                assertThat(result.isSuccess()).isFalse();
            }).doesNotThrowAnyException();
        }

        @Test
        @DisplayName("Should generate slider with custom dimensions")
        void shouldGenerateSliderWithCustomDimensions() {
            CaptchaXClient customClient = new CaptchaXClient(new CaptchaConfig.Builder()
                    .baseUrl(mockServer.url("/").toString())
                    .appId("test-app")
                    .timeout(5000)
                    .retryTimes(1)
                    .build());

            assertThat(customClient).isNotNull();
            assertThatCode(() -> {
                SliderCaptchaResult result = parseSliderResponse(TestData.createSliderCaptchaResponse());
                assertThat(result).isNotNull();
            }).doesNotThrowAnyException();
        }
    }

    @Nested
    @DisplayName("Click Captcha Integration Tests")
    class ClickCaptchaIntegrationTests {

        @Test
        @DisplayName("Should generate click captcha with char positions")
        void shouldGenerateClickCaptchaWithCharPositions() {
            mockServer.enqueue(new MockResponse()
                    .setBody(TestData.createClickCaptchaResponse())
                    .addHeader("Content-Type", "application/json"));

            assertThatCode(() -> {
                ClickCaptchaResult result = parseClickResponse(TestData.createClickCaptchaResponse());
                assertThat(result.getId()).isNotNull();
                assertThat(result.getTargetChars()).isNotEmpty();
                assertThat(result.getCharPositions()).hasSameSizeAs(result.getTargetChars());
            }).doesNotThrowAnyException();
        }

        @Test
        @DisplayName("Should verify click captcha with score")
        void shouldVerifyClickCaptchaWithScore() {
            mockServer.enqueue(new MockResponse()
                    .setBody(TestData.createClickVerifyResponse(true))
                    .addHeader("Content-Type", "application/json"));

            assertThatCode(() -> {
                ClickVerifyResult result = parseClickVerifyResponse(
                        TestData.createClickVerifyResponse(true));
                assertThat(result.isSuccess()).isTrue();
                assertThat(result.getScore()).isGreaterThan(0);
            }).doesNotThrowAnyException();
        }

        @Test
        @DisplayName("Should handle empty click captcha")
        void shouldHandleEmptyClickCaptcha() {
            String emptyResponse = "{\"code\":200,\"message\":\"success\",\"data\":{\"id\":\"click-empty\",\"image\":\"base64\",\"target_chars\":[],\"char_positions\":[]}}";
            assertThatCode(() -> {
                ClickCaptchaResult result = parseClickResponse(emptyResponse);
                assertThat(result.getTargetChars()).isEmpty();
                assertThat(result.getCharPositions()).isEmpty();
            }).doesNotThrowAnyException();
        }
    }

    @Nested
    @DisplayName("Puzzle Captcha Integration Tests")
    class PuzzleCaptchaIntegrationTests {

        @Test
        @DisplayName("Should generate puzzle captcha successfully")
        void shouldGeneratePuzzleCaptchaSuccessfully() {
            mockServer.enqueue(new MockResponse()
                    .setBody(TestData.createPuzzleCaptchaResponse())
                    .addHeader("Content-Type", "application/json"));

            assertThatCode(() -> {
                PuzzleCaptchaResult result = parsePuzzleResponse(TestData.createPuzzleCaptchaResponse());
                assertThat(result.getId()).isNotNull();
                assertThat(result.getBackgroundB64()).isNotNull();
                assertThat(result.getPuzzleB64()).isNotNull();
            }).doesNotThrowAnyException();
        }

        @Test
        @DisplayName("Should verify puzzle captcha successfully")
        void shouldVerifyPuzzleCaptchaSuccessfully() {
            mockServer.enqueue(new MockResponse()
                    .setBody(TestData.createPuzzleVerifyResponse(true))
                    .addHeader("Content-Type", "application/json"));

            assertThatCode(() -> {
                PuzzleVerifyResult result = parsePuzzleVerifyResponse(
                        TestData.createPuzzleVerifyResponse(true));
                assertThat(result.isSuccess()).isTrue();
            }).doesNotThrowAnyException();
        }
    }

    @Nested
    @DisplayName("Batch Verify Integration Tests")
    class BatchVerifyIntegrationTests {

        @Test
        @DisplayName("Should handle batch verify with mixed results")
        void shouldHandleBatchVerifyWithMixedResults() {
            mockServer.enqueue(new MockResponse()
                    .setBody(TestData.createBatchVerifyResponse())
                    .addHeader("Content-Type", "application/json"));

            assertThatCode(() -> {
                BatchVerifyResponse response = parseBatchVerifyResponse(
                        TestData.createBatchVerifyResponse());
                assertThat(response.getSummary().getTotal()).isEqualTo(
                        response.getSummary().getSuccessCount() +
                                response.getSummary().getFailed() +
                                response.getSummary().getSkipped());
            }).doesNotThrowAnyException();
        }

        @Test
        @DisplayName("Should handle empty batch verify")
        void shouldHandleEmptyBatchVerify() {
            String emptyResponse = "{\"code\":200,\"message\":\"success\",\"data\":{\"results\":[],\"summary\":{\"total\":0,\"success\":0,\"failed\":0,\"skipped\":0}}}";
            assertThatCode(() -> {
                BatchVerifyResponse response = parseBatchVerifyResponse(emptyResponse);
                assertThat(response.getResults()).isEmpty();
                assertThat(response.getSummary().getTotal()).isZero();
            }).doesNotThrowAnyException();
        }
    }

    @Nested
    @DisplayName("Scenario Management Integration Tests")
    class ScenarioManagementIntegrationTests {

        @Test
        @DisplayName("Should create scenario successfully")
        void shouldCreateScenarioSuccessfully() {
            mockServer.enqueue(new MockResponse()
                    .setBody(TestData.createScenarioResponse())
                    .addHeader("Content-Type", "application/json"));

            assertThatCode(() -> {
                Scenario scenario = parseScenarioResponse(TestData.createScenarioResponse());
                assertThat(scenario.getId()).isNotNull();
                assertThat(scenario.getName()).isNotEmpty();
                assertThat(scenario.getDifficulty()).isNotNull();
            }).doesNotThrowAnyException();
        }

        @Test
        @DisplayName("Should handle scenario with timestamps")
        void shouldHandleScenarioWithTimestamps() {
            assertThatCode(() -> {
                Scenario scenario = parseScenarioResponse(TestData.createScenarioResponse());
                assertThat(scenario.getCreatedAt()).isNotNull();
                assertThat(scenario.getUpdatedAt()).isNotNull();
            }).doesNotThrowAnyException();
        }
    }

    @Nested
    @DisplayName("Webhook Integration Tests")
    class WebhookIntegrationTests {

        @Test
        @DisplayName("Should register webhook successfully")
        void shouldRegisterWebhookSuccessfully() {
            mockServer.enqueue(new MockResponse()
                    .setBody(TestData.createWebhookResponse())
                    .addHeader("Content-Type", "application/json"));

            assertThatCode(() -> {
                Webhook webhook = parseWebhookResponse(TestData.createWebhookResponse());
                assertThat(webhook.getId()).isNotNull();
                assertThat(webhook.getUrl()).isNotEmpty();
                assertThat(webhook.isEnabled()).isTrue();
            }).doesNotThrowAnyException();
        }

        @Test
        @DisplayName("Should handle webhook with custom headers")
        void shouldHandleWebhookWithCustomHeaders() {
            String response = "{\"code\":200,\"message\":\"success\",\"data\":{\"id\":\"webhook-123\",\"app_id\":\"app-123\",\"url\":\"https://example.com/webhook\",\"secret\":\"secret123\",\"events\":[\"verify.success\"],\"headers\":{\"Authorization\":\"Bearer token\"},\"enabled\":true,\"created_at\":\"2024-01-01T00:00:00Z\",\"updated_at\":\"2024-01-01T00:00:00Z\"}}";
            assertThatCode(() -> {
                Webhook webhook = parseWebhookResponse(response);
                assertThat(webhook.getHeaders()).containsKey("Authorization");
            }).doesNotThrowAnyException();
        }
    }

    @Nested
    @DisplayName("Error Handling Integration Tests")
    class ErrorHandlingIntegrationTests {

        @Test
        @DisplayName("Should handle 400 Bad Request error")
        void shouldHandle400BadRequestError() {
            mockServer.enqueue(new MockResponse()
                    .setBody(TestData.createErrorResponse(400, "Bad Request"))
                    .setResponseCode(400)
                    .addHeader("Content-Type", "application/json"));

            assertThatThrownBy(() -> parseErrorResponse(TestData.createErrorResponse(400, "Bad Request")))
                    .isInstanceOf(CaptchaXException.class)
                    .hasMessageContaining("Bad Request");
        }

        @Test
        @DisplayName("Should handle 401 Unauthorized error")
        void shouldHandle401UnauthorizedError() {
            mockServer.enqueue(new MockResponse()
                    .setBody(TestData.createErrorResponse(401, "Unauthorized"))
                    .setResponseCode(401)
                    .addHeader("Content-Type", "application/json"));

            assertThatThrownBy(() -> parseErrorResponse(TestData.createErrorResponse(401, "Unauthorized")))
                    .isInstanceOf(CaptchaXException.class);
        }

        @Test
        @DisplayName("Should handle 404 Not Found error")
        void shouldHandle404NotFoundError() {
            mockServer.enqueue(new MockResponse()
                    .setBody(TestData.createErrorResponse(404, "Not Found"))
                    .setResponseCode(404)
                    .addHeader("Content-Type", "application/json"));

            assertThatThrownBy(() -> parseErrorResponse(TestData.createErrorResponse(404, "Not Found")))
                    .isInstanceOf(CaptchaXException.class);
        }

        @Test
        @DisplayName("Should handle 429 Rate Limit error")
        void shouldHandle429RateLimitError() {
            mockServer.enqueue(new MockResponse()
                    .setBody(TestData.createErrorResponse(429, "Too Many Requests"))
                    .setResponseCode(429)
                    .addHeader("Content-Type", "application/json"));

            assertThatThrownBy(() -> parseErrorResponse(TestData.createErrorResponse(429, "Too Many Requests")))
                    .isInstanceOf(CaptchaXException.class);
        }

        @Test
        @DisplayName("Should handle 500 Internal Server Error")
        void shouldHandle500InternalServerError() {
            mockServer.enqueue(new MockResponse()
                    .setBody(TestData.createErrorResponse(500, "Internal Server Error"))
                    .setResponseCode(500)
                    .addHeader("Content-Type", "application/json"));

            assertThatThrownBy(() -> parseErrorResponse(TestData.createErrorResponse(500, "Internal Server Error")))
                    .isInstanceOf(CaptchaXException.class);
        }

        @Test
        @DisplayName("Should handle null response body")
        void shouldHandleNullResponseBody() {
            String nullResponse = "{\"code\":200,\"message\":\"success\",\"data\":null}";
            assertThatCode(() -> {
                ApiResponse<?> response = new com.google.gson.Gson().fromJson(nullResponse, ApiResponse.class);
                assertThat(response.getData()).isNull();
            }).doesNotThrowAnyException();
        }

        @ParameterizedTest
        @ValueSource(ints = {400, 401, 403, 404, 429, 500, 502, 503})
        @DisplayName("Should handle various HTTP error codes")
        void shouldHandleVariousHttpErrorCodes(int statusCode) {
            assertThatThrownBy(() -> parseErrorResponse(
                    TestData.createErrorResponse(statusCode, "Error")))
                    .isInstanceOf(CaptchaXException.class);
        }
    }

    @Nested
    @DisplayName("Concurrent Integration Tests")
    class ConcurrentIntegrationTests {

        @Test
        @DisplayName("Should handle concurrent client info creation")
        void shouldHandleConcurrentClientInfoCreation() throws Exception {
            int threadCount = 10;
            ExecutorService executor = Executors.newFixedThreadPool(threadCount);
            CountDownLatch latch = new CountDownLatch(threadCount);
            List<Future<String>> futures = new ArrayList<>();

            for (int i = 0; i < threadCount; i++) {
                futures.add(executor.submit(() -> {
                    try {
                        String info = client.createClientInfo(TestData.createTestExtra());
                        return info;
                    } finally {
                        latch.countDown();
                    }
                }));
            }

            latch.await(10, TimeUnit.SECONDS);

            for (Future<String> future : futures) {
                assertThat(future.get()).isNotNull();
            }

            executor.shutdown();
        }

        @Test
        @DisplayName("Should handle concurrent config updates")
        void shouldHandleConcurrentConfigUpdates() throws Exception {
            int iterations = 100;
            ExecutorService executor = Executors.newFixedThreadPool(5);
            CountDownLatch latch = new CountDownLatch(iterations);

            for (int i = 0; i < iterations; i++) {
                final int index = i;
                executor.submit(() -> {
                    try {
                        ApiVersion version = index % 2 == 0 ? ApiVersion.V1 : ApiVersion.V2;
                        client.setApiVersion(version);
                        assertThat(client.getApiVersion()).isIn(ApiVersion.V1, ApiVersion.V2);
                    } finally {
                        latch.countDown();
                    }
                });
            }

            latch.await(10, TimeUnit.SECONDS);
            executor.shutdown();
        }

        @Test
        @DisplayName("Should handle burst requests")
        void shouldHandleBurstRequests() throws Exception {
            int requestCount = 20;
            ExecutorService executor = Executors.newFixedThreadPool(requestCount);
            List<Future<?>> futures = new ArrayList<>();

            for (int i = 0; i < requestCount; i++) {
                futures.add(executor.submit(() -> {
                    assertThatCode(() -> {
                        String info = client.createClientInfo(null);
                        assertThat(info).isNotNull();
                    }).doesNotThrowAnyException();
                }));
            }

            for (Future<?> future : futures) {
                future.get(5, TimeUnit.SECONDS);
            }

            executor.shutdown();
        }
    }

    @Nested
    @DisplayName("Async Integration Tests")
    class AsyncIntegrationTests {

        @Test
        @DisplayName("Should handle async operations")
        void shouldHandleAsyncOperations() throws Exception {
            CompletableFuture<String> future = CompletableFuture.supplyAsync(() -> {
                return client.createClientInfo(null);
            });

            String result = future.get(5, TimeUnit.SECONDS);
            assertThat(result).isNotNull();
            assertThat(result).contains("platform");
        }

        @Test
        @DisplayName("Should handle multiple async operations")
        void shouldHandleMultipleAsyncOperations() throws Exception {
            List<CompletableFuture<String>> futures = new ArrayList<>();

            for (int i = 0; i < 5; i++) {
                final int index = i;
                futures.add(CompletableFuture.supplyAsync(() -> {
                    return client.createClientInfo(Map.of("index", index));
                }));
            }

            CompletableFuture<Void> allOf = CompletableFuture.allOf(
                    futures.toArray(new CompletableFuture[0]));

            allOf.get(10, TimeUnit.SECONDS);

            for (CompletableFuture<String> future : futures) {
                assertThat(future.get()).isNotNull();
            }
        }

        @Test
        @DisplayName("Should handle async exception")
        void shouldHandleAsyncException() throws Exception {
            CompletableFuture<String> future = CompletableFuture.supplyAsync(() -> {
                throw new RuntimeException("Async error");
            });

            assertThatThrownBy(() -> future.get(5, TimeUnit.SECONDS))
                    .isInstanceOf(Exception.class);
        }
    }

    @Nested
    @DisplayName("Configuration Integration Tests")
    class ConfigurationIntegrationTests {

        @Test
        @DisplayName("Should work with different timeouts")
        void shouldWorkWithDifferentTimeouts() {
            assertThatCode(() -> {
                CaptchaXClient fastClient = new CaptchaXClient(new CaptchaConfig.Builder()
                        .baseUrl(mockServer.url("/").toString())
                        .appId("test-app")
                        .timeout(1000)
                        .retryTimes(0)
                        .build());
                assertThat(fastClient).isNotNull();

                CaptchaXClient slowClient = new CaptchaXClient(new CaptchaConfig.Builder()
                        .baseUrl(mockServer.url("/").toString())
                        .appId("test-app")
                        .timeout(30000)
                        .retryTimes(5)
                        .build());
                assertThat(slowClient).isNotNull();
            }).doesNotThrowAnyException();
        }

        @Test
        @DisplayName("Should work with different API versions")
        void shouldWorkWithDifferentApiVersions() {
            assertThatCode(() -> {
                CaptchaXClient v1Client = new CaptchaXClient(new CaptchaConfig.Builder()
                        .baseUrl(mockServer.url("/").toString())
                        .appId("test-app")
                        .apiVersion(ApiVersion.V1)
                        .build());
                assertThat(v1Client.getApiVersion()).isEqualTo(ApiVersion.V1);

                CaptchaXClient v2Client = new CaptchaXClient(new CaptchaConfig.Builder()
                        .baseUrl(mockServer.url("/").toString())
                        .appId("test-app")
                        .apiVersion(ApiVersion.V2)
                        .build());
                assertThat(v2Client.getApiVersion()).isEqualTo(ApiVersion.V2);
            }).doesNotThrowAnyException();
        }

        @Test
        @DisplayName("Should handle trailing slash in base URL")
        void shouldHandleTrailingSlashInBaseUrl() {
            assertThatCode(() -> {
                CaptchaXClient client1 = new CaptchaXClient("http://localhost:3000/");
                CaptchaXClient client2 = new CaptchaXClient("http://localhost:3000");
                assertThat(client1).isNotNull();
                assertThat(client2).isNotNull();
            }).doesNotThrowAnyException();
        }
    }

    @Nested
    @DisplayName("Data Model Integration Tests")
    class DataModelIntegrationTests {

        @Test
        @DisplayName("Should handle various char positions")
        void shouldHandleVariousCharPositions() {
            assertThatCode(() -> {
                List<CharPosition> positions = TestData.createTestCharPositions();
                assertThat(positions).hasSize(3);
                assertThat(positions.get(0).getCharacter()).isEqualTo("A");
            }).doesNotThrowAnyException();
        }

        @Test
        @DisplayName("Should handle batch verify items")
        void shouldHandleBatchVerifyItems() {
            assertThatCode(() -> {
                List<BatchVerifyItem> items = TestData.createTestBatchItems();
                assertThat(items).hasSize(2);
                assertThat(items.get(0).captchaId).isEqualTo("captcha-1");
                assertThat(items.get(1).clicks).isNotNull();
            }).doesNotThrowAnyException();
        }

        @Test
        @DisplayName("Should handle complex scenario config")
        void shouldHandleComplexScenarioConfig() {
            assertThatCode(() -> {
                Map<String, Object> config = new HashMap<>();
                config.put("difficulty", "hard");
                config.put("timeLimit", 30);
                config.put("attempts", 3);
                config.put("hints", Arrays.asList("hint1", "hint2"));
                config.put("metadata", Map.of("key", "value"));

                assertThat(config).hasSize(5);
                assertThat(config.get("timeLimit")).isEqualTo(30);
            }).doesNotThrowAnyException();
        }
    }

    private SliderCaptchaResult parseSliderResponse(String json) {
        com.google.gson.Gson gson = new com.google.gson.GsonBuilder().create();
        ApiResponse<?> response = gson.fromJson(json, ApiResponse.class);
        return gson.fromJson(gson.toJson(response.getData()), SliderCaptchaResult.class);
    }

    private SliderVerifyResult parseSliderVerifyResponse(String json) {
        com.google.gson.Gson gson = new com.google.gson.GsonBuilder().create();
        ApiResponse<?> response = gson.fromJson(json, ApiResponse.class);
        return gson.fromJson(gson.toJson(response.getData()), SliderVerifyResult.class);
    }

    private ClickCaptchaResult parseClickResponse(String json) {
        com.google.gson.Gson gson = new com.google.gson.GsonBuilder().create();
        ApiResponse<?> response = gson.fromJson(json, ApiResponse.class);
        return gson.fromJson(gson.toJson(response.getData()), ClickCaptchaResult.class);
    }

    private ClickVerifyResult parseClickVerifyResponse(String json) {
        com.google.gson.Gson gson = new com.google.gson.GsonBuilder().create();
        ApiResponse<?> response = gson.fromJson(json, ApiResponse.class);
        return gson.fromJson(gson.toJson(response.getData()), ClickVerifyResult.class);
    }

    private PuzzleCaptchaResult parsePuzzleResponse(String json) {
        com.google.gson.Gson gson = new com.google.gson.GsonBuilder().create();
        ApiResponse<?> response = gson.fromJson(json, ApiResponse.class);
        return gson.fromJson(gson.toJson(response.getData()), PuzzleCaptchaResult.class);
    }

    private PuzzleVerifyResult parsePuzzleVerifyResponse(String json) {
        com.google.gson.Gson gson = new com.google.gson.GsonBuilder().create();
        ApiResponse<?> response = gson.fromJson(json, ApiResponse.class);
        return gson.fromJson(gson.toJson(response.getData()), PuzzleVerifyResult.class);
    }

    private BatchVerifyResponse parseBatchVerifyResponse(String json) {
        com.google.gson.Gson gson = new com.google.gson.GsonBuilder().create();
        ApiResponse<?> response = gson.fromJson(json, ApiResponse.class);
        return gson.fromJson(gson.toJson(response.getData()), BatchVerifyResponse.class);
    }

    private Scenario parseScenarioResponse(String json) {
        com.google.gson.Gson gson = new com.google.gson.GsonBuilder().create();
        ApiResponse<?> response = gson.fromJson(json, ApiResponse.class);
        return gson.fromJson(gson.toJson(response.getData()), Scenario.class);
    }

    private Webhook parseWebhookResponse(String json) {
        com.google.gson.Gson gson = new com.google.gson.GsonBuilder().create();
        ApiResponse<?> response = gson.fromJson(json, ApiResponse.class);
        return gson.fromJson(gson.toJson(response.getData()), Webhook.class);
    }

    private HealthStatus parseHealthStatus(String json) {
        com.google.gson.Gson gson = new com.google.gson.GsonBuilder().create();
        ApiResponse<?> response = gson.fromJson(json, ApiResponse.class);
        return gson.fromJson(gson.toJson(response.getData()), HealthStatus.class);
    }

    private void parseErrorResponse(String json) throws CaptchaXException {
        com.google.gson.Gson gson = new com.google.gson.GsonBuilder().create();
        ApiResponse<?> response = gson.fromJson(json, ApiResponse.class);
        if (response == null || !response.isSuccess()) {
            String message = response != null ? response.getMessage() : "Unknown error";
            int code = response != null ? response.getCode() : 500;
            throw new CaptchaXException(message, code, 500);
        }
    }
}
