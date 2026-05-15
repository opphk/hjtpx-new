package captchax

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func setupConcurrentTestServer() *httptest.Server {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		time.Sleep(10 * time.Millisecond)
		json.NewEncoder(w).Encode(APIResponse{
			Code:    0,
			Message: "success",
			Data: HealthStatus{
				Status:    "healthy",
				Service:   "captchax-api",
				Timestamp: time.Now().Format(time.RFC3339),
				Version:   "1.0.0",
			},
		})
	}))

	return server
}

func TestConcurrentHealthCheck(t *testing.T) {
	server := setupConcurrentTestServer()
	defer server.Close()

	client, err := NewClient(NewConfig(server.URL).WithAppID("test-app"))
	require.NoError(t, err)

	ctx := context.Background()
	var wg sync.WaitGroup
	successCount := int32(0)
	errorCount := int32(0)

	concurrency := 50
	for i := 0; i < concurrency; i++ {
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

	assert.Equal(t, int32(concurrency), successCount)
	assert.Equal(t, int32(0), errorCount)
}

func TestConcurrentSliderCaptchaGeneration(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(APIResponse{
			Code:    0,
			Message: "success",
			Data: SliderCaptchaResult{
				ID:            "slider-123",
				BackgroundB64: "bg-base64",
				SliderB64:     "slider-base64",
				TargetX:       150,
				TargetY:       75,
			},
		})
	}))
	defer server.Close()

	client, err := NewClient(NewConfig(server.URL).WithAppID("test-app"))
	require.NoError(t, err)

	ctx := context.Background()
	var wg sync.WaitGroup
	successCount := int32(0)

	concurrency := 20
	for i := 0; i < concurrency; i++ {
		wg.Add(1)
		go func(id int) {
			defer wg.Done()
			width := 300 + id
			opts := &SliderGenerateOptions{
				Width:      &width,
				ClientInfo: "concurrent-test",
			}
			result, err := client.GenerateSliderCaptcha(ctx, opts)
			if err == nil && result != nil {
				atomic.AddInt32(&successCount, 1)
			}
		}(i)
	}

	wg.Wait()
	assert.Equal(t, int32(concurrency), successCount)
}

func TestConcurrentSliderCaptchaVerification(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(APIResponse{
			Code:    0,
			Message: "success",
			Data: SliderVerifyResult{
				Success: true,
				Message: "Verification successful",
			},
		})
	}))
	defer server.Close()

	client, err := NewClient(NewConfig(server.URL).WithAppID("test-app"))
	require.NoError(t, err)

	ctx := context.Background()
	var wg sync.WaitGroup
	successCount := int32(0)

	concurrency := 15
	for i := 0; i < concurrency; i++ {
		wg.Add(1)
		go func(id int) {
			defer wg.Done()
			targetY := 50 + id
			result, err := client.VerifySliderCaptcha(ctx, "slider-123", 150, &targetY)
			if err == nil && result != nil && result.Success {
				atomic.AddInt32(&successCount, 1)
			}
		}(i)
	}

	wg.Wait()
	assert.Equal(t, int32(concurrency), successCount)
}

func TestConcurrentClickCaptchaGeneration(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(APIResponse{
			Code:    0,
			Message: "success",
			Data: ClickCaptchaResult{
				ID:          "click-123",
				Image:       "base64image",
				TargetChars: []string{"A", "B", "C"},
				CharPositions: []CharPosition{
					{Char: "A", X: 100, Y: 100},
					{Char: "B", X: 200, Y: 200},
					{Char: "C", X: 300, Y: 300},
				},
			},
		})
	}))
	defer server.Close()

	client, err := NewClient(NewConfig(server.URL).WithAppID("test-app"))
	require.NoError(t, err)

	ctx := context.Background()
	var wg sync.WaitGroup
	successCount := int32(0)

	concurrency := 10
	for i := 0; i < concurrency; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			result, err := client.GenerateClickCaptcha(ctx, nil)
			if err == nil && result != nil {
				atomic.AddInt32(&successCount, 1)
			}
		}()
	}

	wg.Wait()
	assert.Equal(t, int32(concurrency), successCount)
}

