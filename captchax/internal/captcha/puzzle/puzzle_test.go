package puzzle

import (
	"captchax/config"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"testing"
	"time"
)

type MockRedisClient struct {
	data map[string]string
	ttls map[string]time.Duration
}

func NewMockRedisClient() *MockRedisClient {
	return &MockRedisClient{
		data: make(map[string]string),
		ttls: make(map[string]time.Duration),
	}
}

func (m *MockRedisClient) Set(ctx context.Context, key string, value interface{}, expiration time.Duration) error {
	var strVal string
	switch v := value.(type) {
	case string:
		strVal = v
	case []byte:
		strVal = string(v)
	default:
		data, _ := json.Marshal(v)
		strVal = string(data)
	}
	m.data[key] = strVal
	m.ttls[key] = expiration
	return nil
}

func (m *MockRedisClient) Get(ctx context.Context, key string) (string, error) {
	if val, ok := m.data[key]; ok {
		return val, nil
	}
	return "", errors.New("redis: nil")
}

func (m *MockRedisClient) GetBytes(ctx context.Context, key string) ([]byte, error) {
	if val, ok := m.data[key]; ok {
		return []byte(val), nil
	}
	return nil, errors.New("redis: nil")
}

func (m *MockRedisClient) Del(ctx context.Context, keys ...string) error {
	for _, key := range keys {
		delete(m.data, key)
		delete(m.ttls, key)
	}
	return nil
}

func (m *MockRedisClient) Exists(ctx context.Context, key string) (int64, error) {
	if _, ok := m.data[key]; ok {
		return 1, nil
	}
	return 0, nil
}

func (m *MockRedisClient) ExistsCtx(ctx context.Context, keys ...string) (int64, error) {
	count := int64(0)
	for _, key := range keys {
		if _, ok := m.data[key]; ok {
			count++
		}
	}
	return count, nil
}

func (m *MockRedisClient) Expire(ctx context.Context, key string, expiration time.Duration) error {
	m.ttls[key] = expiration
	return nil
}

func (m *MockRedisClient) TTL(ctx context.Context, key string) (time.Duration, error) {
	if ttl, ok := m.ttls[key]; ok {
		return ttl, nil
	}
	return 0, nil
}

func (m *MockRedisClient) Incr(ctx context.Context, key string) (int64, error) {
	var val int64
	if s, ok := m.data[key]; ok {
		fmt.Sscanf(s, "%d", &val)
	}
	val++
	m.data[key] = fmt.Sprintf("%d", val)
	return val, nil
}

func (m *MockRedisClient) Keys(ctx context.Context, pattern string) ([]string, error) {
	var result []string
	for key := range m.data {
		result = append(result, key)
	}
	return result, nil
}

func (m *MockRedisClient) Ping(ctx context.Context) error {
	return nil
}

func (m *MockRedisClient) Close() error {
	return nil
}

func (m *MockRedisClient) Client() interface{} {
	return nil
}

func TestGenerateCaptcha(t *testing.T) {
	cfg := &config.CaptchaConfig{
		Width:         400,
		Height:        300,
		SliderSize:    60,
		Tolerance:     10,
		ExpireMinutes: 5,
	}

	t.Run("Generate captcha creates valid result", func(t *testing.T) {
		puzzle := New(cfg, nil)
		result, err := puzzle.GenerateCaptcha(context.Background())
		if err != nil {
			t.Fatalf("GenerateCaptcha() error = %v", err)
		}

		if result.ID == "" {
			t.Error("GenerateCaptcha() returned empty ID")
		}

		if result.BackgroundB64 == "" {
			t.Error("GenerateCaptcha() returned empty BackgroundB64")
		}

		if result.PuzzlePieceB64 == "" {
			t.Error("GenerateCaptcha() returned empty PuzzlePieceB64")
		}

		if result.ShuffledB64 == "" {
			t.Error("GenerateCaptcha() returned empty ShuffledB64")
		}

		if result.TargetX <= 0 || result.TargetX >= cfg.Width {
			t.Errorf("TargetX = %d, want between 1 and %d", result.TargetX, cfg.Width-1)
		}

		if result.TargetY <= 0 || result.TargetY >= cfg.Height {
			t.Errorf("TargetY = %d, want between 1 and %d", result.TargetY, cfg.Height-1)
		}
	})
}

