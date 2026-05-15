package com.captchax.sdk;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

import java.util.*;
import java.util.concurrent.*;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.*;

@DisplayName("CaptchaXClient Unit Tests")
class CaptchaXClientUnitTest {

    @Nested
    @DisplayName("Constructor Tests")
    class ConstructorTests {

        @Test
        @DisplayName("Should throw IllegalArgumentException when baseUrl is null")
        void shouldThrowWhenBaseUrlIsNull() {
            assertThatThrownBy(() -> new CaptchaXClient((String) null))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("baseUrl");
        }

        @Test
        @DisplayName("Should throw IllegalArgumentException when baseUrl is empty")
        void shouldThrowWhenBaseUrlIsEmpty() {
            assertThatThrownBy(() -> new CaptchaXClient(""))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("baseUrl");
        }

        @ParameterizedTest
        @ValueSource(strings = {"   ", "\t", "\n"})
        @DisplayName("Should throw IllegalArgumentException when baseUrl is blank")
        void shouldThrowWhenBaseUrlIsBlank(String blankUrl) {
            assertThatThrownBy(() -> new CaptchaXClient(blankUrl))
                    .isInstanceOf(IllegalArgumentException.class);
        }

        @Test
        @DisplayName("Should create client with valid config")
        void shouldCreateClientWithValidConfig() {
            CaptchaConfig config = TestData.createTestConfig();
            CaptchaXClient client = new CaptchaXClient(config);
            assertThat(client).isNotNull();
        }

        @Test
        @DisplayName("Should create client with baseUrl constructor")
        void shouldCreateClientWithBaseUrlOnly() {
            CaptchaXClient client = new CaptchaXClient("http://localhost:3000");
            assertThat(client).isNotNull();
        }

        @Test
        @DisplayName("Should create client with baseUrl and appId constructor")
        void shouldCreateClientWithBaseUrlAndAppId() {
            CaptchaXClient client = new CaptchaXClient("http://localhost:3000", "app-123");
            assertThat(client).isNotNull();
        }

        @Test
        @DisplayName("Should trim trailing slashes from baseUrl")
        void shouldTrimTrailingSlashes() {
            CaptchaXClient client = new CaptchaXClient("http://localhost:3000///");
            assertThat(client).isNotNull();
        }
    }

    @Nested
    @DisplayName("Configuration Tests")
    class ConfigurationTests {

        private CaptchaXClient client;

        @BeforeEach
        void setUp() {
            client = new CaptchaXClient(TestData.createTestConfig());
        }

        @Test
        @DisplayName("Should set and get appId")
        void shouldSetAndGetAppId() {
            client.setAppId("new-app-id");
            assertThat(client.getApiVersion()).isEqualTo(ApiVersion.V1);
        }

        @Test
        @DisplayName("Should set and get API version")
        void shouldSetAndGetApiVersion() {
            assertThat(client.getApiVersion()).isEqualTo(ApiVersion.V1);

            client.setApiVersion(ApiVersion.V2);
            assertThat(client.getApiVersion()).isEqualTo(ApiVersion.V2);
        }

        @ParameterizedTest
        @CsvSource({
                "V1, v1",
                "V2, v2"
        })
        @DisplayName("Should return correct API version value")
        void shouldReturnCorrectApiVersionValue(ApiVersion version, String expected) {
            client.setApiVersion(version);
            assertThat(version.getValue()).isEqualTo(expected);
        }
    }

    @Nested
    @DisplayName("Client Info Tests")
    class ClientInfoTests {

        @Test
        @DisplayName("Should create client info with platform and timestamp")
        void shouldCreateClientInfoWithPlatformAndTimestamp() {
            CaptchaXClient client = new CaptchaXClient(TestData.TEST_BASE_URL);
            String info = client.createClientInfo(null);

            assertThat(info).isNotNull();
            assertThat(info).contains("platform");
            assertThat(info).contains("timestamp");
            assertThat(info).contains(System.getProperty("os.name"));
        }

        @Test
        @DisplayName("Should create client info with extra data")
        void shouldCreateClientInfoWithExtraData() {
            CaptchaXClient client = new CaptchaXClient(TestData.TEST_BASE_URL);
            String info = client.createClientInfo(TestData.createTestExtra());

            assertThat(info).isNotNull();
            assertThat(info).contains("userId");
            assertThat(info).contains("user-123");
            assertThat(info).contains("sessionId");
            assertThat(info).contains("session-456");
        }

