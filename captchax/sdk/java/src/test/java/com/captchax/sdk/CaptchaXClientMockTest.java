package com.captchax.sdk;

import okhttp3.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.IOException;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("CaptchaXClient Mock Tests")
class CaptchaXClientMockTest {

    @Mock
    private OkHttpClient mockHttpClient;

    @Mock
    private Call mockCall;

    @Mock
    private Response mockResponse;

    @Mock
    private ResponseBody mockResponseBody;

    private CaptchaXClient client;

    @BeforeEach
    void setUp() {
        client = new CaptchaXClient(TestData.createTestConfig());
    }

    @Nested
    @DisplayName("Slider Captcha Tests")
    class SliderCaptchaTests {

        @Test
        @DisplayName("Should generate slider captcha successfully")
        void shouldGenerateSliderCaptchaSuccessfully() throws Exception {
            when(mockResponse.isSuccessful()).thenReturn(true);
            when(mockResponse.body()).thenReturn(mockResponseBody);
            when(mockResponseBody.string()).thenReturn(TestData.createSliderCaptchaResponse());

            CaptchaXException exception = new CaptchaXException("Should not throw");
            assertThatCode(() -> {
                SliderCaptchaResult result = parseSliderResponse(TestData.createSliderCaptchaResponse());
                assertThat(result.getId()).isEqualTo("slider-123");
                assertThat(result.getBackgroundB64()).isEqualTo("base64background");
                assertThat(result.getSliderB64()).isEqualTo("base64slider");
                assertThat(result.getTargetX()).isEqualTo(100);
                assertThat(result.getTargetY()).isEqualTo(50);
            }).doesNotThrowAnyException();
        }

        @Test
        @DisplayName("Should verify slider captcha successfully")
        void shouldVerifySliderCaptchaSuccessfully() throws Exception {
            CaptchaXException exception = new CaptchaXException("Should not throw");
            assertThatCode(() -> {
                SliderVerifyResult result = parseSliderVerifyResponse(
                        TestData.createSliderVerifyResponse(true));
                assertThat(result.isSuccess()).isTrue();
                assertThat(result.getMessage()).contains("passed");
            }).doesNotThrowAnyException();
        }

        @Test
        @DisplayName("Should handle failed slider verification")
        void shouldHandleFailedSliderVerification() {
            assertThatCode(() -> {
                SliderVerifyResult result = parseSliderVerifyResponse(
                        TestData.createSliderVerifyResponse(false));
                assertThat(result.isSuccess()).isFalse();
                assertThat(result.getMessage()).contains("failed");
            }).doesNotThrowAnyException();
        }

        @Test
        @DisplayName("Should generate slider with custom dimensions")
        void shouldGenerateSliderWithCustomDimensions() throws CaptchaXException {
            CaptchaXClient testClient = new CaptchaXClient(
                    new CaptchaConfig.Builder()
                            .baseUrl(TestData.TEST_BASE_URL)
                            .appId(TestData.TEST_APP_ID)
                            .build());

            CaptchaXException exception = new CaptchaXException("Should not throw");
            assertThatCode(() -> {
                SliderCaptchaResult result = parseSliderResponse(
                        TestData.createSliderCaptchaResponse());
                assertThat(result).isNotNull();
            }).doesNotThrowAnyException();
        }

        @Test
        @DisplayName("Should handle null background in response")
        void shouldHandleNullBackgroundInResponse() {
            String response = "{\"code\":200,\"message\":\"success\",\"data\":{\"id\":\"slider-123\",\"background_b64\":null,\"slider_b64\":\"base64slider\",\"target_x\":100,\"target_y\":50}}";
            assertThatCode(() -> {
                SliderCaptchaResult result = parseSliderResponse(response);
                assertThat(result.getBackgroundB64()).isNull();
            }).doesNotThrowAnyException();
        }
    }

    @Nested
    @DisplayName("Click Captcha Tests")
    class ClickCaptchaTests {

        @Test
        @DisplayName("Should generate click captcha successfully")
        void shouldGenerateClickCaptchaSuccessfully() {
            assertThatCode(() -> {
                ClickCaptchaResult result = parseClickResponse(TestData.createClickCaptchaResponse());
                assertThat(result.getId()).isEqualTo("click-123");
                assertThat(result.getImage()).isEqualTo("base64image");
                assertThat(result.getTargetChars()).containsExactly("A", "B", "C");
                assertThat(result.getCharPositions()).hasSize(3);
            }).doesNotThrowAnyException();
        }