func TestCacheOperations(t *testing.T) {
	cfg := &config.CaptchaConfig{
		ExpireMinutes: 5,
	}
	mockRedis := NewMockRedisClient()
	cacheManager := NewCacheManager(cfg, mockRedis)
	ctx := context.Background()

	t.Run("Set and Get cache data", func(t *testing.T) {
		testData := &CacheData{
			ID:           "test-captcha-123",
			TargetX:      200,
			TargetY:      150,
			TargetWidth:  400,
			TargetHeight: 300,
			PieceShape:   ShapeSquare,
			PieceSize:    60,
			CreatedAt:    time.Now().Unix(),
			Verified:     false,
			Attempts:     0,
		}

		err := cacheManager.Set(ctx, testData.ID, testData)
		if err != nil {
			t.Fatalf("Set() error = %v", err)
		}

		retrieved, err := cacheManager.Get(ctx, testData.ID)
		if err != nil {
			t.Fatalf("Get() error = %v", err)
		}

		if retrieved.ID != testData.ID {
			t.Errorf("ID = %s, want %s", retrieved.ID, testData.ID)
		}
		if retrieved.TargetX != testData.TargetX {
			t.Errorf("TargetX = %d, want %d", retrieved.TargetX, testData.TargetX)
		}
		if retrieved.TargetY != testData.TargetY {
			t.Errorf("TargetY = %d, want %d", retrieved.TargetY, testData.TargetY)
		}
		if retrieved.PieceShape != testData.PieceShape {
			t.Errorf("PieceShape = %v, want %v", retrieved.PieceShape, testData.PieceShape)
		}
		if retrieved.Verified != testData.Verified {
			t.Errorf("Verified = %v, want %v", retrieved.Verified, testData.Verified)
		}
		if retrieved.Attempts != testData.Attempts {
			t.Errorf("Attempts = %d, want %d", retrieved.Attempts, testData.Attempts)
		}
	})

	t.Run("Get non-existent key", func(t *testing.T) {
		_, err := cacheManager.Get(ctx, "non-existent-key")
		if err == nil {
			t.Error("Get() expected error for non-existent key")
		}
		if !errors.Is(err, ErrPuzzleNotFound) {
			t.Errorf("Get() error = %v, want ErrPuzzleNotFound", err)
		}
	})

	t.Run("Delete cache data", func(t *testing.T) {
		testData := &CacheData{
			ID:        "test-captcha-delete",
			TargetX:   100,
			TargetY:   100,
			CreatedAt: time.Now().Unix(),
		}

		cacheManager.Set(ctx, testData.ID, testData)
		err := cacheManager.Delete(ctx, testData.ID)
		if err != nil {
			t.Fatalf("Delete() error = %v", err)
		}

		_, err = cacheManager.Get(ctx, testData.ID)
		if err == nil {
			t.Error("Get() expected error after Delete()")
		}
	})

	t.Run("Check existence", func(t *testing.T) {
		testData := &CacheData{
			ID:        "test-captcha-exists",
			TargetX:   100,
			TargetY:   100,
			CreatedAt: time.Now().Unix(),
		}

		cacheManager.Set(ctx, testData.ID, testData)
		exists, err := cacheManager.Exists(ctx, testData.ID)
		if err != nil {
			t.Fatalf("Exists() error = %v", err)
		}
		if !exists {
			t.Error("Exists() = false, want true")
		}

		exists, _ = cacheManager.Exists(ctx, "non-existent")
		if exists {
			t.Error("Exists() = true for non-existent key, want false")
		}
	})
}

