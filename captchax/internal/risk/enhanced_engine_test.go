package risk

import (
	"context"
	"testing"

	"captchax/internal/config"
)

func TestAnalyzeMouseAcceleration(t *testing.T) {
	cfg := config.DefaultRiskConfig()
	engine := NewRiskEngine(cfg, nil, nil)

	t.Run("Insufficient track data", func(t *testing.T) {
		tracks := []MouseTrack{
			{X: 100, Y: 100, Timestamp: 0},
			{X: 110, Y: 105, Timestamp: 50},
		}
		score, factors := engine.AnalyzeMouseAcceleration(tracks)
		if score != 0 {
			t.Errorf("Score = %d, want 0 for insufficient data", score)
		}
		if len(factors) != 0 {
			t.Errorf("Factors count = %d, want 0", len(factors))
		}
	})

	t.Run("Abnormally stable acceleration", func(t *testing.T) {
		tracks := []MouseTrack{
			{X: 100, Y: 100, Timestamp: 0},
			{X: 150, Y: 100, Timestamp: 50},
			{X: 200, Y: 100, Timestamp: 100},
			{X: 250, Y: 100, Timestamp: 150},
			{X: 300, Y: 100, Timestamp: 200},
		}
		score, factors := engine.AnalyzeMouseAcceleration(tracks)
		t.Logf("Score: %d, Factors: %v", score, factors)
	})

	t.Run("Normal acceleration variation", func(t *testing.T) {
		tracks := []MouseTrack{
			{X: 100, Y: 100, Timestamp: 0},
			{X: 110, Y: 105, Timestamp: 30},
			{X: 130, Y: 115, Timestamp: 70},
			{X: 160, Y: 130, Timestamp: 120},
			{X: 200, Y: 150, Timestamp: 180},
			{X: 250, Y: 180, Timestamp: 250},
		}
		score, factors := engine.AnalyzeMouseAcceleration(tracks)
		t.Logf("Score: %d, Factors: %v", score, factors)
	})
}