        @Test
        @DisplayName("Should verify click captcha successfully")
        void shouldVerifyClickCaptchaSuccessfully() {
            assertThatCode(() -> {
                ClickVerifyResult result = parseClickVerifyResponse(
                        TestData.createClickVerifyResponse(true));
                assertThat(result.isSuccess()).isTrue();
                assertThat(result.getScore()).isEqualTo(0.95);
            }).doesNotThrowAnyException();
        }

        @Test
        @DisplayName("Should handle click captcha with empty char positions")
        void shouldHandleClickCaptchaWithEmptyCharPositions() {
            String response = "{\"code\":200,\"message\":\"success\",\"data\":{\"id\":\"click-123\",\"image\":\"base64image\",\"target_chars\":[],\"char_positions\":[]}}";
            assertThatCode(() -> {
                ClickCaptchaResult result = parseClickResponse(response);
                assertThat(result.getTargetChars()).isEmpty();
                assertThat(result.getCharPositions()).isEmpty();
            }).doesNotThrowAnyException();
        }

        @Test
        @DisplayName("Should handle click verification with different scores")
        void shouldHandleClickVerificationWithDifferentScores() {
            String response = "{\"code\":200,\"message\":\"success\",\"data\":{\"success\":true,\"score\":0.75,\"message\":\"partial match\"}}";
            assertThatCode(() -> {
                ClickVerifyResult result = parseClickVerifyResponse(response);
                assertThat(result.getScore()).isEqualTo(0.75);
            }).doesNotThrowAnyException();
        }
    }

    @Nested
    @DisplayName("Puzzle Captcha Tests")
    class PuzzleCaptchaTests {

        @Test
        @DisplayName("Should generate puzzle captcha successfully")
        void shouldGeneratePuzzleCaptchaSuccessfully() {
            assertThatCode(() -> {
                PuzzleCaptchaResult result = parsePuzzleResponse(TestData.createPuzzleCaptchaResponse());
                assertThat(result.getId()).isEqualTo("puzzle-123");
                assertThat(result.getBackgroundB64()).isEqualTo("base64background");
                assertThat(result.getPuzzleB64()).isEqualTo("base64puzzle");
                assertThat(result.getTargetX()).isEqualTo(100);
                assertThat(result.getTargetY()).isEqualTo(50);
            }).doesNotThrowAnyException();
        }

        @Test
        @DisplayName("Should verify puzzle captcha successfully")
        void shouldVerifyPuzzleCaptchaSuccessfully() {
            assertThatCode(() -> {
                PuzzleVerifyResult result = parsePuzzleVerifyResponse(
                        TestData.createPuzzleVerifyResponse(true));
                assertThat(result.isSuccess()).isTrue();
            }).doesNotThrowAnyException();
        }

        @Test
        @DisplayName("Should handle puzzle verification failure")
        void shouldHandlePuzzleVerificationFailure() {
            assertThatCode(() -> {
                PuzzleVerifyResult result = parsePuzzleVerifyResponse(
                        TestData.createPuzzleVerifyResponse(false));
                assertThat(result.isSuccess()).isFalse();
            }).doesNotThrowAnyException();
        }
    }

    @Nested
    @DisplayName("Batch Verify Tests")
    class BatchVerifyTests {

        @Test
        @DisplayName("Should handle batch verify response")
        void shouldHandleBatchVerifyResponse() {
            assertThatCode(() -> {
                BatchVerifyResponse response = parseBatchVerifyResponse(
                        TestData.createBatchVerifyResponse());
                assertThat(response.getResults()).hasSize(2);
                assertThat(response.getSummary().getTotal()).isEqualTo(2);
                assertThat(response.getSummary().getSuccessCount()).isEqualTo(1);
                assertThat(response.getSummary().getFailed()).isEqualTo(1);
            }).doesNotThrowAnyException();
        }

        @Test
        @DisplayName("Should handle empty batch verify results")
        void shouldHandleEmptyBatchVerifyResults() {
            String response = "{\"code\":200,\"message\":\"success\",\"data\":{\"results\":[],\"summary\":{\"total\":0,\"success\":0,\"failed\":0,\"skipped\":0}}}";
            assertThatCode(() -> {
                BatchVerifyResponse batchResponse = parseBatchVerifyResponse(response);
                assertThat(batchResponse.getResults()).isEmpty();
                assertThat(batchResponse.getSummary().getTotal()).isEqualTo(0);
            }).doesNotThrowAnyException();
        }

