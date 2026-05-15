package captchax

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func setupTestServer(t *testing.T) (*httptest.Server, *Client) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")

		if r.URL.Path == "/health" {
			resp := APIResponse{
				Code:    0,
				Message: "success",
				Data: HealthStatus{
					Status:    "healthy",
					Service:   "captchax-api",
					Timestamp: time.Now().Format(time.RFC3339),
					Version:   "1.0.0",
				},
			}
			json.NewEncoder(w).Encode(resp)
			return
		}

		if r.URL.Path == "/api/v1/captcha/slider" {
			if r.Header.Get("X-App-ID") == "" {
				w.WriteHeader(http.StatusBadRequest)
				json.NewEncoder(w).Encode(APIResponse{
					Code:    400,
					Message: "appId is required",
				})
				return
			}

			resp := APIResponse{
				Code:    0,
				Message: "success",
				Data: SliderCaptchaResult{
					ID:            "slider-123",
					BackgroundB64: "bg-base64",
					SliderB64:     "slider-base64",
					TargetX:       150,
					TargetY:       75,
				},
			}
			json.NewEncoder(w).Encode(resp)
			return
		}

		if r.URL.Path == "/api/v1/captcha/slider/verify" {
			var body struct {
				CaptchaID string `json:"captcha_id"`
				TargetX   int    `json:"target_x"`
			}
			json.NewDecoder(r.Body).Decode(&body)

			success := body.TargetX >= 140 && body.TargetX <= 160
			resp := APIResponse{
				Code:    0,
				Message: "success",
				Data: SliderVerifyResult{
					Success: success,
					Message: func() string {
						if success {
							return "Verification successful"
						}
						return "Verification failed"
					}(),
				},
			}
			json.NewEncoder(w).Encode(resp)
			return
		}

		if r.URL.Path == "/api/v1/captcha/click" {
			if r.Header.Get("X-App-ID") == "" {
				w.WriteHeader(http.StatusBadRequest)
				json.NewEncoder(w).Encode(APIResponse{
					Code:    400,
					Message: "appId is required",
				})
				return
			}

			resp := APIResponse{
				Code:    0,
				Message: "success",
				Data: ClickCaptchaResult{
					ID:          "click-123",
					Image:       "image-base64",
					TargetChars: []string{"A", "B", "C"},
					CharPositions: []CharPosition{
						{Char: "A", X: 100, Y: 100},
						{Char: "B", X: 200, Y: 200},
						{Char: "C", X: 300, Y: 300},
					},
				},
			}
			json.NewEncoder(w).Encode(resp)
			return
		}

		if r.URL.Path == "/api/v1/captcha/click/verify" {
			var body struct {
				CaptchaID string         `json:"captcha_id"`
				Clicks    []CharPosition `json:"clicks"`
			}
			json.NewDecoder(r.Body).Decode(&body)

			resp := APIResponse{
				Code:    0,
				Message: "success",
				Data: ClickVerifyResult{
					Success: len(body.Clicks) >= 3,
					Score:   0.95,
					Message: "Verification successful",
				},
			}
			json.NewEncoder(w).Encode(resp)
			return
		}

		if r.URL.Path == "/api/v1/captcha/puzzle" {
			if r.Header.Get("X-App-ID") == "" {
				w.WriteHeader(http.StatusBadRequest)
				json.NewEncoder(w).Encode(APIResponse{
					Code:    400,
					Message: "appId is required",
				})
				return
			}

			resp := APIResponse{
				Code:    0,
				Message: "success",
				Data: PuzzleCaptchaResult{
					ID:            "puzzle-123",
					BackgroundB64: "bg-base64",
					PuzzleB64:     "puzzle-base64",
					TargetX:       200,
					TargetY:       100,
				},
			}
			json.NewEncoder(w).Encode(resp)
			return
		}

		if r.URL.Path == "/api/v1/captcha/puzzle/verify" {
			resp := APIResponse{
				Code:    0,
				Message: "success",
				Data: PuzzleVerifyResult{
					Success: true,
					Message: "Verification successful",
				},
			}
			json.NewEncoder(w).Encode(resp)
			return
		}

		if r.URL.Path == "/api/v1/captcha/batch/verify" {
			var body struct {
				Items []BatchVerifyItem `json:"items"`
			}
			json.NewDecoder(r.Body).Decode(&body)

			results := make([]BatchVerifyResult, len(body.Items))
			for i, item := range body.Items {
				results[i] = BatchVerifyResult{
					CaptchaID: item.CaptchaID,
					Success:   true,
					Message:   "Verification successful",
				}
			}

			resp := APIResponse{
				Code:    0,
				Message: "success",
				Data: BatchVerifyResponse{
					Results: results,
					Summary: BatchVerifySummary{
						Total:   len(body.Items),
						Success: len(body.Items),
						Failed:  0,
						Skipped: 0,
					},
				},
			}
			json.NewEncoder(w).Encode(resp)
			return
		}

		if r.URL.Path == "/api/v1/captcha/scenarios" {
			if r.Method == http.MethodGet {
				resp := APIResponse{
					Code:    0,
					Message: "success",
					Data: ScenarioListResponse{
						Scenarios: []Scenario{
							{ID: "1", Name: "Scenario 1"},
							{ID: "2", Name: "Scenario 2"},
						},
						Total: 2,
					},
				}
				json.NewEncoder(w).Encode(resp)
				return
			}

			if r.Method == http.MethodPost {
				resp := APIResponse{
					Code:    0,
					Message: "success",
					Data: Scenario{
						ID:          "new-scenario",
						Name:        "New Scenario",
						Description: "Created via test",
						Difficulty:  "medium",
					},
				}
				json.NewEncoder(w).Encode(resp)
				return
			}
		}

		if strings.HasPrefix(r.URL.Path, "/api/v1/captcha/scenarios/") {
			scenarioID := strings.TrimPrefix(r.URL.Path, "/api/v1/captcha/scenarios/")

			if r.Method == http.MethodGet {
				resp := APIResponse{
					Code:    0,
					Message: "success",
					Data: Scenario{
						ID:          scenarioID,
						Name:        "Scenario " + scenarioID,
						Description: "Test scenario",
					},
				}
				json.NewEncoder(w).Encode(resp)
				return
			}

			if r.Method == http.MethodPut {
				resp := APIResponse{
					Code:    0,
					Message: "success",
					Data: Scenario{
						ID:          scenarioID,
						Name:        "Updated Scenario",
						Description: "Updated via test",
					},
				}
				json.NewEncoder(w).Encode(resp)
				return
			}

			if r.Method == http.MethodDelete {
				resp := APIResponse{
					Code:    0,
					Message: "success",
					Data:    DeleteResponse{Deleted: true},
				}
				json.NewEncoder(w).Encode(resp)
				return
			}
		}

		if r.URL.Path == "/api/v1/captcha/webhook/register" {
			resp := APIResponse{
				Code:    0,
				Message: "success",
				Data: Webhook{
					ID:     "webhook-new",
					AppID:  "app-123",
					URL:    "https://example.com/webhook",
					Secret: "secret123",
					Events: []string{"verify.success"},
				},
			}
			json.NewEncoder(w).Encode(resp)
			return
		}

		if r.URL.Path == "/api/v1/captcha/webhook" {
			resp := APIResponse{
				Code:    0,
				Message: "success",
				Data: WebhookListResponse{
					Webhooks: []Webhook{
						{ID: "1", URL: "https://example.com/1"},
						{ID: "2", URL: "https://example.com/2"},
					},
					Total: 2,
				},
			}
			json.NewEncoder(w).Encode(resp)
			return
		}

		if strings.HasPrefix(r.URL.Path, "/api/v1/captcha/webhook/") && r.Method == http.MethodPut {
			webhookID := strings.TrimPrefix(r.URL.Path, "/api/v1/captcha/webhook/")
			resp := APIResponse{
				Code:    0,
				Message: "success",
				Data: Webhook{
					ID:    webhookID,
					URL:   "https://example.com/updated",
					AppID: "app-123",
				},
			}
			json.NewEncoder(w).Encode(resp)
			return
		}

		if strings.HasPrefix(r.URL.Path, "/api/v1/captcha/webhook/") && r.Method == http.MethodDelete {
			resp := APIResponse{
				Code:    0,
				Message: "success",
				Data:    DeleteResponse{Deleted: true},
			}
			json.NewEncoder(w).Encode(resp)
			return
		}

		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(APIResponse{
			Code:    404,
			Message: "endpoint not found",
		})
	}))

	client, err := NewClient(NewConfig(server.URL).WithAppID("test-app"))
	if err != nil {
		server.Close()
		t.Fatalf("failed to create client: %v", err)
	}

	return server, client
}