func TestAnalyzeEnhancedClickPattern(t *testing.T) {
	cfg := config.DefaultRiskConfig()
	engine := NewRiskEngine(cfg, nil, nil)

	t.Run("Insufficient click data", func(t *testing.T) {
		clicks := []ClickEvent{
			{Timestamp: 100, X: 100, Y: 100, Pressure: 0.5, Duration: 50},
		}
		score, _ := engine.AnalyzeEnhancedClickPattern(clicks)
		if score != 0 {
			t.Errorf("Score = %d, want 0", score)
		}
	})

	t.Run("Uniform pressure pattern", func(t *testing.T) {
		clicks := []ClickEvent{
			{Timestamp: 100, X: 100, Y: 100, Pressure: 0.5, Duration: 50},
			{Timestamp: 200, X: 150, Y: 150, Pressure: 0.5, Duration: 50},
			{Timestamp: 300, X: 200, Y: 200, Pressure: 0.5, Duration: 50},
			{Timestamp: 400, X: 250, Y: 250, Pressure: 0.5, Duration: 50},
		}
		score, factors := engine.AnalyzeEnhancedClickPattern(clicks)
		t.Logf("Uniform pressure - Score: %d, Factors: %v", score, factors)
	})

	t.Run("Suspicious double-click pattern", func(t *testing.T) {
		clicks := []ClickEvent{
			{Timestamp: 100, X: 100, Y: 100, Pressure: 0.5, Duration: 50},
			{Timestamp: 130, X: 100, Y: 100, Pressure: 0.5, Duration: 50},
			{Timestamp: 260, X: 150, Y: 150, Pressure: 0.5, Duration: 50},
			{Timestamp: 290, X: 150, Y: 150, Pressure: 0.5, Duration: 50},
		}
		score, factors := engine.AnalyzeEnhancedClickPattern(clicks)
		t.Logf("Double-click pattern - Score: %d, Factors: %v", score, factors)
	})

	t.Run("Uniform duration pattern", func(t *testing.T) {
		clicks := []ClickEvent{
			{Timestamp: 100, X: 100, Y: 100, Pressure: 0.5, Duration: 50},
			{Timestamp: 250, X: 150, Y: 150, Pressure: 0.6, Duration: 50},
			{Timestamp: 400, X: 200, Y: 200, Pressure: 0.4, Duration: 50},
		}
		score, factors := engine.AnalyzeEnhancedClickPattern(clicks)
		t.Logf("Uniform duration - Score: %d, Factors: %v", score, factors)
	})

	t.Run("Mechanical interval pattern", func(t *testing.T) {
		clicks := []ClickEvent{
			{Timestamp: 100, X: 100, Y: 100, Pressure: 0.5, Duration: 50},
			{Timestamp: 200, X: 150, Y: 150, Pressure: 0.6, Duration: 60},
			{Timestamp: 300, X: 200, Y: 200, Pressure: 0.4, Duration: 40},
			{Timestamp: 400, X: 250, Y: 250, Pressure: 0.5, Duration: 50},
		}
		score, factors := engine.AnalyzeEnhancedClickPattern(clicks)
		t.Logf("Mechanical interval - Score: %d, Factors: %v", score, factors)
	})

	t.Run("Unusually short click interval", func(t *testing.T) {
		clicks := []ClickEvent{
			{Timestamp: 100, X: 100, Y: 100, Pressure: 0.5, Duration: 50},
			{Timestamp: 120, X: 150, Y: 150, Pressure: 0.6, Duration: 60},
		}
		score, factors := engine.AnalyzeEnhancedClickPattern(clicks)
		t.Logf("Short interval - Score: %d, Factors: %v", score, factors)
	})

	t.Run("Normal click pattern", func(t *testing.T) {
		clicks := []ClickEvent{
			{Timestamp: 100, X: 100, Y: 100, Pressure: 0.52, Duration: 55},
			{Timestamp: 350, X: 180, Y: 120, Pressure: 0.38, Duration: 48},
			{Timestamp: 800, X: 250, Y: 200, Pressure: 0.65, Duration: 72},
			{Timestamp: 1400, X: 280, Y: 180, Pressure: 0.48, Duration: 58},
			{Timestamp: 2100, X: 320, Y: 220, Pressure: 0.58, Duration: 62},
			{Timestamp: 2900, X: 350, Y: 250, Pressure: 0.45, Duration: 52},
		}
		score, factors := engine.AnalyzeEnhancedClickPattern(clicks)
		if score > 20 {
			t.Errorf("Score = %d, want <= 20 for normal pattern", score)
		}
		t.Logf("Normal clicks - Score: %d, Factors: %v", score, factors)
	})
}

func TestAnalyzePathComplexity(t *testing.T) {
	cfg := config.DefaultRiskConfig()
	engine := NewRiskEngine(cfg, nil, nil)

	t.Run("Insufficient track data", func(t *testing.T) {
		tracks := []MouseTrack{
			{X: 100, Y: 100, Timestamp: 0},
			{X: 110, Y: 105, Timestamp: 50},
			{X: 125, Y: 110, Timestamp: 100},
		}
		score, _ := engine.AnalyzePathComplexity(tracks)
		if score != 0 {
			t.Errorf("Score = %d, want 0", score)
		}
	})

	t.Run("Perfectly straight path", func(t *testing.T) {
		tracks := []MouseTrack{
			{X: 100, Y: 100, Timestamp: 0},
			{X: 150, Y: 100, Timestamp: 50},
			{X: 200, Y: 100, Timestamp: 100},
			{X: 250, Y: 100, Timestamp: 150},
			{X: 300, Y: 100, Timestamp: 200},
		}
		score, factors := engine.AnalyzePathComplexity(tracks)
		t.Logf("Straight path - Score: %d, Factors: %v", score, factors)
	})

	t.Run("Natural curved path", func(t *testing.T) {
		tracks := []MouseTrack{
			{X: 100, Y: 100, Timestamp: 0},
			{X: 120, Y: 120, Timestamp: 50},
			{X: 150, Y: 145, Timestamp: 100},
			{X: 180, Y: 135, Timestamp: 150},
			{X: 200, Y: 110, Timestamp: 200},
			{X: 220, Y: 105, Timestamp: 250},
		}
		score, factors := engine.AnalyzePathComplexity(tracks)
		t.Logf("Curved path - Score: %d, Factors: %v", score, factors)
	})
}