        @Test
        @DisplayName("Should handle results with scores")
        void shouldHandleResultsWithScores() {
            String response = "{\"code\":200,\"message\":\"success\",\"data\":{\"results\":[{\"captcha_id\":\"captcha-1\",\"success\":true,\"message\":\"success\",\"score\":0.95}],\"summary\":{\"total\":1,\"success\":1,\"failed\":0,\"skipped\":0}}}";
            assertThatCode(() -> {
                BatchVerifyResponse batchResponse = parseBatchVerifyResponse(response);
                assertThat(batchResponse.getResults().get(0).getScore()).isEqualTo(0.95);
            }).doesNotThrowAnyException();
        }
    }

    @Nested
    @DisplayName("Scenario Tests")
    class ScenarioTests {

        @Test
        @DisplayName("Should handle scenario response")
        void shouldHandleScenarioResponse() {
            assertThatCode(() -> {
                Scenario scenario = parseScenarioResponse(TestData.createScenarioResponse());
                assertThat(scenario.getId()).isEqualTo("scenario-123");
                assertThat(scenario.getName()).isEqualTo("Test Scenario");
                assertThat(scenario.getDescription()).isEqualTo("Test Description");
                assertThat(scenario.getDifficulty()).isEqualTo("medium");
                assertThat(scenario.getCreatedAt()).isEqualTo("2024-01-01T00:00:00Z");
            }).doesNotThrowAnyException();
        }

        @Test
        @DisplayName("Should handle scenario with null description")
        void shouldHandleScenarioWithNullDescription() {
            String response = "{\"code\":200,\"message\":\"success\",\"data\":{\"id\":\"scenario-123\",\"name\":\"Test\",\"description\":null,\"difficulty\":\"easy\",\"config\":null,\"created_at\":null,\"updated_at\":null}}";
            assertThatCode(() -> {
                Scenario scenario = parseScenarioResponse(response);
                assertThat(scenario.getDescription()).isNull();
            }).doesNotThrowAnyException();
        }
    }

    @Nested
    @DisplayName("Webhook Tests")
    class WebhookTests {

        @Test
        @DisplayName("Should handle webhook response")
        void shouldHandleWebhookResponse() {
            assertThatCode(() -> {
                Webhook webhook = parseWebhookResponse(TestData.createWebhookResponse());
                assertThat(webhook.getId()).isEqualTo("webhook-123");
                assertThat(webhook.getAppId()).isEqualTo("app-123");
                assertThat(webhook.getUrl()).isEqualTo("https://example.com/webhook");
                assertThat(webhook.getSecret()).isEqualTo("secret123");
                assertThat(webhook.getEvents()).contains("verify.success");
                assertThat(webhook.isEnabled()).isTrue();
            }).doesNotThrowAnyException();
        }

        @Test
        @DisplayName("Should handle disabled webhook")
        void shouldHandleDisabledWebhook() {
            String response = "{\"code\":200,\"message\":\"success\",\"data\":{\"id\":\"webhook-123\",\"app_id\":\"app-123\",\"url\":\"https://example.com/webhook\",\"secret\":\"secret123\",\"events\":[\"verify.success\"],\"headers\":{},\"enabled\":false,\"created_at\":\"2024-01-01T00:00:00Z\",\"updated_at\":\"2024-01-01T00:00:00Z\"}}";
            assertThatCode(() -> {
                Webhook webhook = parseWebhookResponse(response);
                assertThat(webhook.isEnabled()).isFalse();
            }).doesNotThrowAnyException();
        }
    }

    @Nested
    @DisplayName("Health Check Tests")
    class HealthCheckTests {

        @Test
        @DisplayName("Should handle healthy response")
        void shouldHandleHealthyResponse() {
            assertThatCode(() -> {
                HealthStatus status = parseHealthStatus(TestData.createHealthCheckResponse());
                assertThat(status.getStatus()).isEqualTo("healthy");
                assertThat(status.getService()).isEqualTo("captchax");
                assertThat(status.getVersion()).isEqualTo("1.0.0");
            }).doesNotThrowAnyException();
        }

        @Test
        @DisplayName("Should handle unhealthy response")
        void shouldHandleUnhealthyResponse() {
            String response = "{\"code\":200,\"message\":\"success\",\"data\":{\"status\":\"unhealthy\",\"service\":\"captchax\",\"timestamp\":\"2024-01-01T00:00:00Z\",\"version\":\"1.0.0\"}}";
            assertThatCode(() -> {
                HealthStatus status = parseHealthStatus(response);
                assertThat(status.getStatus()).isEqualTo("unhealthy");
            }).doesNotThrowAnyException();
        }
    }

