package benchmark

import (
	"testing"
	"time"

	"captchax/internal/resilience"
)

func BenchmarkTokenBucketAllow(b *testing.B) {
	tb := resilience.NewTokenBucket(1000, 100)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		tb.Allow()
	}
}

func BenchmarkTokenBucketAllowN(b *testing.B) {
	tb := resilience.NewTokenBucket(1000, 100)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		tb.AllowN(5)
	}
}

func BenchmarkSlidingWindowLimiter(b *testing.B) {
	swl := resilience.NewSlidingWindowLimiter(1*time.Second, 100)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		swl.Allow()
	}
}

func BenchmarkCircuitBreakerAllow(b *testing.B) {
	cb := resilience.NewCircuitBreaker(5, 2, 30*time.Second)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		cb.Allow()
	}
}

func BenchmarkCircuitBreakerRecordSuccess(b *testing.B) {
	cb := resilience.NewCircuitBreaker(5, 2, 30*time.Second)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		cb.RecordSuccess()
	}
}

func BenchmarkCircuitBreakerRecordFailure(b *testing.B) {
	cb := resilience.NewCircuitBreaker(5, 2, 30*time.Second)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		cb.RecordFailure()
	}
}

// Additional resilience benchmarks

func BenchmarkTokenBucketConcurrentAllow(b *testing.B) {
	tb := resilience.NewTokenBucket(10000, 1000)

	b.ResetTimer()
	b.RunParallel(func(pb *testing.PB) {
		for pb.Next() {
			tb.Allow()
		}
	})
}

func BenchmarkSlidingWindowLimiterConcurrent(b *testing.B) {
	swl := resilience.NewSlidingWindowLimiter(1*time.Second, 1000)

	b.ResetTimer()
	b.RunParallel(func(pb *testing.PB) {
		for pb.Next() {
			swl.Allow()
		}
	})
}

func BenchmarkSlidingWindowLimiterLargeWindow(b *testing.B) {
	swl := resilience.NewSlidingWindowLimiter(10*time.Second, 10000)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		swl.Allow()
	}
}

func BenchmarkCircuitBreakerConcurrentAllow(b *testing.B) {
	cb := resilience.NewCircuitBreaker(5, 2, 30*time.Second)

	b.ResetTimer()
	b.RunParallel(func(pb *testing.PB) {
		for pb.Next() {
			cb.Allow()
		}
	})
}

func BenchmarkCircuitBreakerStateTransitions(b *testing.B) {
	cb := resilience.NewCircuitBreaker(5, 2, 30*time.Second)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		cb.RecordFailure()
		cb.RecordFailure()
		cb.RecordFailure()
		cb.RecordFailure()
		cb.RecordFailure()
		cb.RecordSuccess()
		cb.RecordSuccess()
	}
}

func BenchmarkAdaptiveRateLimiterAllow(b *testing.B) {
	arl := resilience.NewAdaptiveRateLimiter(1000, 10000)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		arl.Allow()
	}
}