func TestHealthCheck(t *testing.T) {
	server, client := setupTestServer(t)
	defer server.Close()

	ctx := context.Background()
	health, err := client.HealthCheck(ctx)
	require.NoError(t, err)
	require.NotNil(t, health)

	assert.Equal(t, "healthy", health.Status)
	assert.Equal(t, "captchax-api", health.Service)
	assert.NotEmpty(t, health.Version)
}

func TestGenerateSliderCaptcha(t *testing.T) {
	server, client := setupTestServer(t)
	defer server.Close()

	ctx := context.Background()
	result, err := client.GenerateSliderCaptcha(ctx, nil)
	require.NoError(t, err)
	require.NotNil(t, result)

	assert.Equal(t, "slider-123", result.ID)
	assert.NotEmpty(t, result.BackgroundB64)
	assert.NotEmpty(t, result.SliderB64)
	assert.Equal(t, 150, result.TargetX)
	assert.Equal(t, 75, result.TargetY)
}

func TestGenerateSliderCaptchaWithOptions(t *testing.T) {
	server, client := setupTestServer(t)
	defer server.Close()

	ctx := context.Background()
	width := 400
	height := 300
	opts := &SliderGenerateOptions{
		Width:      &width,
		Height:     &height,
		ClientInfo: "test-info",
		ScenarioID: "test-scenario",
	}

	result, err := client.GenerateSliderCaptcha(ctx, opts)
	require.NoError(t, err)
	assert.NotNil(t, result)
}

