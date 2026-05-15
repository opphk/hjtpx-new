package captchax

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

func BenchmarkNewClient(b *testing.B) {
	for i := 0; i < b.N; i++ {
		client, err := NewClient(NewConfig("https://captchax.example.com"))
		if err != nil {
			b.Fatalf("failed to create client: %v", err)
		}
		if client == nil {
			b.Fatal("client is nil")
		}
	}
}

func BenchmarkNewClientWithAllOptions(b *testing.B) {
	for i := 0; i < b.N; i++ {
		config := NewConfig("https://captchax.example.com").
			WithAppID("test-app").
			WithTimeout(30 * time.Second).
			WithRetryTimes(5).
			WithAPIVersion(APIVersionV2)

		client, err := NewClient(config)
		if err != nil {
			b.Fatalf("failed to create client: %v", err)
		}
		if client == nil {
			b.Fatal("client is nil")
		}
	}
}

func BenchmarkClientSetAppID(b *testing.B) {
	client, err := NewClient(NewConfig("https://captchax.example.com"))
	if err != nil {
		b.Fatalf("failed to create client: %v", err)
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		client.SetAppID(fmt.Sprintf("app-%d", i))
	}
}

func BenchmarkClientSetAPIVersion(b *testing.B) {
	client, err := NewClient(NewConfig("https://captchax.example.com"))
	if err != nil {
		b.Fatalf("failed to create client: %v", err)
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		if i%2 == 0 {
			client.SetAPIVersion(APIVersionV1)
		} else {
			client.SetAPIVersion(APIVersionV2)
		}
	}
}

func BenchmarkClientGetAPIVersion(b *testing.B) {
	client, err := NewClient(NewConfig("https://captchax.example.com"))
	if err != nil {
		b.Fatalf("failed to create client: %v", err)
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = client.GetAPIVersion()
	}
}

func BenchmarkClientCreateClientInfo(b *testing.B) {
	client, err := NewClient(NewConfig("https://captchax.example.com"))
	if err != nil {
		b.Fatalf("failed to create client: %v", err)
	}

	extra := map[string]interface{}{
		"user_id":  "12345",
		"session":  "abc123",
		"platform": "web",
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = client.CreateClientInfo(extra)
	}
}

func BenchmarkCreateClientInfoNoExtra(b *testing.B) {
	client, err := NewClient(NewConfig("https://captchax.example.com"))
	if err != nil {
		b.Fatalf("failed to create client: %v", err)
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = client.CreateClientInfo(nil)
	}
}

func BenchmarkHTTPClientRequest(b *testing.B) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(APIResponse{
			Code:    0,
			Message: "success",
			Data:    map[string]string{"key": "value"},
		})
	}))
	defer server.Close()

	httpClient := newHTTPClient(server.URL, 10*time.Second, 0)
	ctx := context.Background()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := httpClient.get(ctx, "/test")
		if err != nil {
			b.Fatalf("request failed: %v", err)
		}
	}
}

func BenchmarkHTTPClientPost(b *testing.B) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		var body map[string]interface{}
		json.NewDecoder(r.Body).Decode(&body)
		json.NewEncoder(w).Encode(APIResponse{
			Code:    0,
			Message: "success",
			Data:    body,
		})
	}))
	defer server.Close()

	httpClient := newHTTPClient(server.URL, 10*time.Second, 0)
	ctx := context.Background()
	body := map[string]interface{}{
		"app_id":    "test-app",
		"client_info": "test-info",
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := httpClient.post(ctx, "/captcha/slider", body, "")
		if err != nil {
			b.Fatalf("request failed: %v", err)
		}
	}
}

func BenchmarkHTTPClientBuildURL(b *testing.B) {
	httpClient := newHTTPClient("https://test.example.com/api", 10*time.Second, 0)
	endpoints := []string{
		"/health",
		"/captcha/slider",
		"/captcha/click",
		"/captcha/puzzle",
		"/captcha/batch/verify",
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		endpoint := endpoints[i%len(endpoints)]
		_ = httpClient.buildURL(endpoint)
	}
}

func BenchmarkHTTPClientSetHeader(b *testing.B) {
	httpClient := newHTTPClient("https://test.example.com", 10*time.Second, 0)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		httpClient.setHeader("X-Custom-Header", fmt.Sprintf("value-%d", i))
	}
}

