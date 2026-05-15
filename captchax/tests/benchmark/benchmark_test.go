package benchmark

import (
	"image"
	"image/color"
	"strconv"
	"testing"
	"time"

	"captchax/internal/optimization"
)

func createTestImage(width, height int) image.Image {
	img := image.NewRGBA(image.Rect(0, 0, width, height))
	for x := 0; x < width; x++ {
		for y := 0; y < height; y++ {
			img.Set(x, y, color.RGBA{
				R: uint8(x % 256),
				G: uint8(y % 256),
				B: uint8((x + y) % 256),
				A: 255,
			})
		}
	}
	return img
}

func BenchmarkImageGeneration(b *testing.B) {
	compressor := optimization.NewImageCompressor()
	img := createTestImage(300, 150)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, _ = compressor.CompressJPEG(img, 80)
	}
}

func BenchmarkCacheGet(b *testing.B) {
	cache := optimization.NewImageCache(1000, 10*time.Minute)
	cache.Set("test-key", []byte("test-data"))

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, _ = cache.Get("test-key")
	}
}

func BenchmarkCacheSet(b *testing.B) {
	cache := optimization.NewImageCache(1000, 10*time.Minute)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		cache.Set("test-key", []byte("test-data"))
	}
}

func BenchmarkCacheGetMiss(b *testing.B) {
	cache := optimization.NewImageCache(1000, 10*time.Minute)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, _ = cache.Get("non-existent-key")
	}
}

// Additional benchmarks for key paths

func BenchmarkCacheSetMultiple(b *testing.B) {
	cache := optimization.NewImageCache(10000, 10*time.Minute)
	keys := make([]string, 1000)
	for i := 0; i < 1000; i++ {
		keys[i] = "key-" + strconv.Itoa(i)
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		cache.Set(keys[i%1000], []byte("test-data"))
	}
}

func BenchmarkCacheConcurrentGet(b *testing.B) {
	cache := optimization.NewImageCache(1000, 10*time.Minute)
	cache.Set("test-key", []byte("test-data"))

	b.ResetTimer()
	b.RunParallel(func(pb *testing.PB) {
		for pb.Next() {
			_, _ = cache.Get("test-key")
		}
	})
}

func BenchmarkCacheConcurrentSet(b *testing.B) {
	cache := optimization.NewImageCache(1000, 10*time.Minute)

	b.ResetTimer()
	b.RunParallel(func(pb *testing.PB) {
		i := 0
		for pb.Next() {
			key := "key-" + strconv.Itoa(i%100)
			cache.Set(key, []byte("test-data"))
			i++
		}
	})
}

func BenchmarkCacheMixedOperations(b *testing.B) {
	cache := optimization.NewImageCache(1000, 10*time.Minute)
	for i := 0; i < 100; i++ {
		cache.Set("key-"+strconv.Itoa(i), []byte("test-data"))
	}

	b.ResetTimer()
	b.RunParallel(func(pb *testing.PB) {
		i := 0
		for pb.Next() {
			key := "key-" + strconv.Itoa(i%200)
			if i%2 == 0 {
				_, _ = cache.Get(key)
			} else {
				cache.Set(key, []byte("test-data"))
			}
			i++
		}
	})
}