func TestGenerateSliderCaptchaWithoutAppID(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(APIResponse{
			Code:    400,
			Message: "appId is required",
		})
	}))
	defer server.Close()

	client, err := NewClient(NewConfig(server.URL))
	require.NoError(t, err)

	ctx := context.Background()
	result, err := client.GenerateSliderCaptcha(ctx, nil)
	assert.Error(t, err)
	assert.Nil(t, result)
}

func TestVerifySliderCaptcha(t *testing.T) {
	server, client := setupTestServer(t)
	defer server.Close()

	ctx := context.Background()
	targetY := 80
	result, err := client.VerifySliderCaptcha(ctx, "slider-123", 150, &targetY)
	require.NoError(t, err)
	require.NotNil(t, result)

	assert.True(t, result.Success)
	assert.Equal(t, "Verification successful", result.Message)
}

func TestVerifySliderCaptchaFailure(t *testing.T) {
	server, client := setupTestServer(t)
	defer server.Close()

	ctx := context.Background()
	result, err := client.VerifySliderCaptcha(ctx, "slider-123", 50, nil)
	require.NoError(t, err)
	require.NotNil(t, result)

	assert.False(t, result.Success)
}

func TestGenerateClickCaptcha(t *testing.T) {
	server, client := setupTestServer(t)
	defer server.Close()

	ctx := context.Background()
	result, err := client.GenerateClickCaptcha(ctx, nil)
	require.NoError(t, err)
	require.NotNil(t, result)

	assert.Equal(t, "click-123", result.ID)
	assert.NotEmpty(t, result.Image)
	assert.Len(t, result.TargetChars, 3)
	assert.Len(t, result.CharPositions, 3)
}

func TestGenerateClickCaptchaWithOptions(t *testing.T) {
	server, client := setupTestServer(t)
	defer server.Close()

	ctx := context.Background()
	charCount := 4
	opts := &ClickGenerateOptions{
		CharCount:  &charCount,
		ClientInfo: "test-info",
		ScenarioID: "test-scenario",
	}

	result, err := client.GenerateClickCaptcha(ctx, opts)
	require.NoError(t, err)
	assert.NotNil(t, result)
}

func TestVerifyClickCaptcha(t *testing.T) {
	server, client := setupTestServer(t)
	defer server.Close()

	ctx := context.Background()
	clicks := []CharPosition{
		{Char: "A", X: 100, Y: 100},
		{Char: "B", X: 200, Y: 200},
		{Char: "C", X: 300, Y: 300},
	}

	result, err := client.VerifyClickCaptcha(ctx, "click-123", clicks)
	require.NoError(t, err)
	require.NotNil(t, result)

	assert.True(t, result.Success)
	assert.Equal(t, 0.95, result.Score)
}