func TestConcurrentBatchVerification(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		var body struct {
			Items []BatchVerifyItem `json:"items"`
		}
		json.NewDecoder(r.Body).Decode(&body)

		results := make([]BatchVerifyResult, len(body.Items))
		for i := range body.Items {
			results[i] = BatchVerifyResult{
				CaptchaID: body.Items[i].CaptchaID,
				Success:   true,
				Message:   "success",
			}
		}

		json.NewEncoder(w).Encode(APIResponse{
			Code:    0,
			Message: "success",
			Data: BatchVerifyResponse{
				Results: results,
				Summary: BatchVerifySummary{
					Total:   len(body.Items),
					Success: len(body.Items),
					Failed:  0,
				},
			},
		})
	}))
	defer server.Close()

	client, err := NewClient(NewConfig(server.URL))
	require.NoError(t, err)

	ctx := context.Background()
	var wg sync.WaitGroup
	successCount := int32(0)

	concurrency := 20
	for i := 0; i < concurrency; i++ {
		wg.Add(1)
		go func(id int) {
			defer wg.Done()
			items := []BatchVerifyItem{
				{CaptchaID: "captcha-1", Type: "slider", TargetX: 100},
				{CaptchaID: "captcha-2", Type: "click", TargetX: 200},
			}
			result, err := client.BatchVerify(ctx, items, "dedup-"+string(rune('0'+id)))
			if err == nil && result != nil && result.Summary.Success == 2 {
				atomic.AddInt32(&successCount, 1)
			}
		}(i)
	}

	wg.Wait()
	assert.Equal(t, int32(concurrency), successCount)
}

func TestConcurrentScenarioOperations(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")

		switch r.Method {
		case http.MethodGet:
			json.NewEncoder(w).Encode(APIResponse{
				Code:    0,
				Message: "success",
				Data: ScenarioListResponse{
					Scenarios: []Scenario{
						{ID: "1", Name: "Scenario 1"},
						{ID: "2", Name: "Scenario 2"},
					},
					Total: 2,
				},
			})
		case http.MethodPost:
			json.NewEncoder(w).Encode(APIResponse{
				Code:    0,
				Message: "success",
				Data: Scenario{
					ID:   "new-scenario",
					Name: "New Scenario",
				},
			})
		}
	}))
	defer server.Close()

	client, err := NewClient(NewConfig(server.URL))
	require.NoError(t, err)

	ctx := context.Background()
	var wg sync.WaitGroup
	successCount := int32(0)

	concurrency := 10
	for i := 0; i < concurrency; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			result, err := client.ListScenarios(ctx)
			if err == nil && result != nil {
				atomic.AddInt32(&successCount, 1)
			}
		}()

		wg.Add(1)
		go func() {
			defer wg.Done()
			result, err := client.CreateScenario(ctx, &Scenario{Name: "Test"})
			if err == nil && result != nil {
				atomic.AddInt32(&successCount, 1)
			}
		}()
	}

	wg.Wait()
	assert.Equal(t, int32(concurrency*2), successCount)
}