func BenchmarkJSONMarshal(b *testing.B) {
	data := map[string]interface{}{
		"app_id":     "test-app",
		"width":      300,
		"height":     150,
		"client_info": "test-info",
		"scenario_id": "scenario-1",
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := json.Marshal(data)
		if err != nil {
			b.Fatalf("marshal failed: %v", err)
		}
	}
}

func BenchmarkJSONUnmarshal(b *testing.B) {
	jsonStr := `{"code":0,"message":"success","data":{"id":"captcha-123","target_x":150,"target_y":75}}`

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		var resp APIResponse
		err := json.Unmarshal([]byte(jsonStr), &resp)
		if err != nil {
			b.Fatalf("unmarshal failed: %v", err)
		}
	}
}

func BenchmarkErrorCreation(b *testing.B) {
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		err := NewError(fmt.Sprintf("error %d", i))
		if err == nil {
			b.Fatal("expected error")
		}
	}
}

func BenchmarkErrorCreationWithCode(b *testing.B) {
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		err := NewErrorWithCode(fmt.Sprintf("error %d", i), 400, 400)
		if err == nil {
			b.Fatal("expected error")
		}
	}
}

func BenchmarkSliderCaptchaGeneration(b *testing.B) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(APIResponse{
			Code:    0,
			Message: "success",
			Data: SliderCaptchaResult{
				ID:            "slider-123",
				BackgroundB64: "base64background",
				SliderB64:     "base64slider",
				TargetX:       150,
				TargetY:       75,
			},
		})
	}))
	defer server.Close()

	client, err := NewClient(NewConfig(server.URL).WithAppID("test-app"))
	if err != nil {
		b.Fatalf("failed to create client: %v", err)
	}

	ctx := context.Background()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := client.GenerateSliderCaptcha(ctx, nil)
		if err != nil {
			b.Fatalf("generate failed: %v", err)
		}
	}
}

func BenchmarkSliderCaptchaVerification(b *testing.B) {
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
	if err != nil {
		b.Fatalf("failed to create client: %v", err)
	}

	ctx := context.Background()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		targetY := 80
		_, err := client.VerifySliderCaptcha(ctx, "slider-123", 150, &targetY)
		if err != nil {
			b.Fatalf("verify failed: %v", err)
		}
	}
}

func BenchmarkClickCaptchaGeneration(b *testing.B) {
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
	if err != nil {
		b.Fatalf("failed to create client: %v", err)
	}

	ctx := context.Background()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := client.GenerateClickCaptcha(ctx, nil)
		if err != nil {
			b.Fatalf("generate failed: %v", err)
		}
	}
}

func BenchmarkClickCaptchaVerification(b *testing.B) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(APIResponse{
			Code:    0,
			Message: "success",
			Data: ClickVerifyResult{
				Success: true,
				Score:   0.95,
				Message: "Verification successful",
			},
		})
	}))
	defer server.Close()

	client, err := NewClient(NewConfig(server.URL).WithAppID("test-app"))
	if err != nil {
		b.Fatalf("failed to create client: %v", err)
	}

	clicks := []CharPosition{
		{Char: "A", X: 100, Y: 100},
		{Char: "B", X: 200, Y: 200},
		{Char: "C", X: 300, Y: 300},
	}

	ctx := context.Background()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := client.VerifyClickCaptcha(ctx, "click-123", clicks)
		if err != nil {
			b.Fatalf("verify failed: %v", err)
		}
	}
}

func BenchmarkPuzzleCaptchaGeneration(b *testing.B) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(APIResponse{
			Code:    0,
			Message: "success",
			Data: PuzzleCaptchaResult{
				ID:            "puzzle-123",
				BackgroundB64: "base64bg",
				PuzzleB64:     "base64puzzle",
				TargetX:       200,
				TargetY:       100,
			},
		})
	}))
	defer server.Close()

	client, err := NewClient(NewConfig(server.URL).WithAppID("test-app"))
	if err != nil {
		b.Fatalf("failed to create client: %v", err)
	}

	ctx := context.Background()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := client.GeneratePuzzleCaptcha(ctx, nil)
		if err != nil {
			b.Fatalf("generate failed: %v", err)
		}
	}
}