func TestGeneratePuzzleCaptcha(t *testing.T) {
	server, client := setupTestServer(t)
	defer server.Close()

	ctx := context.Background()
	result, err := client.GeneratePuzzleCaptcha(ctx, nil)
	require.NoError(t, err)
	require.NotNil(t, result)

	assert.Equal(t, "puzzle-123", result.ID)
	assert.NotEmpty(t, result.BackgroundB64)
	assert.NotEmpty(t, result.PuzzleB64)
	assert.Equal(t, 200, result.TargetX)
	assert.Equal(t, 100, result.TargetY)
}

func TestVerifyPuzzleCaptcha(t *testing.T) {
	server, client := setupTestServer(t)
	defer server.Close()

	ctx := context.Background()
	targetY := 120
	result, err := client.VerifyPuzzleCaptcha(ctx, "puzzle-123", 200, &targetY)
	require.NoError(t, err)
	require.NotNil(t, result)

	assert.True(t, result.Success)
	assert.Equal(t, "Verification successful", result.Message)
}

func TestBatchVerify(t *testing.T) {
	server, client := setupTestServer(t)
	defer server.Close()

	ctx := context.Background()
	items := []BatchVerifyItem{
		{CaptchaID: "captcha-1", Type: "slider", TargetX: 100},
		{CaptchaID: "captcha-2", Type: "click", TargetX: 200},
	}

	result, err := client.BatchVerify(ctx, items, "dedup-123")
	require.NoError(t, err)
	require.NotNil(t, result)

	assert.Len(t, result.Results, 2)
	assert.Equal(t, 2, result.Summary.Total)
	assert.Equal(t, 2, result.Summary.Success)
}

func TestListScenarios(t *testing.T) {
	server, client := setupTestServer(t)
	defer server.Close()

	ctx := context.Background()
	result, err := client.ListScenarios(ctx)
	require.NoError(t, err)
	require.NotNil(t, result)

	assert.Len(t, result.Scenarios, 2)
	assert.Equal(t, 2, result.Total)
}

func TestCreateScenario(t *testing.T) {
	server, client := setupTestServer(t)
	defer server.Close()

	ctx := context.Background()
	scenario := &Scenario{
		Name:        "New Scenario",
		Description: "Test scenario",
		Difficulty:  "medium",
	}

	result, err := client.CreateScenario(ctx, scenario)
	require.NoError(t, err)
	require.NotNil(t, result)

	assert.Equal(t, "new-scenario", result.ID)
	assert.Equal(t, "New Scenario", result.Name)
}

func TestGetScenario(t *testing.T) {
	server, client := setupTestServer(t)
	defer server.Close()

	ctx := context.Background()
	result, err := client.GetScenario(ctx, "scenario-123")
	require.NoError(t, err)
	require.NotNil(t, result)

	assert.Equal(t, "scenario-123", result.ID)
}

func TestUpdateScenario(t *testing.T) {
	server, client := setupTestServer(t)
	defer server.Close()

	ctx := context.Background()
	updates := map[string]interface{}{
		"name":        "Updated Scenario",
		"description": "Updated description",
	}

	result, err := client.UpdateScenario(ctx, "scenario-123", updates)
	require.NoError(t, err)
	require.NotNil(t, result)

	assert.Equal(t, "scenario-123", result.ID)
	assert.Equal(t, "Updated Scenario", result.Name)
}

func TestDeleteScenario(t *testing.T) {
	server, client := setupTestServer(t)
	defer server.Close()

	ctx := context.Background()
	result, err := client.DeleteScenario(ctx, "scenario-123")
	require.NoError(t, err)
	require.NotNil(t, result)

	assert.True(t, result.Deleted)
}

func TestRegisterWebhook(t *testing.T) {
	server, client := setupTestServer(t)
	defer server.Close()

	ctx := context.Background()
	webhook := &Webhook{
		AppID:  "app-123",
		URL:    "https://example.com/webhook",
		Secret: "secret123",
		Events: []string{"verify.success"},
	}

	result, err := client.RegisterWebhook(ctx, webhook)
	require.NoError(t, err)
	require.NotNil(t, result)

	assert.Equal(t, "webhook-new", result.ID)
	assert.Equal(t, "https://example.com/webhook", result.URL)
}