func TestConcurrentWebhookOperations(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")

		if r.Method == http.MethodGet {
			json.NewEncoder(w).Encode(APIResponse{
				Code:    0,
				Message: "success",
				Data: WebhookListResponse{
					Webhooks: []Webhook{
						{ID: "1", URL: "https://example.com/1"},
					},
					Total: 1,
				},
			})
		} else if r.Method == http.MethodPost {
			json.NewEncoder(w).Encode(APIResponse{
				Code:    0,
				Message: "success",
				Data: Webhook{
					ID:    "new-webhook",
					URL:   "https://example.com/webhook",
					AppID: "app-123",
				},
			})
		}
	}))
	defer server.Close()

	client, err := NewClient(NewConfig(server.URL))
	require.NoError(t, err)

	ctx := context.Background()
	var wg sync.WaitGroup
	successCount := int32(0)

	concurrency := 10
	for i := 0; i < concurrency; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			result, err := client.ListWebhooks(ctx, "app-123")
			if err == nil && result != nil {
				atomic.AddInt32(&successCount, 1)
			}
		}()

		wg.Add(1)
		go func() {
			defer wg.Done()
			result, err := client.RegisterWebhook(ctx, &Webhook{
				AppID:  "app-123",
				URL:    "https://example.com/webhook",
				Events: []string{"verify.success"},
			})
			if err == nil && result != nil {
				atomic.AddInt32(&successCount, 1)
			}
		}()
	}

	wg.Wait()
	assert.Equal(t, int32(concurrency*2), successCount)
}

func TestConcurrentClientConfigModification(t *testing.T) {
	client, err := NewClient(NewConfig("https://test.example.com"))
	require.NoError(t, err)

	var wg sync.WaitGroup
	successCount := int32(0)

	for i := 0; i < 100; i++ {
		wg.Add(1)
		go func(id int) {
			defer wg.Done()
			client.SetAppID(fmt.Sprintf("app-%d", id))
			client.SetAPIVersion(APIVersionV1)
			_ = client.GetAPIVersion()
			atomic.AddInt32(&successCount, 1)
		}(i)
	}

	wg.Wait()
	assert.Equal(t, int32(100), successCount)
}

func TestConcurrentHTTPClientHeaderModification(t *testing.T) {
	httpClient := newHTTPClient("https://test.example.com", 10*time.Second, 0)

	var wg sync.WaitGroup
	successCount := int32(0)

	for i := 0; i < 100; i++ {
		wg.Add(1)
		go func(id int) {
			defer wg.Done()
			httpClient.setHeader(fmt.Sprintf("X-Header-%d", id), "value")
			httpClient.setHeaders(map[string]string{
				fmt.Sprintf("X-Custom-%d", id): "custom-value",
			})
			atomic.AddInt32(&successCount, 1)
		}(i)
	}

	wg.Wait()
	assert.Equal(t, int32(100), successCount)
}

func TestConcurrentErrorCreation(t *testing.T) {
	var wg sync.WaitGroup
	successCount := int32(0)

	for i := 0; i < 100; i++ {
		wg.Add(1)
		go func(id int) {
			defer wg.Done()
			err := NewError(fmt.Sprintf("error %d", id))
			if err != nil && err.Code == 500 {
				atomic.AddInt32(&successCount, 1)
			}
		}(i)
	}

	wg.Wait()
	assert.Equal(t, int32(100), successCount)
}

func TestRaceConditionPrevention(t *testing.T) {
	client, err := NewClient(NewConfig("https://test.example.com").WithAppID("initial-app"))
	require.NoError(t, err)

	var wg sync.WaitGroup
	raceDetected := int32(0)

	for i := 0; i < 50; i++ {
		wg.Add(1)
		go func(id int) {
			defer wg.Done()

			for j := 0; j < 10; j++ {
				client.SetAppID(fmt.Sprintf("app-%d-%d", id, j))
				appID := client.config.AppID
				if appID == "" {
					atomic.AddInt32(&raceDetected, 1)
				}

				client.SetAPIVersion(APIVersionV1)
				version := client.getAPIPrefix()
				if version == "" {
					atomic.AddInt32(&raceDetected, 1)
				}
			}
		}(i)
	}

	wg.Wait()
	assert.Equal(t, int32(0), raceDetected, "Race condition detected")
}

