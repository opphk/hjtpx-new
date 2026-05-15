package resilience

import (
	"sync"
	"time"
)

type TokenBucket struct {
	capacity   int64
	tokens     int64
	refillRate int64
	lastRefill time.Time
	mu         sync.Mutex
}

func NewTokenBucket(capacity, refillRate int64) *TokenBucket {
	return &TokenBucket{
		capacity:   capacity,
		tokens:     capacity,
		refillRate: refillRate,
		lastRefill: time.Now(),
	}
}

func (b *TokenBucket) Allow() bool {
	return b.AllowN(1)
}

func (b *TokenBucket) AllowN(n int64) bool {
	b.mu.Lock()
	defer b.mu.Unlock()

	b.refill()

	if b.tokens >= n {
		b.tokens -= n
		return true
	}

	return false
}

func (b *TokenBucket) refill() {
	now := time.Now()
	elapsed := now.Sub(b.lastRefill)

	tokensToAdd := int64(elapsed.Seconds()) * b.refillRate
	if tokensToAdd > 0 {
		b.tokens = min(b.capacity, b.tokens+tokensToAdd)
		b.lastRefill = now
	}
}

func (b *TokenBucket) GetTokens() int64 {
	b.mu.Lock()
	defer b.mu.Unlock()
	b.refill()
	return b.tokens
}

// SlidingWindowLimiter implements a sliding window rate limiter using a circular buffer for better performance.
// Optimizations:
// - Uses circular buffer instead of dynamic slice to avoid reallocations
// - Tracks start/end indices for O(1) buffer operations
// - Pre-allocates buffer to maxRequests size
type SlidingWindowLimiter struct {
	windowSize   time.Duration
	maxRequests  int64
	requests     []time.Time
	start        int
	end          int
	mu           sync.Mutex
}

func NewSlidingWindowLimiter(windowSize time.Duration, maxRequests int64) *SlidingWindowLimiter {
	return &SlidingWindowLimiter{
		windowSize:   windowSize,
		maxRequests:  maxRequests,
		requests:     make([]time.Time, maxRequests+1), // +1 for circular buffer logic
		start:        0,
		end:          0,
	}
}

// Allow implements the sliding window rate limiting logic with circular buffer optimization.
// Time complexity: O(n) in worst case for cleanup, but with much lower constant factor due to pre-allocated buffer
func (l *SlidingWindowLimiter) Allow() bool {
	l.mu.Lock()
	defer l.mu.Unlock()

	now := time.Now()
	cutoff := now.Add(-l.windowSize)

	// Clean up expired requests by incrementing start index
	for l.start != l.end {
		if l.requests[l.start].After(cutoff) {
			break
		}
		l.start = (l.start + 1) % len(l.requests)
	}

	// Check if window is full
	count := (l.end - l.start + len(l.requests)) % len(l.requests)
	if int64(count) >= l.maxRequests {
		return false
	}

	// Add new request
	l.requests[l.end] = now
	l.end = (l.end + 1) % len(l.requests)
	return true
}

func (l *SlidingWindowLimiter) GetCount() int64 {
	l.mu.Lock()
	defer l.mu.Unlock()

	now := time.Now()
	cutoff := now.Add(-l.windowSize)

	// Clean up expired requests by incrementing start index
	for l.start != l.end {
		if l.requests[l.start].After(cutoff) {
			break
		}
		l.start = (l.start + 1) % len(l.requests)
	}

	count := (l.end - l.start + len(l.requests)) % len(l.requests)
	return int64(count)
}

type AdaptiveRateLimiter struct {
	tokenBucket     *TokenBucket
	slidingWindow   *SlidingWindowLimiter
	enabled         bool
	mu              sync.RWMutex
}

func NewAdaptiveRateLimiter(requestsPerSec, burstSize int64) *AdaptiveRateLimiter {
	return &AdaptiveRateLimiter{
		tokenBucket:   NewTokenBucket(burstSize, requestsPerSec),
		slidingWindow: NewSlidingWindowLimiter(1*time.Second, requestsPerSec),
		enabled:       true,
	}
}

func (a *AdaptiveRateLimiter) Allow() bool {
	a.mu.RLock()
	defer a.mu.RUnlock()

	if !a.enabled {
		return true
	}

	return a.tokenBucket.Allow() && a.slidingWindow.Allow()
}

func (a *AdaptiveRateLimiter) Enable() {
	a.mu.Lock()
	defer a.mu.Unlock()
	a.enabled = true
}

func (a *AdaptiveRateLimiter) Disable() {
	a.mu.Lock()
	defer a.mu.Unlock()
	a.enabled = false
}

func (a *AdaptiveRateLimiter) IsEnabled() bool {
	a.mu.RLock()
	defer a.mu.RUnlock()
	return a.enabled
}
