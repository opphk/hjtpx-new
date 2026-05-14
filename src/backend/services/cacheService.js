const redisClient = require('../../../config/redis/client');

class CacheService {
  constructor() {
    this.memoryCache = new Map();
    this.cacheTimers = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0
    };
    this.defaultTTL = 300;
    this.memoryCacheTTL = 60000;
    this.isRedisConnected = false;
    this.initRedisConnection();
  }

  async initRedisConnection() {
    try {
      if (!redisClient.isOpen) {
        await redisClient.connect();
      }
      this.isRedisConnected = true;
      redisClient.on('error', err => {
        console.error('Redis connection error:', err);
        this.isRedisConnected = false;
      });
      redisClient.on('connect', () => {
        this.isRedisConnected = true;
      });
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      this.isRedisConnected = false;
    }
  }

  async get(key) {
    try {
      if (this.isRedisConnected) {
        const redisValue = await redisClient.get(key);
        if (redisValue) {
          this.stats.hits++;
          return JSON.parse(redisValue);
        }
      }

      if (this.memoryCache.has(key)) {
        const memEntry = this.memoryCache.get(key);
        if (Date.now() < memEntry.expiresAt) {
          this.stats.hits++;
          if (this.isRedisConnected) {
            redisClient.setEx(key, this.defaultTTL, JSON.stringify(memEntry.value)).catch(() => {});
          }
          return memEntry.value;
        }
        this.memoryCache.delete(key);
      }

      this.stats.misses++;
      return null;
    } catch (error) {
      this.stats.errors++;
      console.error('Cache get error:', error);
      return null;
    }
  }

  async set(key, value, ttl = this.defaultTTL) {
    try {
      const serialized = JSON.stringify(value);

      if (this.isRedisConnected) {
        await redisClient.setEx(key, ttl, serialized);
      }

      this.memoryCache.set(key, {
        value,
        expiresAt: Date.now() + Math.min(ttl * 1000, this.memoryCacheTTL)
      });

      if (this.cacheTimers.has(key)) {
        clearTimeout(this.cacheTimers.get(key));
      }

      const timer = setTimeout(
        () => {
          this.memoryCache.delete(key);
          this.cacheTimers.delete(key);
        },
        Math.min(ttl * 1000, this.memoryCacheTTL)
      );

      this.cacheTimers.set(key, timer);
      this.stats.sets++;
      return true;
    } catch (error) {
      this.stats.errors++;
      console.error('Cache set error:', error);
      return false;
    }
  }

  async del(key) {
    try {
      if (this.isRedisConnected) {
        await redisClient.del(key);
      }

      this.memoryCache.delete(key);
      if (this.cacheTimers.has(key)) {
        clearTimeout(this.cacheTimers.get(key));
        this.cacheTimers.delete(key);
      }

      this.stats.deletes++;
      return true;
    } catch (error) {
      this.stats.errors++;
      console.error('Cache delete error:', error);
      return false;
    }
  }

  async invalidatePattern(pattern) {
    try {
      if (this.isRedisConnected) {
        const keys = await redisClient.keys(pattern);
        if (keys.length > 0) {
          await redisClient.del(keys);
        }
      }

      for (const key of this.memoryCache.keys()) {
        if (this.matchPattern(key, pattern)) {
          this.memoryCache.delete(key);
          if (this.cacheTimers.has(key)) {
            clearTimeout(this.cacheTimers.get(key));
            this.cacheTimers.delete(key);
          }
        }
      }

      return true;
    } catch (error) {
      this.stats.errors++;
      console.error('Cache invalidate error:', error);
      return false;
    }
  }

  matchPattern(key, pattern) {
    const regexPattern = pattern.replace(/\*/g, '.*').replace(/\?/g, '.');
    return new RegExp(`^${regexPattern}$`).test(key);
  }

  async getMulti(keys) {
    try {
      if (!this.isRedisConnected) {
        return keys.map(key => this.memoryCache.get(key)?.value || null);
      }

      const values = await redisClient.mGet(keys.map(k => k));
      return values.map(v => (v ? JSON.parse(v) : null));
    } catch (error) {
      this.stats.errors++;
      console.error('Cache getMulti error:', error);
      return keys.map(() => null);
    }
  }

  async setMulti(items, ttl = this.defaultTTL) {
    try {
      if (!this.isRedisConnected) {
        for (const [key, value] of Object.entries(items)) {
          await this.set(key, value, ttl);
        }
        return true;
      }

      const pipeline = redisClient.multi();
      for (const [key, value] of Object.entries(items)) {
        pipeline.setEx(key, ttl, JSON.stringify(value));
      }
      await pipeline.exec();

      for (const [key, value] of Object.entries(items)) {
        this.memoryCache.set(key, {
          value,
          expiresAt: Date.now() + Math.min(ttl * 1000, this.memoryCacheTTL)
        });
      }

      this.stats.sets += Object.keys(items).length;
      return true;
    } catch (error) {
      this.stats.errors++;
      console.error('Cache setMulti error:', error);
      return false;
    }
  }

  async clear() {
    try {
      if (this.isRedisConnected) {
        await redisClient.flushDb();
      }

      this.memoryCache.clear();
      for (const timer of this.cacheTimers.values()) {
        clearTimeout(timer);
      }
      this.cacheTimers.clear();

      return true;
    } catch (error) {
      this.stats.errors++;
      console.error('Cache clear error:', error);
      return false;
    }
  }

  getStats() {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      hitRate: total > 0 ? ((this.stats.hits / total) * 100).toFixed(2) + '%' : '0%',
      memoryCacheSize: this.memoryCache.size,
      isRedisConnected: this.isRedisConnected
    };
  }

  resetStats() {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0
    };
  }
}

const cacheService = new CacheService();

module.exports = cacheService;