func BenchmarkBatchVerification(b *testing.B) {
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
	if err != nil {
		b.Fatalf("failed to create client: %v", err)
	}

	items := []BatchVerifyItem{
		{CaptchaID: "captcha-1", Type: "slider", TargetX: 100},
		{CaptchaID: "captcha-2", Type: "click", TargetX: 200},
		{CaptchaID: "captcha-3", Type: "puzzle", TargetX: 300},
	}

	ctx := context.Background()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := client.BatchVerify(ctx, items, fmt.Sprintf("dedup-%d", i))
		if err != nil {
			b.Fatalf("batch verify failed: %v", err)
		}
	}
}

func BenchmarkConcurrentRequests(b *testing.B) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		time.Sleep(10 * time.Millisecond)
		json.NewEncoder(w).Encode(APIResponse{
			Code:    0,
			Message: "success",
			Data:    map[string]string{"status": "ok"},
		})
	}))
	defer server.Close()

	client, err := NewClient(NewConfig(server.URL))
	if err != nil {
		b.Fatalf("failed to create client: %v", err)
	}

	ctx := context.Background()
	concurrency := 10
	var wg sync.WaitGroup

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			_, _ = client.HealthCheck(ctx)
		}()

		if i > 0 && i%concurrency == 0 {
			wg.Wait()
		}
	}
	wg.Wait()
}

func BenchmarkHealthCheck(b *testing.B) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
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
	defer server.Close()

	client, err := NewClient(NewConfig(server.URL))
	if err != nil {
		b.Fatalf("failed to create client: %v", err)
	}

	ctx := context.Background()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := client.HealthCheck(ctx)
		if err != nil {
			b.Fatalf("health check failed: %v", err)
		}
	}
}

func BenchmarkScenarioManagement(b *testing.B) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")

		switch r.Method {
		case http.MethodGet:
			json.NewEncoder(w).Encode(APIResponse{
				Code:    0,
				Message: "success",
				Data: Scenario{
					ID:   "scenario-1",
					Name: "Test Scenario",
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
		case http.MethodPut:
			json.NewEncoder(w).Encode(APIResponse{
				Code:    0,
				Message: "success",
				Data: Scenario{
					ID:   "scenario-1",
					Name: "Updated Scenario",
				},
			})
		case http.MethodDelete:
			json.NewEncoder(w).Encode(APIResponse{
				Code:    0,
				Message: "success",
				Data:    DeleteResponse{Deleted: true},
			})
		}
	}))
	defer server.Close()

	client, err := NewClient(NewConfig(server.URL))
	if err != nil {
		b.Fatalf("failed to create client: %v", err)
	}

	ctx := context.Background()
	b.ResetTimer()

	b.Run("List", func(b *testing.B) {
		for i := 0; i < b.N; i++ {
			_, _ = client.ListScenarios(ctx)
		}
	})

	b.Run("Create", func(b *testing.B) {
		for i := 0; i < b.N; i++ {
			_, _ = client.CreateScenario(ctx, &Scenario{Name: "Test"})
		}
	})

	b.Run("Get", func(b *testing.B) {
		for i := 0; i < b.N; i++ {
			_, _ = client.GetScenario(ctx, "scenario-1")
		}
	})

	b.Run("Update", func(b *testing.B) {
		for i := 0; i < b.N; i++ {
			_, _ = client.UpdateScenario(ctx, "scenario-1", map[string]interface{}{"name": "Updated"})
		}
	})

	b.Run("Delete", func(b *testing.B) {
		for i := 0; i < b.N; i++ {
			_, _ = client.DeleteScenario(ctx, "scenario-1")
		}
	})
}

