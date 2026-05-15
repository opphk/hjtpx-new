package com.captchax.sdk;

import java.util.*;

public class TestData {

    public static final String TEST_BASE_URL = "http://localhost:3000";
    public static final String TEST_APP_ID = "test-app-id";
    public static final int TEST_TIMEOUT = 5000;
    public static final int TEST_RETRY_TIMES = 2;

    public static CaptchaConfig createTestConfig() {
        return new CaptchaConfig.Builder()
                .baseUrl(TEST_BASE_URL)
                .appId(TEST_APP_ID)
                .timeout(TEST_TIMEOUT)
                .retryTimes(TEST_RETRY_TIMES)
                .apiVersion(ApiVersion.V1)
                .build();
    }

    public static CaptchaConfig createTestConfigV2() {
        return new CaptchaConfig.Builder()
                .baseUrl(TEST_BASE_URL)
                .appId(TEST_APP_ID)
                .timeout(TEST_TIMEOUT)
                .retryTimes(TEST_RETRY_TIMES)
                .apiVersion(ApiVersion.V2)
                .build();
    }

    public static String createHealthCheckResponse() {
        return "{\"code\":200,\"message\":\"success\",\"data\":{\"status\":\"healthy\",\"service\":\"captchax\",\"timestamp\":\"2024-01-01T00:00:00Z\",\"version\":\"1.0.0\"}}";
    }

    public static String createSliderCaptchaResponse() {
        return "{\"code\":200,\"message\":\"success\",\"data\":{\"id\":\"slider-123\",\"background_b64\":\"base64background\",\"slider_b64\":\"base64slider\",\"target_x\":100,\"target_y\":50}}";
    }

    public static String createSliderVerifyResponse(boolean success) {
        String result = success ? "true" : "false";
        return "{\"code\":200,\"message\":\"success\",\"data\":{\"success\":" + result + ",\"message\":\"Verification " + (success ? "passed" : "failed") + "\"}}";
    }

    public static String createClickCaptchaResponse() {
        return "{\"code\":200,\"message\":\"success\",\"data\":{\"id\":\"click-123\",\"image\":\"base64image\",\"target_chars\":[\"A\",\"B\",\"C\"],\"char_positions\":[{\"char\":\"A\",\"x\":100,\"y\":50},{\"char\":\"B\",\"x\":150,\"y\":60},{\"char\":\"C\",\"x\":200,\"y\":70}]}}";
    }

    public static String createClickVerifyResponse(boolean success) {
        String result = success ? "true" : "false";
        return "{\"code\":200,\"message\":\"success\",\"data\":{\"success\":" + result + ",\"score\":0.95,\"message\":\"Verification " + (success ? "passed" : "failed") + "\"}}";
    }

    public static String createPuzzleCaptchaResponse() {
        return "{\"code\":200,\"message\":\"success\",\"data\":{\"id\":\"puzzle-123\",\"background_b64\":\"base64background\",\"puzzle_b64\":\"base64puzzle\",\"target_x\":100,\"target_y\":50}}";
    }

    public static String createPuzzleVerifyResponse(boolean success) {
        String result = success ? "true" : "false";
        return "{\"code\":200,\"message\":\"success\",\"data\":{\"success\":" + result + ",\"message\":\"Verification " + (success ? "passed" : "failed") + "\"}}";
    }

    public static String createBatchVerifyResponse() {
        return "{\"code\":200,\"message\":\"success\",\"data\":{\"results\":[{\"captcha_id\":\"captcha-1\",\"success\":true,\"message\":\"success\",\"score\":null},{\"captcha_id\":\"captcha-2\",\"success\":false,\"message\":\"failed\",\"score\":null}],\"summary\":{\"total\":2,\"success\":1,\"failed\":1,\"skipped\":0}}}";
    }

    public static String createScenarioResponse() {
        return "{\"code\":200,\"message\":\"success\",\"data\":{\"id\":\"scenario-123\",\"name\":\"Test Scenario\",\"description\":\"Test Description\",\"difficulty\":\"medium\",\"config\":{\"param1\":\"value1\"},\"created_at\":\"2024-01-01T00:00:00Z\",\"updated_at\":\"2024-01-01T00:00:00Z\"}}";
    }

    public static String createWebhookResponse() {
        return "{\"code\":200,\"message\":\"success\",\"data\":{\"id\":\"webhook-123\",\"app_id\":\"app-123\",\"url\":\"https://example.com/webhook\",\"secret\":\"secret123\",\"events\":[\"verify.success\"],\"headers\":{},\"enabled\":true,\"created_at\":\"2024-01-01T00:00:00Z\",\"updated_at\":\"2024-01-01T00:00:00Z\"}}";
    }

    public static String createErrorResponse(int code, String message) {
        return "{\"code\":" + code + ",\"message\":\"" + message + "\",\"data\":null}";
    }

    public static List<CharPosition> createTestCharPositions() {
        List<CharPosition> positions = new ArrayList<>();
        positions.add(new CharPosition("A", 100, 50));
        positions.add(new CharPosition("B", 150, 60));
        positions.add(new CharPosition("C", 200, 70));
        return positions;
    }

    public static List<BatchVerifyItem> createTestBatchItems() {
        List<BatchVerifyItem> items = new ArrayList<>();
        items.add(new BatchVerifyItem("captcha-1", "slider", 100));
        items.add(new BatchVerifyItem("captcha-2", "click", 50).withClicks(createTestCharPositions()));
        return items;
    }

    public static Map<String, Object> createTestExtra() {
        Map<String, Object> extra = new HashMap<>();
        extra.put("userId", "user-123");
        extra.put("sessionId", "session-456");
        return extra;
    }
}