func TestMarkVerified(t *testing.T) {
	cfg := &config.CaptchaConfig{
		ExpireMinutes: 5,
	}
	mockRedis := NewMockRedisClient()
	cacheManager := NewCacheManager(cfg, mockRedis)
	ctx := context.Background()

	t.Run("Mark verified successfully", func(t *testing.T) {
		testData := &CacheData{
			ID:        "mark-verified-123",
			TargetX:   200,
			TargetY:   150,
			CreatedAt: time.Now().Unix(),
			Verified:  false,
		}

		cacheManager.Set(ctx, testData.ID, testData)
		err := cacheManager.MarkVerified(ctx, testData.ID)
		if err != nil {
			t.Fatalf("MarkVerified() error = %v", err)
		}

		retrieved, _ := cacheManager.Get(ctx, testData.ID)
		if !retrieved.Verified {
			t.Error("Verified should be true after MarkVerified()")
		}
	})

	t.Run("Mark verified twice should fail", func(t *testing.T) {
		testData := &CacheData{
			ID:        "mark-verified-twice-123",
			TargetX:   200,
			TargetY:   150,
			CreatedAt: time.Now().Unix(),
			Verified:  false,
		}

		cacheManager.Set(ctx, testData.ID, testData)
		cacheManager.MarkVerified(ctx, testData.ID)

		err := cacheManager.MarkVerified(ctx, testData.ID)
		if err == nil {
			t.Error("MarkVerified() should fail when already verified")
		}
		if !errors.Is(err, ErrPuzzleVerified) {
			t.Errorf("MarkVerified() error = %v, want ErrPuzzleVerified", err)
		}
	})
}

func TestIncrementAttempts(t *testing.T) {
	cfg := &config.CaptchaConfig{
		ExpireMinutes: 5,
		MaxAttempts:   3,
	}
	mockRedis := NewMockRedisClient()
	cacheManager := NewCacheManager(cfg, mockRedis)
	ctx := context.Background()

	t.Run("Increment attempts", func(t *testing.T) {
		testData := &CacheData{
			ID:        "increment-attempts-123",
			TargetX:   200,
			TargetY:   150,
			CreatedAt: time.Now().Unix(),
			Verified:  false,
			Attempts:  0,
		}

		cacheManager.Set(ctx, testData.ID, testData)

		for i := 1; i <= cfg.MaxAttempts; i++ {
			attempts, err := cacheManager.IncrementAttempts(ctx, testData.ID)
			if err != nil && i < cfg.MaxAttempts {
				t.Errorf("IncrementAttempts() error at attempt %d = %v", i, err)
			}
			if attempts != i {
				t.Errorf("Attempts = %d, want %d", attempts, i)
			}
		}

		_, err := cacheManager.Get(ctx, testData.ID)
		if err == nil {
			t.Error("Captcha should be deleted after max attempts exceeded")
		}
	})
}

func TestRemainingAttempts(t *testing.T) {
	cfg := &config.CaptchaConfig{
		ExpireMinutes: 5,
		MaxAttempts:   5,
	}
	mockRedis := NewMockRedisClient()
	cacheManager := NewCacheManager(cfg, mockRedis)
	ctx := context.Background()

	t.Run("Remaining attempts calculation", func(t *testing.T) {
		testData := &CacheData{
			ID:        "remaining-attempts-123",
			TargetX:   200,
			TargetY:   150,
			CreatedAt: time.Now().Unix(),
			Verified:  false,
			Attempts:  2,
		}

		cacheManager.Set(ctx, testData.ID, testData)

		remaining, err := cacheManager.RemainingAttempts(ctx, testData.ID)
		if err != nil {
			t.Fatalf("RemainingAttempts() error = %v", err)
		}

		if remaining != cfg.MaxAttempts-2 {
			t.Errorf("Remaining attempts = %d, want %d", remaining, cfg.MaxAttempts-2)
		}
	})
}

