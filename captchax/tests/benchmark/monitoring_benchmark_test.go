package benchmark

import (
	"testing"
	"time"

	"captchax/internal/monitoring"
)

func BenchmarkMetricsRecordRequest(b *testing.B) {
	m := monitoring.NewMetrics()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		m.RecordRequest(100*time.Millisecond, true)
	}
}

func BenchmarkMetricsSnapshot(b *testing.B) {
	m := monitoring.NewMetrics()
	for i := 0; i < 1000; i++ {
		m.RecordRequest(100*time.Millisecond, true)
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = m.Snapshot()
	}
}

func BenchmarkHistogramObserve(b *testing.B) {
	h := &monitoring.Histogram{}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		h.Observe(50 * time.Millisecond)
	}
}

// Additional monitoring benchmarks

func BenchmarkMetricsRecordCacheHit(b *testing.B) {
	m := monitoring.NewMetrics()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		m.RecordCacheHit()
	}
}

func BenchmarkMetricsRecordCacheMiss(b *testing.B) {
	m := monitoring.NewMetrics()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		m.RecordCacheMiss()
	}
}

func BenchmarkMetricsConcurrentRecordRequest(b *testing.B) {
	m := monitoring.NewMetrics()

	b.ResetTimer()
	b.RunParallel(func(pb *testing.PB) {
		for pb.Next() {
			m.RecordRequest(100*time.Millisecond, true)
		}
	})
}

func BenchmarkMetricsConcurrentRecordCache(b *testing.B) {
	m := monitoring.NewMetrics()

	b.ResetTimer()
	b.RunParallel(func(pb *testing.PB) {
		i := 0
		for pb.Next() {
			if i%2 == 0 {
				m.RecordCacheHit()
			} else {
				m.RecordCacheMiss()
			}
			i++
		}
	})
}

func BenchmarkHistogramConcurrentObserve(b *testing.B) {
	h := &monitoring.Histogram{}

	b.ResetTimer()
	b.RunParallel(func(pb *testing.PB) {
		for pb.Next() {
			h.Observe(50 * time.Millisecond)
		}
	})
}