func TestListWebhooks(t *testing.T) {
	server, client := setupTestServer(t)
	defer server.Close()

	ctx := context.Background()
	result, err := client.ListWebhooks(ctx, "app-123")
	require.NoError(t, err)
	require.NotNil(t, result)

	assert.Len(t, result.Webhooks, 2)
	assert.Equal(t, 2, result.Total)
}

func TestUpdateWebhook(t *testing.T) {
	server, client := setupTestServer(t)
	defer server.Close()

	ctx := context.Background()
	updates := map[string]interface{}{
		"url": "https://example.com/updated",
	}

	result, err := client.UpdateWebhook(ctx, "webhook-123", updates)
	require.NoError(t, err)
	require.NotNil(t, result)

	assert.Equal(t, "webhook-123", result.ID)
	assert.Equal(t, "https://example.com/updated", result.URL)
}

func TestUnregisterWebhook(t *testing.T) {
	server, client := setupTestServer(t)
	defer server.Close()

	ctx := context.Background()
	result, err := client.UnregisterWebhook(ctx, "webhook-123")
	require.NoError(t, err)
	require.NotNil(t, result)

	assert.True(t, result.Deleted)
}

func TestIntegrationContextCancellation(t *testing.T) {
	server, client := setupTestServer(t)
	defer server.Close()

	ctx, cancel := context.WithCancel(context.Background())
	cancel()

	_, err := client.HealthCheck(ctx)
	assert.Error(t, err)
}

func TestIntegrationTimeout(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(100 * time.Millisecond)
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(APIResponse{Code: 0, Message: "success"})
	}))
	defer server.Close()

	client, err := NewClient(NewConfig(server.URL).WithTimeout(50 * time.Millisecond))
	require.NoError(t, err)

	ctx := context.Background()
	_, err = client.HealthCheck(ctx)
	assert.Error(t, err)
}

func TestIntegrationServerError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(APIResponse{
			Code:    500,
			Message: "internal server error",
		})
	}))
	defer server.Close()

	client, err := NewClient(NewConfig(server.URL).WithRetryTimes(1))
	require.NoError(t, err)

	ctx := context.Background()
	_, err = client.HealthCheck(ctx)
	assert.Error(t, err)
}

func TestIntegrationAPIError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(APIResponse{
			Code:    400,
			Message: "invalid request",
		})
	}))
	defer server.Close()

	client, err := NewClient(NewConfig(server.URL))
	require.NoError(t, err)

	ctx := context.Background()
	_, err = client.HealthCheck(ctx)
	assert.Error(t, err)
}

func TestIntegrationConcurrentRequests(t *testing.T) {
	server, client := setupTestServer(t)
	defer server.Close()

	ctx := context.Background()
	var wg sync.WaitGroup
	successCount := int32(0)
	errorCount := int32(0)

	for i := 0; i < 10; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			_, err := client.HealthCheck(ctx)
			if err != nil {
				atomic.AddInt32(&errorCount, 1)
			} else {
				atomic.AddInt32(&successCount, 1)
			}
		}()
	}

	wg.Wait()

	assert.Equal(t, int32(10), successCount)
	assert.Equal(t, int32(0), errorCount)
}

func TestIntegrationConcurrentCaptchaGeneration(t *testing.T) {
	server, client := setupTestServer(t)
	defer server.Close()

	ctx := context.Background()
	var wg sync.WaitGroup
	successCount := int32(0)

	for i := 0; i < 5; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			result, err := client.GenerateSliderCaptcha(ctx, nil)
			if err == nil && result != nil {
				atomic.AddInt32(&successCount, 1)
			}
		}()
	}

	wg.Wait()
	assert.Equal(t, int32(5), successCount)
}

func TestIntegrationDeduplicationID(t *testing.T) {
	server, client := setupTestServer(t)
	defer server.Close()

	ctx := context.Background()
	items := []BatchVerifyItem{
		{CaptchaID: "captcha-1", Type: "slider", TargetX: 100},
	}

	_, err := client.BatchVerify(ctx, items, "unique-dedup-id")
	require.NoError(t, err)
}