func TestVerifySuccess(t *testing.T) {
	cfg := &config.CaptchaConfig{
		Tolerance:     10,
		ExpireMinutes: 5,
	}
	mockRedis := NewMockRedisClient()
	cacheManager := NewCacheManager(cfg, mockRedis)
	verifyService := NewVerifyService(cfg, cacheManager)
	ctx := context.Background()

	t.Run("Verify with exact position", func(t *testing.T) {
		targetX := 200
		targetY := 150

		cacheData := &CacheData{
			ID:        "verify-exact-123",
			TargetX:   targetX,
			TargetY:   targetY,
			CreatedAt: time.Now().Unix(),
			Verified:  false,
			Attempts:  0,
		}

		cacheManager.Set(ctx, cacheData.ID, cacheData)

		req := &VerifyRequest{
			CaptchaID: cacheData.ID,
			TargetX:   targetX,
			TargetY:   targetY,
		}

		result, err := verifyService.Verify(ctx, req)
		if err != nil {
			t.Fatalf("Verify() error = %v", err)
		}

		if !result.Success {
			t.Errorf("Verify() Success = false, want true. Message: %s", result.Message)
		}
		if result.Message != "verification successful" {
			t.Errorf("Message = %s, want 'verification successful'", result.Message)
		}
	})

	t.Run("Verify with position within tolerance", func(t *testing.T) {
		targetX := 200
		targetY := 150

		cacheData := &CacheData{
			ID:        "verify-tolerance-123",
			TargetX:   targetX,
			TargetY:   targetY,
			CreatedAt: time.Now().Unix(),
			Verified:  false,
			Attempts:  0,
		}

		cacheManager.Set(ctx, cacheData.ID, cacheData)

		req := &VerifyRequest{
			CaptchaID: cacheData.ID,
			TargetX:   targetX + 5,
			TargetY:   targetY - 5,
		}

		result, err := verifyService.Verify(ctx, req)
		if err != nil {
			t.Fatalf("Verify() error = %v", err)
		}

		if !result.Success {
			t.Errorf("Verify() with position within tolerance should succeed. Message: %s", result.Message)
		}
	})
}

func TestVerifyFailure(t *testing.T) {
	cfg := &config.CaptchaConfig{
		Tolerance:     10,
		ExpireMinutes: 5,
	}
	mockRedis := NewMockRedisClient()
	cacheManager := NewCacheManager(cfg, mockRedis)
	verifyService := NewVerifyService(cfg, cacheManager)
	ctx := context.Background()

	t.Run("Verify with wrong position", func(t *testing.T) {
		cacheData := &CacheData{
			ID:        "verify-wrong-123",
			TargetX:   200,
			TargetY:   150,
			CreatedAt: time.Now().Unix(),
			Verified:  false,
			Attempts:  0,
		}

		cacheManager.Set(ctx, cacheData.ID, cacheData)

		req := &VerifyRequest{
			CaptchaID: cacheData.ID,
			TargetX:   300,
			TargetY:   250,
		}

		result, err := verifyService.Verify(ctx, req)
		if err == nil {
			t.Error("Verify() expected error for wrong position")
		}

		if result.Success {
			t.Error("Verify() with wrong position should return Success=false")
		}
	})

	t.Run("Verify with non-existent captcha", func(t *testing.T) {
		req := &VerifyRequest{
			CaptchaID: "non-existent-captcha",
			TargetX:   100,
			TargetY:   100,
		}

		result, err := verifyService.Verify(ctx, req)
		if err == nil {
			t.Error("Verify() expected error for non-existent captcha")
		}

		if result.Success {
			t.Error("Verify() with non-existent captcha should return Success=false")
		}
	})

	t.Run("Verify with empty captcha ID", func(t *testing.T) {
		req := &VerifyRequest{
			CaptchaID: "",
			TargetX:   100,
			TargetY:   100,
		}

		result, err := verifyService.Verify(ctx, req)
		if err == nil {
			t.Error("Verify() expected error for empty captcha ID")
		}

		if result.Success {
			t.Error("Verify() with empty ID should return Success=false")
		}
	})

	t.Run("Verify with already verified captcha", func(t *testing.T) {
		cacheData := &CacheData{
			ID:        "verify-already-123",
			TargetX:   200,
			TargetY:   150,
			CreatedAt: time.Now().Unix(),
			Verified:  true,
		}

		cacheManager.Set(ctx, cacheData.ID, cacheData)

		req := &VerifyRequest{
			CaptchaID: cacheData.ID,
			TargetX:   200,
			TargetY:   150,
		}

		result, err := verifyService.Verify(ctx, req)
		if err == nil {
			t.Error("Verify() expected error for already verified captcha")
		}

		if result.Success {
			t.Error("Verify() with already verified captcha should return Success=false")
		}
	})

	t.Run("Verify with invalid negative X", func(t *testing.T) {
		req := &VerifyRequest{
			CaptchaID: "test-id",
			TargetX:   -1,
			TargetY:   100,
		}

		result, err := verifyService.Verify(ctx, req)
		if err == nil {
			t.Error("Verify() expected error for negative X")
		}
		if result.Success {
			t.Error("Verify() with negative X should return Success=false")
		}
	})

	t.Run("Verify with invalid negative Y", func(t *testing.T) {
		req := &VerifyRequest{
			CaptchaID: "test-id",
			TargetX:   100,
			TargetY:   -1,
		}

		result, err := verifyService.Verify(ctx, req)
		if err == nil {
			t.Error("Verify() expected error for negative Y")
		}
		if result.Success {
			t.Error("Verify() with negative Y should return Success=false")
		}
	})
}

