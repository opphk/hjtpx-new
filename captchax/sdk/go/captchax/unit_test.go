package captchax

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewClientWithValidConfig(t *testing.T) {
	client, err := NewClient(NewConfig("https://captchax.example.com"))
	require.NoError(t, err)
	require.NotNil(t, client)
}

func TestNewClientWithEmptyBaseURL(t *testing.T) {
	client, err := NewClient(NewConfig(""))
	require.Error(t, err)
	require.Nil(t, client)
	assert.Contains(t, err.Error(), "baseURL is required")
}

func TestClientWithDefaultHelper(t *testing.T) {
	client, err := NewClientWithDefault("https://captchax.example.com")
	require.NoError(t, err)
	require.NotNil(t, client)
}

func TestNewClientWithAllOptions(t *testing.T) {
	config := NewConfig("https://captchax.example.com").
		WithAppID("test-app-id").
		WithTimeout(30 * time.Second).
		WithRetryTimes(5).
		WithAPIVersion(APIVersionV2)

	client, err := NewClient(config)
	require.NoError(t, err)
	require.NotNil(t, client)

	assert.Equal(t, "test-app-id", client.config.AppID)
	assert.Equal(t, 30*time.Second, client.config.Timeout)
	assert.Equal(t, 5, client.config.RetryTimes)
	assert.Equal(t, APIVersionV2, client.config.APIVersion)
}

func TestConfigNewConfig(t *testing.T) {
	config := NewConfig("https://test.example.com")

	assert.Equal(t, "https://test.example.com", config.BaseURL)
	assert.Equal(t, 10*time.Second, config.Timeout)
	assert.Equal(t, 3, config.RetryTimes)
	assert.Equal(t, APIVersionV1, config.APIVersion)
	assert.Empty(t, config.AppID)
}

func TestConfigWithAppID(t *testing.T) {
	config := NewConfig("https://test.example.com").WithAppID("app-123")
	assert.Equal(t, "app-123", config.AppID)
}

func TestConfigWithTimeout(t *testing.T) {
	config := NewConfig("https://test.example.com").WithTimeout(60 * time.Second)
	assert.Equal(t, 60*time.Second, config.Timeout)
}

func TestConfigWithRetryTimes(t *testing.T) {
	config := NewConfig("https://test.example.com").WithRetryTimes(10)
	assert.Equal(t, 10, config.RetryTimes)
}

func TestConfigWithAPIVersion(t *testing.T) {
	tests := []struct {
		name     string
		version  APIVersion
		expected APIVersion
	}{
		{"V1", APIVersionV1, APIVersionV1},
		{"V2", APIVersionV2, APIVersionV2},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			config := NewConfig("https://test.example.com").WithAPIVersion(tt.version)
			assert.Equal(t, tt.expected, config.APIVersion)
		})
	}
}

func TestClientSetAppIDAndVerify(t *testing.T) {
	client, err := NewClient(NewConfig("https://test.example.com"))
	require.NoError(t, err)

	client.SetAppID("new-app-id")
	assert.Equal(t, "new-app-id", client.config.AppID)
}

func TestClientAPIVersionManagement(t *testing.T) {
	client, err := NewClient(NewConfig("https://test.example.com"))
	require.NoError(t, err)

	assert.Equal(t, APIVersionV1, client.GetAPIVersion())

	client.SetAPIVersion(APIVersionV2)
	assert.Equal(t, APIVersionV2, client.GetAPIVersion())

	client.SetAPIVersion(APIVersionV1)
	assert.Equal(t, APIVersionV1, client.GetAPIVersion())
}