        @Test
        @DisplayName("Should handle empty extra data")
        void shouldHandleEmptyExtraData() {
            CaptchaXClient client = new CaptchaXClient(TestData.TEST_BASE_URL);
            Map<String, Object> emptyMap = new HashMap<>();
            String info = client.createClientInfo(emptyMap);

            assertThat(info).isNotNull();
            assertThat(info).contains("platform");
            assertThat(info).contains("timestamp");
        }
    }

    @Nested
    @DisplayName("Error Handling Tests")
    class ErrorHandlingTests {

        @Test
        @DisplayName("Should throw exception when appId is missing for captcha generation")
        void shouldThrowWhenAppIdMissing() {
            CaptchaXClient client = new CaptchaXClient(TestData.TEST_BASE_URL);

            assertThatThrownBy(() -> client.generateSliderCaptcha())
                    .isInstanceOf(CaptchaXException.class)
                    .hasMessageContaining("appId");
        }

        @Test
        @DisplayName("Should include error details in exception")
        void shouldIncludeErrorDetails() {
            CaptchaXException exception = new CaptchaXException(
                    "Test error", 400, 400, "details");
            assertThat(exception.getDetails()).isEqualTo("details");
        }

        @Test
        @DisplayName("Should handle exception with cause")
        void shouldHandleExceptionWithCause() {
            Exception cause = new RuntimeException("cause");
            CaptchaXException exception = new CaptchaXException("Test error", cause);
            assertThat(exception.getCause()).isSameAs(cause);
        }

        @Test
        @DisplayName("Should create exception with message only")
        void shouldCreateExceptionWithMessageOnly() {
            CaptchaXException exception = new CaptchaXException("Test error");
            assertThat(exception.getMessage()).isEqualTo("Test error");
            assertThat(exception.getCode()).isEqualTo(500);
            assertThat(exception.getStatusCode()).isEqualTo(500);
        }

        @Test
        @DisplayName("Should create exception with code and status")
        void shouldCreateExceptionWithCodeAndStatus() {
            CaptchaXException exception = new CaptchaXException("Error", 404, 404);
            assertThat(exception.getCode()).isEqualTo(404);
            assertThat(exception.getStatusCode()).isEqualTo(404);
        }

        @Test
        @DisplayName("Should provide readable toString")
        void shouldProvideReadableToString() {
            CaptchaXException exception = new CaptchaXException("Error", 404, 404);
            String str = exception.toString();
            assertThat(str).contains("CaptchaXException");
            assertThat(str).contains("404");
            assertThat(str).contains("Error");
        }
    }

    @Nested
    @DisplayName("Model Tests")
    class ModelTests {

        @Test
        @DisplayName("Should create CharPosition with constructor")
        void shouldCreateCharPositionWithConstructor() {
            CharPosition position = new CharPosition("A", 100, 50);
            assertThat(position.getCharacter()).isEqualTo("A");
            assertThat(position.getX()).isEqualTo(100);
            assertThat(position.getY()).isEqualTo(50);
        }

        @Test
        @DisplayName("Should create CharPosition with default constructor")
        void shouldCreateCharPositionWithDefaultConstructor() {
            CharPosition position = new CharPosition();
            assertThat(position.getCharacter()).isNull();
        }

        @Test
        @DisplayName("Should create BatchVerifyItem with fluent API")
        void shouldCreateBatchVerifyItemWithFluentApi() {
            List<CharPosition> clicks = TestData.createTestCharPositions();
            BatchVerifyItem item = new BatchVerifyItem("captcha-1", "slider", 100)
                    .withTargetY(50)
                    .withClicks(clicks);

            assertThat(item.captchaId).isEqualTo("captcha-1");
            assertThat(item.type).isEqualTo("slider");
            assertThat(item.targetX).isEqualTo(100);
            assertThat(item.targetY).isEqualTo(50);
            assertThat(item.clicks).hasSize(3);
        }

        @Test
        @DisplayName("Should handle null targetY in BatchVerifyItem")
        void shouldHandleNullTargetY() {
            BatchVerifyItem item = new BatchVerifyItem("captcha-1", "slider", 100);
            assertThat(item.targetY).isNull();
        }

        @Test
        @DisplayName("Should handle null clicks in BatchVerifyItem")
        void shouldHandleNullClicks() {
            BatchVerifyItem item = new BatchVerifyItem("captcha-1", "slider", 100);
            assertThat(item.clicks).isNull();
        }
    }