func TestValidatePosition(t *testing.T) {
	cfg := &config.CaptchaConfig{}
	verifyService := NewVerifyService(cfg, nil)

	t.Run("Valid positive positions", func(t *testing.T) {
		err := verifyService.ValidatePosition(100, 100)
		if err != nil {
			t.Errorf("ValidatePosition(100, 100) error = %v, want nil", err)
		}
	})

	t.Run("Invalid negative X", func(t *testing.T) {
		err := verifyService.ValidatePosition(-1, 100)
		if err == nil {
			t.Error("ValidatePosition(-1, 100) expected error")
		}
		if !errors.Is(err, ErrInvalidX) {
			t.Errorf("ValidatePosition(-1, 100) error = %v, want ErrInvalidX", err)
		}
	})

	t.Run("Invalid negative Y", func(t *testing.T) {
		err := verifyService.ValidatePosition(100, -1)
		if err == nil {
			t.Error("ValidatePosition(100, -1) expected error")
		}
		if !errors.Is(err, ErrInvalidY) {
			t.Errorf("ValidatePosition(100, -1) error = %v, want ErrInvalidY", err)
		}
	})
}

func TestCalculateDistance(t *testing.T) {
	cfg := &config.CaptchaConfig{}
	verifyService := NewVerifyService(cfg, nil)

	tests := []struct {
		name     string
		x1, y1   int
		x2, y2   int
		expected float64
	}{
		{"zero distance", 0, 0, 0, 0, 0},
		{"same x", 0, 0, 0, 10, 10},
		{"same y", 0, 0, 10, 0, 10},
		{"diagonal", 0, 0, 3, 4, 5},
		{"negative coords", -5, -5, 0, 0, 7.07},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := verifyService.calculateDistance(tt.x1, tt.y1, tt.x2, tt.y2)
			diff := result - tt.expected
			if diff < -0.1 || diff > 0.1 {
				t.Errorf("calculateDistance(%d, %d, %d, %d) = %f, want ~%f",
					tt.x1, tt.y1, tt.x2, tt.y2, result, tt.expected)
			}
		})
	}
}

func TestGetHints(t *testing.T) {
	cfg := &config.CaptchaConfig{
		Width:  400,
		Height: 300,
	}
	mockRedis := NewMockRedisClient()
	cacheManager := NewCacheManager(cfg, mockRedis)
	verifyService := NewVerifyService(cfg, cacheManager)
	ctx := context.Background()

	t.Run("Get hints for left position", func(t *testing.T) {
		cacheData := &CacheData{
			ID:           "hints-left-123",
			TargetX:      100,
			TargetY:      150,
			TargetWidth:  cfg.Width,
			TargetHeight: cfg.Height,
			CreatedAt:    time.Now().Unix(),
		}

		cacheManager.Set(ctx, cacheData.ID, cacheData)

		hints, err := verifyService.GetHints(ctx, cacheData.ID)
		if err != nil {
			t.Fatalf("GetHints() error = %v", err)
		}

		if !hints.RightHint {
			t.Error("RightHint should be true for left target position")
		}
	})

	t.Run("Get hints for center position", func(t *testing.T) {
		cacheData := &CacheData{
			ID:           "hints-center-123",
			TargetX:      200,
			TargetY:      150,
			TargetWidth:  cfg.Width,
			TargetHeight: cfg.Height,
			CreatedAt:    time.Now().Unix(),
		}

		cacheManager.Set(ctx, cacheData.ID, cacheData)

		hints, err := verifyService.GetHints(ctx, cacheData.ID)
		if err != nil {
			t.Fatalf("GetHints() error = %v", err)
		}

		if !hints.CenterHint {
			t.Error("CenterHint should be true for center target position")
		}
	})

	t.Run("Get hints for right position", func(t *testing.T) {
		cacheData := &CacheData{
			ID:           "hints-right-123",
			TargetX:      350,
			TargetY:      150,
			TargetWidth:  cfg.Width,
			TargetHeight: cfg.Height,
			CreatedAt:    time.Now().Unix(),
		}

		cacheManager.Set(ctx, cacheData.ID, cacheData)

		hints, err := verifyService.GetHints(ctx, cacheData.ID)
		if err != nil {
			t.Fatalf("GetHints() error = %v", err)
		}

		if !hints.LeftHint {
			t.Error("LeftHint should be true for right target position")
		}
	})
}