func TestClientCreateClientInfo(t *testing.T) {
	client, err := NewClient(NewConfig("https://test.example.com"))
	require.NoError(t, err)

	info := client.CreateClientInfo(nil)
	assert.NotEmpty(t, info)

	var result map[string]interface{}
	err = json.Unmarshal([]byte(info), &result)
	require.NoError(t, err)

	assert.Equal(t, "go", result["platform"])
	assert.Contains(t, result, "timestamp")

	infoWithExtra := client.CreateClientInfo(map[string]interface{}{
		"user_id": "12345",
		"session": "abc123",
	})

	var resultExtra map[string]interface{}
	err = json.Unmarshal([]byte(infoWithExtra), &resultExtra)
	require.NoError(t, err)

	assert.Equal(t, "12345", resultExtra["user_id"])
	assert.Equal(t, "abc123", resultExtra["session"])
	assert.Equal(t, "go", resultExtra["platform"])
}

func TestClientGetAPIPrefix(t *testing.T) {
	client, err := NewClient(NewConfig("https://test.example.com"))
	require.NoError(t, err)

	client.SetAPIVersion(APIVersionV1)
	assert.Equal(t, "/api/v1", client.getAPIPrefix())

	client.SetAPIVersion(APIVersionV2)
	assert.Equal(t, "/api/v2", client.getAPIPrefix())
}

func TestErrorCreation(t *testing.T) {
	err := NewError("simple error")
	assert.Equal(t, 500, err.Code)
	assert.Equal(t, 500, err.StatusCode)
	assert.Equal(t, "simple error", err.Message)
	assert.Contains(t, err.Error(), "CaptchaXError(500)")

	errWithCode := NewErrorWithCode("error with code", 400, 400)
	assert.Equal(t, 400, errWithCode.Code)
	assert.Equal(t, 400, errWithCode.StatusCode)
	assert.Equal(t, "error with code", errWithCode.Message)

	errWithDetails := NewErrorWithDetails("error with details", 500, 500, map[string]string{"key": "value"})
	assert.Equal(t, "value", errWithDetails.Details.(map[string]string)["key"])
}

func TestRequireAppID(t *testing.T) {
	client, err := NewClient(NewConfig("https://test.example.com"))
	require.NoError(t, err)

	err = client.requireAppID()
	assert.Error(t, err)

	client.SetAppID("test-app")
	err = client.requireAppID()
	assert.NoError(t, err)
}

func TestHTTPClientCreation(t *testing.T) {
	httpClient := newHTTPClient("https://test.example.com", 10*time.Second, 3)
	require.NotNil(t, httpClient)
	assert.Equal(t, "https://test.example.com", httpClient.baseURL)
	assert.Equal(t, 10*time.Second, httpClient.timeout)
	assert.Equal(t, 3, httpClient.retryTimes)
}

func TestHTTPClientSetHeader(t *testing.T) {
	httpClient := newHTTPClient("https://test.example.com", 10*time.Second, 0)
	httpClient.setHeader("X-Custom-Header", "custom-value")
	assert.Equal(t, "custom-value", httpClient.headers["X-Custom-Header"])
}

func TestHTTPClientSetHeaders(t *testing.T) {
	httpClient := newHTTPClient("https://test.example.com", 10*time.Second, 0)
	httpClient.setHeaders(map[string]string{
		"X-Header-1": "value1",
		"X-Header-2": "value2",
	})
	assert.Equal(t, "value1", httpClient.headers["X-Header-1"])
	assert.Equal(t, "value2", httpClient.headers["X-Header-2"])
}