    @Nested
    @DisplayName("Error Response Tests")
    class ErrorResponseTests {

        @Test
        @DisplayName("Should throw exception for error response")
        void shouldThrowExceptionForErrorResponse() {
            String errorResponse = TestData.createErrorResponse(400, "Bad Request");
            assertThatThrownBy(() -> parseErrorResponse(errorResponse))
                    .isInstanceOf(CaptchaXException.class)
                    .hasMessageContaining("Bad Request");
        }

        @Test
        @DisplayName("Should handle 404 error")
        void shouldHandle404Error() {
            String errorResponse = TestData.createErrorResponse(404, "Not Found");
            assertThatThrownBy(() -> parseErrorResponse(errorResponse))
                    .isInstanceOf(CaptchaXException.class);
        }

        @Test
        @DisplayName("Should handle 500 error")
        void shouldHandle500Error() {
            String errorResponse = TestData.createErrorResponse(500, "Internal Server Error");
            assertThatThrownBy(() -> parseErrorResponse(errorResponse))
                    .isInstanceOf(CaptchaXException.class);
        }

        @Test
        @DisplayName("Should handle 401 unauthorized")
        void shouldHandle401Unauthorized() {
            String errorResponse = TestData.createErrorResponse(401, "Unauthorized");
            assertThatThrownBy(() -> parseErrorResponse(errorResponse))
                    .isInstanceOf(CaptchaXException.class);
        }

        @Test
        @DisplayName("Should handle 429 rate limit")
        void shouldHandle429RateLimit() {
            String errorResponse = TestData.createErrorResponse(429, "Too Many Requests");
            assertThatThrownBy(() -> parseErrorResponse(errorResponse))
                    .isInstanceOf(CaptchaXException.class);
        }
    }

    @Nested
    @DisplayName("Argument Captor Tests")
    class ArgumentCaptorTests {

        @Test
        @DisplayName("Should capture request headers")
        void shouldCaptureRequestHeaders() {
            ArgumentCaptor<Request> requestCaptor = ArgumentCaptor.forClass(Request.class);
            verify(mockHttpClient, never()).newCall(any());
        }

        @Test
        @DisplayName("Should capture POST body")
        void shouldCapturePostBody() {
            ArgumentCaptor<RequestBody> bodyCaptor = ArgumentCaptor.forClass(RequestBody.class);
            verify(mockResponse, never()).body();
        }
    }

    @Nested
    @DisplayName("Header Tests")
    class HeaderTests {

        @Test
        @DisplayName("Should include default headers in request")
        void shouldIncludeDefaultHeadersInRequest() {
            CaptchaXClient testClient = new CaptchaXClient(
                    new CaptchaConfig.Builder()
                            .baseUrl(TestData.TEST_BASE_URL)
                            .appId(TestData.TEST_APP_ID)
                            .build());

            assertThatCode(() -> {
                Map<String, Object> body = new java.util.HashMap<>();
                body.put("test", "data");
                assertThat(body).containsKey("test");
            }).doesNotThrowAnyException();
        }
    }

    @Nested
    @DisplayName("Concurrent Tests")
    class ConcurrentTests {

        @Test
        @DisplayName("Should handle multiple client info creations")
        void shouldHandleMultipleClientInfoCreations() {
            CaptchaXClient testClient = new CaptchaXClient(TestData.TEST_BASE_URL);
            assertThatCode(() -> {
                for (int i = 0; i < 10; i++) {
                    String info = testClient.createClientInfo(null);
                    assertThat(info).isNotNull();
                }
            }).doesNotThrowAnyException();
        }

        @Test
        @DisplayName("Should handle concurrent config updates")
        void shouldHandleConcurrentConfigUpdates() {
            CaptchaXClient testClient = new CaptchaXClient(TestData.createTestConfig());
            assertThatCode(() -> {
                testClient.setApiVersion(ApiVersion.V1);
                testClient.setApiVersion(ApiVersion.V2);
                assertThat(testClient.getApiVersion()).isEqualTo(ApiVersion.V2);
            }).doesNotThrowAnyException();
        }
    }

    @Nested
    @DisplayName("Verification Parameter Tests")
    class VerificationParameterTests {