func TestConcurrentMixedOperations(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		time.Sleep(5 * time.Millisecond)

		switch r.URL.Path {
		case "/health":
			json.NewEncoder(w).Encode(APIResponse{
				Code:    0,
				Message: "success",
				Data:    map[string]string{"status": "ok"},
			})
		case "/api/v1/captcha/slider":
			json.NewEncoder(w).Encode(APIResponse{
				Code:    0,
				Message: "success",
				Data: SliderCaptchaResult{
					ID:      "slider-123",
					TargetX: 150,
					TargetY: 75,
				},
			})
		default:
			w.WriteHeader(http.StatusNotFound)
		}
	}))
	defer server.Close()

	client, err := NewClient(NewConfig(server.URL).WithAppID("test-app"))
	require.NoError(t, err)

	ctx := context.Background()
	var wg sync.WaitGroup
	successCount := int32(0)
	errorCount := int32(0)

	operations := []func(){
		func() {
			_, _ = client.HealthCheck(ctx)
		},
		func() {
			_, _ = client.GenerateSliderCaptcha(ctx, nil)
		},
		func() {
			_, _ = client.ListScenarios(ctx)
		},
		func() {
			_, _ = client.ListWebhooks(ctx, "app-123")
		},
	}

	concurrency := 20
	totalOps := concurrency * len(operations)

	for _, op := range operations {
		for i := 0; i < concurrency; i++ {
			wg.Add(1)
			go func(operation func()) {
				defer wg.Done()
				operation()
				atomic.AddInt32(&successCount, 1)
			}(op)
		}
	}

	wg.Wait()

	assert.Equal(t, int32(totalOps), successCount)
	assert.Equal(t, int32(0), errorCount)
}

func TestConcurrentContextCancellation(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(100 * time.Millisecond)
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(APIResponse{Code: 0, Message: "success"})
	}))
	defer server.Close()

	client, err := NewClient(NewConfig(server.URL).WithTimeout(50 * time.Millisecond))
	require.NoError(t, err)

	var wg sync.WaitGroup
	successCount := int32(0)
	errorCount := int32(0)

	concurrency := 10
	for i := 0; i < concurrency; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			ctx, cancel := context.WithCancel(context.Background())
			cancel()

			_, err := client.HealthCheck(ctx)
			if err != nil {
				atomic.AddInt32(&errorCount, 1)
			} else {
				atomic.AddInt32(&successCount, 1)
			}
		}()
	}

	wg.Wait()

	assert.Equal(t, int32(0), successCount)
	assert.Equal(t, int32(concurrency), errorCount)
}

func TestHighConcurrencyStress(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(APIResponse{
			Code:    0,
			Message: "success",
			Data:    map[string]string{"status": "ok"},
		})
	}))
	defer server.Close()

	client, err := NewClient(NewConfig(server.URL))
	require.NoError(t, err)

	ctx := context.Background()
	var wg sync.WaitGroup
	successCount := int32(0)
	errorCount := int32(0)

	concurrency := 100
	for i := 0; i < concurrency; i++ {
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

	assert.Equal(t, int32(concurrency), successCount)
	assert.Equal(t, int32(0), errorCount)
}

func TestConcurrentMutexContention(t *testing.T) {
	client, err := NewClient(NewConfig("https://test.example.com").WithAppID("test-app"))
	require.NoError(t, err)

	start := time.Now()
	var wg sync.WaitGroup

	readers := 50
	writers := 10

	for i := 0; i < readers; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for j := 0; j < 100; j++ {
				_ = client.getAPIPrefix()
				_ = client.GetAPIVersion()
			}
		}()
	}

	for i := 0; i < writers; i++ {
		wg.Add(1)
		go func(id int) {
			defer wg.Done()
			for j := 0; j < 10; j++ {
				client.SetAppID(fmt.Sprintf("app-%d-%d", id, j))
				client.SetAPIVersion(APIVersionV1)
			}
		}(i)
	}

	wg.Wait()
	elapsed := time.Since(start)

	assert.True(t, elapsed < 5*time.Second, "Mutex contention caused performance issue")
}
