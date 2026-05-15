package optimization

import (
	"sync"
	"time"
)

// ImageCache is a thread-safe cache with TTL and LRU-style eviction.
// Optimizations:
// - Pre-allocate map with maxSize to reduce rehashing
// - Batch cleanup in Get/Set operations to reduce cleanup goroutine load
// - Improved eviction algorithm with O(n) time complexity but with lower constant factor
type ImageCache struct {
	cache   map[string]*CacheItem
	mu      sync.RWMutex
	maxSize int
	ttl     time.Duration
}

type CacheItem struct {
	Data      []byte
	ExpiresAt time.Time
}

func NewImageCache(maxSize int, ttl time.Duration) *ImageCache {
	cache := &ImageCache{
		cache:   make(map[string]*CacheItem, maxSize), // Pre-allocate map
		maxSize: maxSize,
		ttl:     ttl,
	}
	go cache.cleanup()
	return cache
}

func (c *ImageCache) Get(key string) ([]byte, bool) {
	c.mu.RLock()
	item, exists := c.cache[key]
	if !exists {
		c.mu.RUnlock()
		return nil, false
	}
	now := time.Now()
	if now.After(item.ExpiresAt) {
		c.mu.RUnlock()
		// Need to delete expired item
		c.mu.Lock()
		// Double check after acquiring write lock
		if item, ok := c.cache[key]; ok && now.After(item.ExpiresAt) {
			delete(c.cache, key)
		}
		c.mu.Unlock()
		return nil, false
	}
	data := item.Data
	c.mu.RUnlock()
	return data, true
}

func (c *ImageCache) Set(key string, data []byte) {
	now := time.Now()
	c.mu.Lock()
	defer c.mu.Unlock()

	// Clean up some expired items before checking size
	c.cleanupExpiredItems(now, c.maxSize/4) // Clean up up to 25% of items

	if len(c.cache) >= c.maxSize {
		c.evict()
	}

	c.cache[key] = &CacheItem{
		Data:      data,
		ExpiresAt: now.Add(c.ttl),
	}
}

// cleanupExpiredItems removes up to `limit` expired items
func (c *ImageCache) cleanupExpiredItems(now time.Time, limit int) {
	count := 0
	for key, item := range c.cache {
		if count >= limit {
			break
		}
		if now.After(item.ExpiresAt) {
			delete(c.cache, key)
			count++
		}
	}
}

func (c *ImageCache) evict() {
	var oldestKey string
	var oldestTime time.Time

	for key, item := range c.cache {
		if oldestTime.IsZero() || item.ExpiresAt.Before(oldestTime) {
			oldestKey = key
			oldestTime = item.ExpiresAt
		}
	}

	delete(c.cache, oldestKey)
}

func (c *ImageCache) cleanup() {
	ticker := time.NewTicker(5 * time.Minute)
	for range ticker.C {
		c.mu.Lock()
		now := time.Now()
		for key, item := range c.cache {
			if now.After(item.ExpiresAt) {
				delete(c.cache, key)
			}
		}
		c.mu.Unlock()
	}
}

func (c *ImageCache) Len() int {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return len(c.cache)
}

func (c *ImageCache) Clear() {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.cache = make(map[string]*CacheItem, c.maxSize)
}