func TestCalculateThreePointCurvature(t *testing.T) {
	cfg := config.DefaultRiskConfig()
	engine := NewRiskEngine(cfg, nil, nil)

	t.Run("Perfectly straight line", func(t *testing.T) {
		p1 := Point{X: 100, Y: 100}
		p2 := Point{X: 150, Y: 100}
		p3 := Point{X: 200, Y: 100}
		curvature := engine.calculateThreePointCurvature(p1, p2, p3)
		if curvature != 1.0 {
			t.Errorf("Curvature = %f, want 1.0 for straight line", curvature)
		}
	})

	t.Run("Curved path", func(t *testing.T) {
		p1 := Point{X: 100, Y: 100}
		p2 := Point{X: 150, Y: 150}
		p3 := Point{X: 200, Y: 120}
		curvature := engine.calculateThreePointCurvature(p1, p2, p3)
		t.Logf("Curvature: %f", curvature)
	})
}

func TestCalculatePathComplexityInternal(t *testing.T) {
	cfg := config.DefaultRiskConfig()
	engine := NewRiskEngine(cfg, nil, nil)

	t.Run("Short path", func(t *testing.T) {
		tracks := []MouseTrack{
			{X: 100, Y: 100, Timestamp: 0},
		}
		complexity := engine.calculatePathComplexity(tracks)
		if complexity != 0 {
			t.Errorf("Complexity = %f, want 0 for single point", complexity)
		}
	})

	t.Run("Normal complex path", func(t *testing.T) {
		tracks := []MouseTrack{
			{X: 100, Y: 100, Timestamp: 0},
			{X: 120, Y: 110, Timestamp: 50},
			{X: 135, Y: 105, Timestamp: 100},
			{X: 150, Y: 120, Timestamp: 150},
			{X: 170, Y: 115, Timestamp: 200},
		}
		complexity := engine.calculatePathComplexity(tracks)
		t.Logf("Path complexity: %f", complexity)
	})
}

func TestAnalyzeHesitation(t *testing.T) {
	cfg := config.DefaultRiskConfig()
	engine := NewRiskEngine(cfg, nil, nil)

	t.Run("No hesitation data", func(t *testing.T) {
		score, _ := engine.AnalyzeHesitation([]HesitationPoint{})
		if score != 0 {
			t.Errorf("Score = %d, want 0", score)
		}
	})

	t.Run("Excessive hesitation", func(t *testing.T) {
		hesitations := []HesitationPoint{
			{X: 100, Y: 100, Timestamp: 0, Duration: 3000},
			{X: 150, Y: 150, Timestamp: 3000, Duration: 3500},
			{X: 200, Y: 200, Timestamp: 6500, Duration: 4000},
		}
		score, factors := engine.AnalyzeHesitation(hesitations)
		t.Logf("Excessive hesitation - Score: %d, Factors: %v", score, factors)
	})

	t.Run("Normal hesitation pattern", func(t *testing.T) {
		hesitations := []HesitationPoint{
			{X: 100, Y: 100, Timestamp: 0, Duration: 500},
			{X: 150, Y: 150, Timestamp: 800, Duration: 300},
		}
		score, factors := engine.AnalyzeHesitation(hesitations)
		t.Logf("Normal hesitation - Score: %d, Factors: %v", score, factors)
	})
}