func TestIntegrationWebhookWithHeaders(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		if r.Header.Get("X-Custom-Header") == "custom-value" {
			json.NewEncoder(w).Encode(APIResponse{
				Code:    0,
				Message: "success",
				Data: Webhook{
					ID:     "webhook-new",
					AppID:  "app-123",
					URL:    "https://example.com/webhook",
					Secret: "secret123",
					Events: []string{"verify.success"},
				},
			})
			return
		}
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(APIResponse{
			Code:    400,
			Message: "missing header",
		})
	}))
	defer server.Close()

	client, err := NewClient(NewConfig(server.URL).WithAppID("test-app"))
	require.NoError(t, err)
	client.httpClient.setHeader("X-Custom-Header", "custom-value")

	ctx := context.Background()
	webhook := &Webhook{
		AppID:  "app-123",
		URL:    "https://example.com/webhook",
		Events: []string{"verify.success"},
	}

	result, err := client.RegisterWebhook(ctx, webhook)
	require.NoError(t, err)
	assert.NotNil(t, result)
}

func TestIntegrationQueryParameters(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")

		appID := r.URL.Query().Get("app_id")
		if appID == "" {
			appID = "default"
		}

		resp := APIResponse{
			Code:    0,
			Message: "success",
			Data: WebhookListResponse{
				Webhooks: []Webhook{
					{ID: "1", AppID: appID, URL: "https://example.com/1"},
				},
				Total: 1,
			},
		}
		json.NewEncoder(w).Encode(resp)
	}))
	defer server.Close()

	client, err := NewClient(NewConfig(server.URL))
	require.NoError(t, err)

	ctx := context.Background()
	result, err := client.ListWebhooks(ctx, "custom-app-id")
	require.NoError(t, err)
	assert.Len(t, result.Webhooks, 1)
	assert.Equal(t, "custom-app-id", result.Webhooks[0].AppID)
}

func TestParseAPIResponse(t *testing.T) {
	server, client := setupTestServer(t)
	defer server.Close()

	ctx := context.Background()
	_, err := client.HealthCheck(ctx)
	require.NoError(t, err)
}

func TestHTTPClientMethods(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")

		switch r.Method {
		case http.MethodGet:
			fmt.Fprint(w, `{"code":0,"message":"success","data":{"status":"ok"}}`)
		case http.MethodPost:
			fmt.Fprint(w, `{"code":0,"message":"success","data":{"id":"new"}}`)
		case http.MethodPut:
			fmt.Fprint(w, `{"code":0,"message":"success","data":{"updated":true}}`)
		case http.MethodDelete:
			fmt.Fprint(w, `{"code":0,"message":"success","data":{"deleted":true}}`)
		}
	}))
	defer server.Close()

	httpClient := newHTTPClient(server.URL, 10*time.Second, 0)

	ctx := context.Background()
	_, err := httpClient.get(ctx, "/test")
	if err != nil {
		t.Errorf("unexpected error: %v", err)
	}

	_, err = httpClient.post(ctx, "/test", map[string]string{"key": "value"}, "")
	if err != nil {
		t.Errorf("unexpected error: %v", err)
	}

	_, err = httpClient.put(ctx, "/test", map[string]string{"key": "value"})
	if err != nil {
		t.Errorf("unexpected error: %v", err)
	}

	_, err = httpClient.delete(ctx, "/test")
	if err != nil {
		t.Errorf("unexpected error: %v", err)
	}
}

func TestHTTPClientParseResponse(t *testing.T) {
	httpClient := newHTTPClient("https://test.example.com", 10*time.Second, 0)

	body := []byte(`{"code":0,"message":"success","data":{"key":"value"}}`)
	var result APIResponse
	err := httpClient.parseResponse(body, &result)
	if err != nil {
		t.Errorf("unexpected error: %v", err)
	}
	if result.Code != 0 {
		t.Errorf("expected code 0, got %d", result.Code)
	}
	if result.Message != "success" {
		t.Errorf("expected message 'success', got '%s'", result.Message)
	}
}

func TestHTTPClientParseResponseError(t *testing.T) {
	httpClient := newHTTPClient("https://test.example.com", 10*time.Second, 0)

	body := []byte(`{"code":400,"message":"error","data":null}`)
	var result map[string]string
	err := httpClient.parseResponse(body, &result)
	assert.Error(t, err)
}