func TestHTTPClientBuildURL(t *testing.T) {
	httpClient := newHTTPClient("https://test.example.com/api", 10*time.Second, 0)

	tests := []struct {
		name     string
		endpoint string
		expected string
	}{
		{"with leading slash", "/health", "https://test.example.com/api/health"},
		{"without leading slash", "health", "https://test.example.com/api/health"},
		{"full URL", "https://other.com/path", "https://other.com/path"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := httpClient.buildURL(tt.endpoint)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestSliderGenerateOptions(t *testing.T) {
	width := 400
	height := 300
	opts := &SliderGenerateOptions{
		Width:       &width,
		Height:      &height,
		ClientInfo:  "test-client",
		ScenarioID:  "scenario-1",
	}

	assert.Equal(t, &width, opts.Width)
	assert.Equal(t, &height, opts.Height)
	assert.Equal(t, "test-client", opts.ClientInfo)
	assert.Equal(t, "scenario-1", opts.ScenarioID)
}

func TestClickGenerateOptions(t *testing.T) {
	charCount := 4
	opts := &ClickGenerateOptions{
		CharCount:  &charCount,
		ClientInfo: "test-client",
		ScenarioID: "scenario-2",
	}

	assert.Equal(t, &charCount, opts.CharCount)
	assert.Equal(t, "test-client", opts.ClientInfo)
	assert.Equal(t, "scenario-2", opts.ScenarioID)
}

func TestCharPosition(t *testing.T) {
	pos := CharPosition{
		Char: "A",
		X:    100,
		Y:    200,
	}

	assert.Equal(t, "A", pos.Char)
	assert.Equal(t, 100, pos.X)
	assert.Equal(t, 200, pos.Y)
}

func TestBatchVerifyItem(t *testing.T) {
	targetY := 50
	item := BatchVerifyItem{
		CaptchaID: "captcha-123",
		Type:      "slider",
		TargetX:   100,
		TargetY:   &targetY,
	}

	assert.Equal(t, "captcha-123", item.CaptchaID)
	assert.Equal(t, "slider", item.Type)
	assert.Equal(t, 100, item.TargetX)
	assert.Equal(t, &targetY, item.TargetY)
}

func TestScenario(t *testing.T) {
	scenario := Scenario{
		ID:          "scenario-123",
		Name:        "Test Scenario",
		Description: "A test scenario",
		Difficulty:  "easy",
		Config:      map[string]interface{}{"param": "value"},
	}

	assert.Equal(t, "scenario-123", scenario.ID)
	assert.Equal(t, "Test Scenario", scenario.Name)
	assert.Equal(t, "A test scenario", scenario.Description)
	assert.Equal(t, "easy", scenario.Difficulty)
	assert.Equal(t, "value", scenario.Config["param"])
}

func TestWebhook(t *testing.T) {
	enabled := true
	webhook := Webhook{
		ID:     "webhook-123",
		AppID:  "app-456",
		URL:    "https://example.com/webhook",
		Secret: "secret123",
		Events: []string{"verify.success", "verify.fail"},
		Headers: map[string]string{
			"X-Custom": "value",
		},
		Enabled: &enabled,
	}

	assert.Equal(t, "webhook-123", webhook.ID)
	assert.Equal(t, "app-456", webhook.AppID)
	assert.Equal(t, "https://example.com/webhook", webhook.URL)
	assert.Equal(t, "secret123", webhook.Secret)
	assert.Len(t, webhook.Events, 2)
	assert.Equal(t, "value", webhook.Headers["X-Custom"])
	assert.True(t, *webhook.Enabled)
}

func TestHealthStatus(t *testing.T) {
	health := HealthStatus{
		Status:    "healthy",
		Service:   "captchax-api",
		Timestamp: "2024-01-01T00:00:00Z",
		Version:   "1.0.0",
	}

	assert.Equal(t, "healthy", health.Status)
	assert.Equal(t, "captchax-api", health.Service)
	assert.Equal(t, "2024-01-01T00:00:00Z", health.Timestamp)
	assert.Equal(t, "1.0.0", health.Version)
}

func TestDeleteResponse(t *testing.T) {
	resp := DeleteResponse{Deleted: true}
	assert.True(t, resp.Deleted)

	resp.Deleted = false
	assert.False(t, resp.Deleted)
}

func TestAPIResponse(t *testing.T) {
	resp := APIResponse{
		Code:    200,
		Message: "success",
		Data:    map[string]string{"key": "value"},
	}

	assert.Equal(t, 200, resp.Code)
	assert.Equal(t, "success", resp.Message)
	assert.NotNil(t, resp.Data)
}

func TestSliderCaptchaResult(t *testing.T) {
	result := SliderCaptchaResult{
		ID:            "captcha-1",
		BackgroundB64: "base64background",
		SliderB64:     "base64slider",
		TargetX:       150,
		TargetY:       75,
	}

	assert.Equal(t, "captcha-1", result.ID)
	assert.Equal(t, "base64background", result.BackgroundB64)
	assert.Equal(t, "base64slider", result.SliderB64)
	assert.Equal(t, 150, result.TargetX)
	assert.Equal(t, 75, result.TargetY)
}

func TestSliderVerifyResult(t *testing.T) {
	result := SliderVerifyResult{
		Success: true,
		Message: "Verification successful",
	}

	assert.True(t, result.Success)
	assert.Equal(t, "Verification successful", result.Message)
}

func TestClickCaptchaResult(t *testing.T) {
	result := ClickCaptchaResult{
		ID:          "click-1",
		Image:       "base64image",
		TargetChars: []string{"A", "B", "C"},
		CharPositions: []CharPosition{
			{Char: "A", X: 100, Y: 100},
			{Char: "B", X: 200, Y: 200},
		},
	}

	assert.Equal(t, "click-1", result.ID)
	assert.Equal(t, "base64image", result.Image)
	assert.Len(t, result.TargetChars, 3)
	assert.Len(t, result.CharPositions, 2)
}

func TestClickVerifyResult(t *testing.T) {
	result := ClickVerifyResult{
		Success: true,
		Score:   0.95,
		Message: "Verification successful",
	}

	assert.True(t, result.Success)
	assert.Equal(t, 0.95, result.Score)
	assert.Equal(t, "Verification successful", result.Message)
}

func TestPuzzleCaptchaResult(t *testing.T) {
	result := PuzzleCaptchaResult{
		ID:            "puzzle-1",
		BackgroundB64: "base64bg",
		PuzzleB64:    "base64puzzle",
		TargetX:       200,
		TargetY:       100,
	}

	assert.Equal(t, "puzzle-1", result.ID)
	assert.Equal(t, "base64bg", result.BackgroundB64)
	assert.Equal(t, "base64puzzle", result.PuzzleB64)
	assert.Equal(t, 200, result.TargetX)
	assert.Equal(t, 100, result.TargetY)
}

func TestPuzzleVerifyResult(t *testing.T) {
	result := PuzzleVerifyResult{
		Success: false,
		Message: "Verification failed",
	}

	assert.False(t, result.Success)
	assert.Equal(t, "Verification failed", result.Message)
}

func TestBatchVerifyResponse(t *testing.T) {
	score := 0.8
	resp := BatchVerifyResponse{
		Results: []BatchVerifyResult{
			{CaptchaID: "1", Success: true, Message: "OK"},
			{CaptchaID: "2", Success: false, Message: "Failed", Score: &score},
		},
		Summary: BatchVerifySummary{
			Total:   2,
			Success: 1,
			Failed:  1,
			Skipped: 0,
		},
	}

	assert.Len(t, resp.Results, 2)
	assert.Equal(t, 2, resp.Summary.Total)
	assert.Equal(t, 1, resp.Summary.Success)
	assert.Equal(t, 1, resp.Summary.Failed)
}

func TestScenarioListResponse(t *testing.T) {
	resp := ScenarioListResponse{
		Scenarios: []Scenario{
			{ID: "1", Name: "Scenario 1"},
			{ID: "2", Name: "Scenario 2"},
		},
		Total: 2,
	}

	assert.Len(t, resp.Scenarios, 2)
	assert.Equal(t, 2, resp.Total)
}

func TestWebhookListResponse(t *testing.T) {
	resp := WebhookListResponse{
		Webhooks: []Webhook{
			{ID: "1", URL: "https://example.com/1"},
			{ID: "2", URL: "https://example.com/2"},
		},
		Total: 2,
	}

	assert.Len(t, resp.Webhooks, 2)
	assert.Equal(t, 2, resp.Total)
}