func BenchmarkWebhookManagement(b *testing.B) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")

		switch r.Method {
		case http.MethodGet:
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
		case http.MethodPost:
			json.NewEncoder(w).Encode(APIResponse{
				Code:    0,
				Message: "success",
				Data: Webhook{
					ID:    "new-webhook",
					URL:   "https://example.com/webhook",
					AppID: "app-123",
				},
			})
		case http.MethodPut:
			json.NewEncoder(w).Encode(APIResponse{
				Code:    0,
				Message: "success",
				Data: Webhook{
					ID:    "webhook-1",
					URL:   "https://example.com/updated",
					AppID: "app-123",
				},
			})
		case http.MethodDelete:
			json.NewEncoder(w).Encode(APIResponse{
				Code:    0,
				Message: "success",
				Data:    DeleteResponse{Deleted: true},
			})
		}
	}))
	defer server.Close()

	client, err := NewClient(NewConfig(server.URL))
	if err != nil {
		b.Fatalf("failed to create client: %v", err)
	}

	ctx := context.Background()
	webhook := &Webhook{
		AppID:  "app-123",
		URL:    "https://example.com/webhook",
		Events: []string{"verify.success"},
	}

	b.ResetTimer()

	b.Run("Register", func(b *testing.B) {
		for i := 0; i < b.N; i++ {
			_, _ = client.RegisterWebhook(ctx, webhook)
		}
	})

	b.Run("List", func(b *testing.B) {
		for i := 0; i < b.N; i++ {
			_, _ = client.ListWebhooks(ctx, "app-123")
		}
	})

	b.Run("Update", func(b *testing.B) {
		for i := 0; i < b.N; i++ {
			_, _ = client.UpdateWebhook(ctx, "webhook-1", map[string]interface{}{"url": "https://example.com/updated"})
		}
	})

	b.Run("Unregister", func(b *testing.B) {
		for i := 0; i < b.N; i++ {
			_, _ = client.UnregisterWebhook(ctx, "webhook-1")
		}
	})
}

func BenchmarkConcurrentCaptchaGeneration(b *testing.B) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(APIResponse{
			Code:    0,
			Message: "success",
			Data: SliderCaptchaResult{
				ID:        "slider-123",
				TargetX:   150,
				TargetY:   75,
			},
		})
	}))
	defer server.Close()

	client, err := NewClient(NewConfig(server.URL).WithAppID("test-app"))
	if err != nil {
		b.Fatalf("failed to create client: %v", err)
	}

	ctx := context.Background()
	concurrency := 5
	var wg sync.WaitGroup

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			_, _ = client.GenerateSliderCaptcha(ctx, nil)
		}()

		if i > 0 && i%concurrency == 0 {
			wg.Wait()
		}
	}
	wg.Wait()
}

func BenchmarkHTTPClientRetry(b *testing.B) {
	requestCount := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requestCount++
		w.Header().Set("Content-Type", "application/json")

		if requestCount < 3 {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(APIResponse{
				Code:    500,
				Message: "internal error",
			})
			return
		}

		json.NewEncoder(w).Encode(APIResponse{
			Code:    0,
			Message: "success",
			Data:    map[string]string{"status": "ok"},
		})
	}))
	defer server.Close()

	httpClient := newHTTPClient(server.URL, 10*time.Second, 3)
	ctx := context.Background()

	b.ResetTimer()
	_, err := httpClient.get(ctx, "/test")
	if err != nil {
		b.Fatalf("request failed: %v", err)
	}

	if requestCount < 3 {
		b.Fatalf("expected at least 3 requests, got %d", requestCount)
	}
}

func BenchmarkConfigBuilding(b *testing.B) {
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		config := NewConfig("https://captchax.example.com").
			WithAppID("test-app").
			WithTimeout(30 * time.Second).
			WithRetryTimes(5).
			WithAPIVersion(APIVersionV2)

		if config == nil {
			b.Fatal("config is nil")
		}
	}
}

func BenchmarkBuildURLWithFullURL(b *testing.B) {
	httpClient := newHTTPClient("https://test.example.com", 10*time.Second, 0)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = httpClient.buildURL("https://other.com/path")
	}
}

func BenchmarkBuildURLWithSlash(b *testing.B) {
	httpClient := newHTTPClient("https://test.example.com", 10*time.Second, 0)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = httpClient.buildURL("/health")
	}
}

func BenchmarkBuildURLWithoutSlash(b *testing.B) {
	httpClient := newHTTPClient("https://test.example.com", 10*time.Second, 0)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = httpClient.buildURL("health")
	}
}

func BenchmarkParseSliderCaptchaResult(b *testing.B) {
	jsonStr := `{"code":0,"message":"success","data":{"id":"slider-123","background_b64":"base64data","slider_b64":"base64slider","target_x":150,"target_y":75}}`

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		var resp APIResponse
		err := json.Unmarshal([]byte(jsonStr), &resp)
		if err != nil {
			b.Fatalf("unmarshal failed: %v", err)
		}

		dataBytes, _ := json.Marshal(resp.Data)
		var result SliderCaptchaResult
		err = json.Unmarshal(dataBytes, &result)
		if err != nil {
			b.Fatalf("parse result failed: %v", err)
		}
	}
}