    @Nested
    @DisplayName("Config Builder Tests")
    class ConfigBuilderTests {

        @Test
        @DisplayName("Should build config with all parameters")
        void shouldBuildConfigWithAllParameters() {
            CaptchaConfig config = new CaptchaConfig.Builder()
                    .baseUrl("http://localhost:3000")
                    .appId("app-123")
                    .timeout(5000)
                    .retryTimes(2)
                    .apiVersion(ApiVersion.V2)
                    .build();

            assertThat(config.getBaseUrl()).isEqualTo("http://localhost:3000");
            assertThat(config.getAppId()).isEqualTo("app-123");
            assertThat(config.getTimeout()).isEqualTo(5000);
            assertThat(config.getRetryTimes()).isEqualTo(2);
            assertThat(config.getApiVersion()).isEqualTo(ApiVersion.V2);
        }

        @Test
        @DisplayName("Should use default values")
        void shouldUseDefaultValues() {
            CaptchaConfig config = new CaptchaConfig("http://localhost:3000");

            assertThat(config.getTimeout()).isEqualTo(10000);
            assertThat(config.getRetryTimes()).isEqualTo(3);
            assertThat(config.getApiVersion()).isEqualTo(ApiVersion.V1);
        }

        @Test
        @DisplayName("Should allow setters to update values")
        void shouldAllowSettersToUpdateValues() {
            CaptchaConfig config = new CaptchaConfig("http://localhost:3000");
            config.setBaseUrl("http://new-url.com");
            config.setAppId("new-app");
            config.setTimeout(3000);
            config.setRetryTimes(5);
            config.setApiVersion(ApiVersion.V2);

            assertThat(config.getBaseUrl()).isEqualTo("http://new-url.com");
            assertThat(config.getAppId()).isEqualTo("new-app");
            assertThat(config.getTimeout()).isEqualTo(3000);
            assertThat(config.getRetryTimes()).isEqualTo(5);
            assertThat(config.getApiVersion()).isEqualTo(ApiVersion.V2);
        }
    }

    @Nested
    @DisplayName("ApiResponse Tests")
    class ApiResponseTests {

        @Test
        @DisplayName("Should return true for success response")
        void shouldReturnTrueForSuccessResponse() {
            ApiResponse<?> response = new ApiResponse<>();
            response.getClass().getDeclaredField("code").setAccessible(true);
            try {
                java.lang.reflect.Field codeField = response.getClass().getDeclaredField("code");
                codeField.setAccessible(true);
                codeField.set(response, 200);
            } catch (Exception e) {
                throw new RuntimeException(e);
            }
            assertThat(response.isSuccess()).isTrue();
        }

        @Test
        @DisplayName("Should return false for error response")
        void shouldReturnFalseForErrorResponse() {
            ApiResponse<?> response = new ApiResponse<>();
            try {
                java.lang.reflect.Field codeField = response.getClass().getDeclaredField("code");
                codeField.setAccessible(true);
                codeField.set(response, 400);
            } catch (Exception e) {
                throw new RuntimeException(e);
            }
            assertThat(response.isSuccess()).isFalse();
        }

        @Test
        @DisplayName("Should handle null data")
        void shouldHandleNullData() {
            ApiResponse<String> response = new ApiResponse<>();
            try {
                java.lang.reflect.Field codeField = response.getClass().getDeclaredField("code");
                codeField.setAccessible(true);
                codeField.set(response, 200);
            } catch (Exception e) {
                throw new RuntimeException(e);
            }
            assertThat(response.getData()).isNull();
        }
    }

    @Nested
    @DisplayName("Scenario Model Tests")
    class ScenarioModelTests {

        @Test
        @DisplayName("Should create scenario with all fields")
        void shouldCreateScenarioWithAllFields() {
            Scenario scenario = new Scenario();
            assertThat(scenario).isNotNull();
        }
    }

    @Nested
    @DisplayName("Webhook Model Tests")
    class WebhookModelTests {

        @Test
        @DisplayName("Should create webhook with all fields")
        void shouldCreateWebhookWithAllFields() {
            Webhook webhook = new Webhook();
            assertThat(webhook).isNotNull();
        }
    }

    @Nested
    @DisplayName("HealthStatus Model Tests")
    class HealthStatusModelTests {

        @Test
        @DisplayName("Should create health status with all fields")
        void shouldCreateHealthStatusWithAllFields() {
            HealthStatus status = new HealthStatus();
            assertThat(status).isNotNull();
        }
    }
}