func TestCheckProximity(t *testing.T) {
	cfg := &config.CaptchaConfig{
		Tolerance: 10,
	}
	mockRedis := NewMockRedisClient()
	cacheManager := NewCacheManager(cfg, mockRedis)
	verifyService := NewVerifyService(cfg, cacheManager)
	ctx := context.Background()

	t.Run("Check proximity - within tolerance", func(t *testing.T) {
		cacheData := &CacheData{
			ID:        "proximity-ok-123",
			TargetX:   200,
			TargetY:   150,
			CreatedAt: time.Now().Unix(),
		}

		cacheManager.Set(ctx, cacheData.ID, cacheData)

		ok, distance, err := verifyService.CheckProximity(ctx, cacheData.ID, 205, 155)
		if err != nil {
			t.Fatalf("CheckProximity() error = %v", err)
		}
		if !ok {
			t.Error("CheckProximity should return true for position within tolerance")
		}
		if distance > float64(cfg.Tolerance) {
			t.Errorf("Distance = %f, want <= %d", distance, cfg.Tolerance)
		}
	})

	t.Run("Check proximity - outside tolerance", func(t *testing.T) {
		cacheData := &CacheData{
			ID:        "proximity-fail-123",
			TargetX:   200,
			TargetY:   150,
			CreatedAt: time.Now().Unix(),
		}

		cacheManager.Set(ctx, cacheData.ID, cacheData)

		ok, distance, err := verifyService.CheckProximity(ctx, cacheData.ID, 250, 200)
		if err != nil {
			t.Fatalf("CheckProximity() error = %v", err)
		}
		if ok {
			t.Error("CheckProximity should return false for position outside tolerance")
		}
		if distance <= float64(cfg.Tolerance) {
			t.Errorf("Distance = %f, want > %d", distance, cfg.Tolerance)
		}
	})
}

func TestGetDirectionHint(t *testing.T) {
	cfg := &config.CaptchaConfig{}
	mockRedis := NewMockRedisClient()
	cacheManager := NewCacheManager(cfg, mockRedis)
	verifyService := NewVerifyService(cfg, cacheManager)
	ctx := context.Background()

	cacheData := &CacheData{
		ID:        "direction-123",
		TargetX:   200,
		TargetY:   150,
		CreatedAt: time.Now().Unix(),
	}
	cacheManager.Set(ctx, cacheData.ID, cacheData)

	t.Run("Direction right", func(t *testing.T) {
		direction, err := verifyService.GetDirectionHint(ctx, cacheData.ID, 100, 150)
		if err != nil {
			t.Fatalf("GetDirectionHint() error = %v", err)
		}
		if direction != "right" {
			t.Errorf("Direction = %s, want 'right'", direction)
		}
	})

	t.Run("Direction left", func(t *testing.T) {
		direction, err := verifyService.GetDirectionHint(ctx, cacheData.ID, 300, 150)
		if err != nil {
			t.Fatalf("GetDirectionHint() error = %v", err)
		}
		if direction != "left" {
			t.Errorf("Direction = %s, want 'left'", direction)
		}
	})

	t.Run("Direction down", func(t *testing.T) {
		direction, err := verifyService.GetDirectionHint(ctx, cacheData.ID, 200, 50)
		if err != nil {
			t.Fatalf("GetDirectionHint() error = %v", err)
		}
		if direction != "down" {
			t.Errorf("Direction = %s, want 'down'", direction)
		}
	})

	t.Run("Direction up", func(t *testing.T) {
		direction, err := verifyService.GetDirectionHint(ctx, cacheData.ID, 200, 250)
		if err != nil {
			t.Fatalf("GetDirectionHint() error = %v", err)
		}
		if direction != "up" {
			t.Errorf("Direction = %s, want 'up'", direction)
		}
	})
}