func BenchmarkParseClickCaptchaResult(b *testing.B) {
	jsonStr := `{"code":0,"message":"success","data":{"id":"click-123","image":"base64image","target_chars":["A","B","C"],"char_positions":[{"char":"A","x":100,"y":100},{"char":"B","x":200,"y":200},{"char":"C","x":300,"y":300}]}}`

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		var resp APIResponse
		err := json.Unmarshal([]byte(jsonStr), &resp)
		if err != nil {
			b.Fatalf("unmarshal failed: %v", err)
		}

		dataBytes, _ := json.Marshal(resp.Data)
		var result ClickCaptchaResult
		err = json.Unmarshal(dataBytes, &result)
		if err != nil {
			b.Fatalf("parse result failed: %v", err)
		}
	}
}

func BenchmarkParseBatchVerifyResponse(b *testing.B) {
	jsonStr := `{"code":0,"message":"success","data":{"results":[{"captcha_id":"1","success":true,"message":"OK"},{"captcha_id":"2","success":true,"message":"OK"}],"summary":{"total":2,"success":2,"failed":0,"skipped":0}}}`

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		var resp APIResponse
		err := json.Unmarshal([]byte(jsonStr), &resp)
		if err != nil {
			b.Fatalf("unmarshal failed: %v", err)
		}

		dataBytes, _ := json.Marshal(resp.Data)
		var result BatchVerifyResponse
		err = json.Unmarshal(dataBytes, &result)
		if err != nil {
			b.Fatalf("parse result failed: %v", err)
		}
	}
}

func BenchmarkRequireAppID(b *testing.B) {
	client, err := NewClient(NewConfig("https://captchax.example.com").WithAppID("test-app"))
	if err != nil {
		b.Fatalf("failed to create client: %v", err)
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = client.requireAppID()
	}
}

func BenchmarkGetAPIPrefix(b *testing.B) {
	client, err := NewClient(NewConfig("https://captchax.example.com"))
	if err != nil {
		b.Fatalf("failed to create client: %v", err)
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = client.getAPIPrefix()
	}
}

func BenchmarkStringFormatting(b *testing.B) {
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = fmt.Sprintf("/api/%s/captcha/slider", APIVersionV1)
	}
}

func BenchmarkStringConcatenation(b *testing.B) {
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = "/api/" + string(APIVersionV1) + "/captcha/slider"
	}
}

func BenchmarkStringsTrimSuffix(b *testing.B) {
	url := "https://test.example.com/"

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = strings.TrimSuffix(url, "/")
	}
}

func BenchmarkBytesNewReader(b *testing.B) {
	data := []byte(`{"app_id":"test","width":300,"height":150}`)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = bytes.NewReader(data)
	}
}

func BenchmarkIOReadAll(b *testing.B) {
	data := make([]byte, 1024)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Write(data)
	}))
	defer server.Close()

	client := &http.Client{}
	req, _ := http.NewRequest("GET", server.URL, nil)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		resp, _ := client.Do(req)
		_, _ = io.ReadAll(resp.Body)
		resp.Body.Close()
	}
}

func BenchmarkConcurrentMutex(b *testing.B) {
	var mu sync.RWMutex
	value := 0

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		mu.Lock()
		value++
		mu.Unlock()
	}
}

func BenchmarkConcurrentAtomic(b *testing.B) {
	var value int64

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		atomic.AddInt64(&value, 1)
	}
}

func BenchmarkHTTPClientRequestWithRetry(b *testing.B) {
	requestCount := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requestCount++
		w.Header().Set("Content-Type", "application/json")

		if requestCount < 2 {
			w.WriteHeader(http.StatusServiceUnavailable)
			return
		}

		json.NewEncoder(w).Encode(APIResponse{
			Code:    0,
			Message: "success",
			Data:    map[string]string{"status": "ok"},
		})
	}))
	defer server.Close()

	httpClient := newHTTPClient(server.URL, 10*time.Second, 2)
	ctx := context.Background()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		requestCount = 0
		_, err := httpClient.get(ctx, "/test")
		if err != nil {
			b.Fatalf("request failed: %v", err)
		}
	}
}