func TestEnhancedCalculateRiskScore(t *testing.T) {
	cfg := config.DefaultRiskConfig()
	whitelist, _ := NewWhitelist(&WhitelistConfig{MemoryOnly: true})
	engine := NewRiskEngine(cfg, nil, whitelist)
	ctx := context.Background()

	t.Run("Normal behavior with enhanced analysis", func(t *testing.T) {
		behavior := &BehaviorData{
			SessionID: "test-enhanced-1",
			MouseTracks: []MouseTrack{
				{X: 100, Y: 100, Timestamp: 0},
				{X: 115, Y: 108, Timestamp: 50},
				{X: 135, Y: 118, Timestamp: 100},
				{X: 160, Y: 132, Timestamp: 150},
				{X: 190, Y: 150, Timestamp: 200},
			},
			ClickTimes: []int64{100, 300, 600, 1000},
			ClickEvents: []ClickEvent{
				{Timestamp: 100, X: 100, Y: 100, Pressure: 0.5, Duration: 50},
				{Timestamp: 300, X: 150, Y: 150, Pressure: 0.6, Duration: 60},
				{Timestamp: 600, X: 200, Y: 200, Pressure: 0.4, Duration: 45},
			},
			SlideStart: 0,
			SlideEnd:   5000,
			Success:    true,
		}

		result := engine.EnhancedCalculateRiskScore(ctx, behavior, "192.168.1.1", "example.com")
		t.Logf("Enhanced risk score: %d, Level: %s", result.Score, result.Level)
	})

	t.Run("High-risk robot behavior", func(t *testing.T) {
		behavior := &BehaviorData{
			SessionID: "test-high-risk",
			MouseTracks: []MouseTrack{
				{X: 100, Y: 100, Timestamp: 0},
				{X: 150, Y: 100, Timestamp: 50},
				{X: 200, Y: 100, Timestamp: 100},
				{X: 250, Y: 100, Timestamp: 150},
				{X: 300, Y: 100, Timestamp: 200},
			},
			ClickTimes: []int64{100, 200, 300, 400, 500},
			ClickEvents: []ClickEvent{
				{Timestamp: 100, X: 100, Y: 100, Pressure: 0.5, Duration: 50},
				{Timestamp: 200, X: 150, Y: 150, Pressure: 0.5, Duration: 50},
				{Timestamp: 300, X: 200, Y: 200, Pressure: 0.5, Duration: 50},
			},
			SlideStart: 0,
			SlideEnd:   400,
			Success:    true,
		}

		result := engine.EnhancedCalculateRiskScore(ctx, behavior, "192.168.1.2", "example.com")
		t.Logf("High-risk score: %d, Level: %s", result.Score, result.Level)
	})
}

func TestAdaptiveRiskScorer(t *testing.T) {
	t.Run("Create new adaptive scorer", func(t *testing.T) {
		scorer := NewAdaptiveRiskScorer()
		if scorer == nil {
			t.Fatal("Expected non-nil scorer")
		}
		if len(scorer.factorWeights) == 0 {
			t.Error("Expected factor weights to be initialized")
		}
	})

	t.Run("Calculate weighted score", func(t *testing.T) {
		scorer := NewAdaptiveRiskScorer()
		factors := []RiskFactor{
			{Name: "slide_too_fast", Weight: 30, Reason: "Test"},
			{Name: "over_smooth_track", Weight: 20, Reason: "Test"},
		}
		score := scorer.CalculateWeightedScore(factors)
		t.Logf("Weighted score: %d", score)
	})

	t.Run("Update weights with positive feedback", func(t *testing.T) {
		scorer := NewAdaptiveRiskScorer()
		factors := []RiskFactor{
			{Name: "slide_too_fast", Weight: 30, Reason: "Test"},
		}
		originalWeight := scorer.factorWeights["slide_too_fast"].CurrentWeight
		scorer.UpdateWeights(factors, true)
		if scorer.factorWeights["slide_too_fast"].CurrentWeight <= originalWeight {
			t.Error("Weight should increase with positive feedback")
		}
	})

	t.Run("Update weights with negative feedback", func(t *testing.T) {
		scorer := NewAdaptiveRiskScorer()
		factors := []RiskFactor{
			{Name: "slide_too_fast", Weight: 30, Reason: "Test"},
		}
		originalWeight := scorer.factorWeights["slide_too_fast"].CurrentWeight
		scorer.UpdateWeights(factors, false)
		if scorer.factorWeights["slide_too_fast"].CurrentWeight >= originalWeight {
			t.Error("Weight should decrease with negative feedback")
		}
	})

	t.Run("Calculate risk with adaptive weights", func(t *testing.T) {
		cfg := config.DefaultRiskConfig()
		engine := NewRiskEngine(cfg, nil, nil)
		scorer := NewAdaptiveRiskScorer()
		ctx := context.Background()

		behavior := &BehaviorData{
			SessionID: "test-adaptive",
			MouseTracks: []MouseTrack{
				{X: 100, Y: 100, Timestamp: 0},
				{X: 150, Y: 100, Timestamp: 50},
				{X: 200, Y: 100, Timestamp: 100},
				{X: 250, Y: 100, Timestamp: 150},
			},
			SlideStart: 0,
			SlideEnd:   300,
		}

		result := engine.CalculateRiskWithAdaptiveWeights(ctx, behavior, "192.168.1.1", "example.com", scorer)
		t.Logf("Adaptive risk score: %d, Level: %s", result.Score, result.Level)
	})
}