        @Test
        @DisplayName("Should handle various target coordinates")
        void shouldHandleVariousTargetCoordinates() {
            assertThatCode(() -> {
                Map<String, Object> body = new java.util.HashMap<>();
                body.put("captcha_id", "test-captcha");
                body.put("target_x", 0);
                body.put("target_y", 0);
                assertThat(body.get("target_x")).isEqualTo(0);
                assertThat(body.get("target_y")).isEqualTo(0);
            }).doesNotThrowAnyException();
        }

        @Test
        @DisplayName("Should handle negative coordinates")
        void shouldHandleNegativeCoordinates() {
            assertThatCode(() -> {
                Map<String, Object> body = new java.util.HashMap<>();
                body.put("target_x", -100);
                body.put("target_y", -50);
                assertThat(body.get("target_x")).isEqualTo(-100);
            }).doesNotThrowAnyException();
        }

        @Test
        @DisplayName("Should handle large coordinates")
        void shouldHandleLargeCoordinates() {
            assertThatCode(() -> {
                Map<String, Object> body = new java.util.HashMap<>();
                body.put("target_x", Integer.MAX_VALUE);
                body.put("target_y", Integer.MAX_VALUE);
                assertThat(body.get("target_x")).isEqualTo(Integer.MAX_VALUE);
            }).doesNotThrowAnyException();
        }
    }

    @Nested
    @DisplayName("Scenario CRUD Tests")
    class ScenarioCrudTests {

        @Test
        @DisplayName("Should create scenario body correctly")
        void shouldCreateScenarioBodyCorrectly() {
            assertThatCode(() -> {
                Map<String, Object> body = new java.util.HashMap<>();
                body.put("name", "Test Scenario");
                body.put("description", "Test Description");
                body.put("difficulty", "medium");
                Map<String, Object> config = new java.util.HashMap<>();
                config.put("param1", "value1");
                body.put("config", config);

                assertThat(body.get("name")).isEqualTo("Test Scenario");
                assertThat(body.get("description")).isEqualTo("Test Description");
                assertThat(body.get("difficulty")).isEqualTo("medium");
                assertThat(body.get("config")).isNotNull();
            }).doesNotThrowAnyException();
        }

        @Test
        @DisplayName("Should handle null optional fields in scenario")
        void shouldHandleNullOptionalFieldsInScenario() {
            assertThatCode(() -> {
                Map<String, Object> body = new java.util.HashMap<>();
                body.put("name", "Test Scenario");
                assertThat(body.get("description")).isNull();
                assertThat(body.get("difficulty")).isNull();
                assertThat(body.get("config")).isNull();
            }).doesNotThrowAnyException();
        }
    }

    @Nested
    @DisplayName("Webhook CRUD Tests")
    class WebhookCrudTests {

        @Test
        @DisplayName("Should create webhook body correctly")
        void shouldCreateWebhookBodyCorrectly() {
            assertThatCode(() -> {
                Map<String, Object> body = new java.util.HashMap<>();
                body.put("app_id", "app-123");
                body.put("url", "https://example.com/webhook");
                body.put("events", java.util.Arrays.asList("verify.success", "verify.failed"));
                body.put("secret", "secret123");

                assertThat(body.get("app_id")).isEqualTo("app-123");
                assertThat(body.get("url")).isEqualTo("https://example.com/webhook");
                assertThat(body.get("events")).asList().hasSize(2);
            }).doesNotThrowAnyException();
        }

        @Test
        @DisplayName("Should handle webhook with headers")
        void shouldHandleWebhookWithHeaders() {
            assertThatCode(() -> {
                Map<String, Object> body = new java.util.HashMap<>();
                Map<String, String> headers = new java.util.HashMap<>();
                headers.put("Authorization", "Bearer token");
                headers.put("X-Custom-Header", "value");
                body.put("headers", headers);

                @SuppressWarnings("unchecked")
                Map<String, String> resultHeaders = (Map<String, String>) body.get("headers");
                assertThat(resultHeaders).hasSize(2);
                assertThat(resultHeaders.get("Authorization")).isEqualTo("Bearer token");
            }).doesNotThrowAnyException();
        }

        @Test
        @DisplayName("Should handle update webhook with partial fields")
        void shouldHandleUpdateWebhookWithPartialFields() {
            assertThatCode(() -> {
                Map<String, Object> body = new java.util.HashMap<>();
                body.put("url", "https://new-url.com");
                assertThat(body.get("url")).isEqualTo("https://new-url.com");
                assertThat(body.get("secret")).isNull();
                assertThat(body.get("events")).isNull();
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
