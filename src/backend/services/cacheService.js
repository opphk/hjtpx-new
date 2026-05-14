const redisClient = require('../../../config/redis/client');

const CACHE_KEYS = {
  SESSION: 'session:',
  USER: 'user:',
  API: 'api:',
  PERMISSIONS: 'permissions:',
  TOKEN_BLACKLIST: 'blacklist:',
  RATE_LIMIT: 'ratelimit:',
  ANALYTICS: 'analytics:'
};

const CACHE_TTL = {
  SESSION: 604800,
  USER: 1800,
  API_PUBLIC: 300,
  API_PRIVATE: 60,
  PERMISSIONS: 3600,
  TOKEN_BLACKLIST: 604800,
  RATE_LIMIT: 60,
  ANALYTICS: 300
};

class CacheService {
  constructor() {
    this.memoryCache = new Map();
    this.cacheTimers = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
      sessions: { hits: 0, misses: 0 },
      api: { hits: 0, misses: 0 },
      user: { hits: 0, misses: 0 }
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

  generateSessionKey(sessionToken) {
    return `${CACHE_KEYS.SESSION}${sessionToken}`;
  }

  generateUserKey(userId) {
    return `${CACHE_KEYS.USER}${userId}`;
  }

  generateApiKey(endpoint, userId = null, params = {}) {
    const base = `${CACHE_KEYS.API}${endpoint}`;
    if (userId) {
      return `${base}:user:${userId}`;
    }
    const paramHash = Object.keys(params).sort()
      .map(k => `${k}=${params[k]}`)
      .join('&');
    return paramHash ? `${base}:${paramHash}` : base;
  }

  async getSession(sessionToken) {
    const key = this.generateSessionKey(sessionToken);
    const cached = await this.get(key);
    if (cached) {
      this.stats.sessions.hits++;
      return cached;
    }
    this.stats.sessions.misses++;
    return null;
  }

  async setSession(sessionToken, sessionData, ttl = CACHE_TTL.SESSION) {
    const key = this.generateSessionKey(sessionToken);
    return await this.set(key, sessionData, ttl);
  }

  async invalidateSession(sessionToken) {
    const key = this.generateSessionKey(sessionToken);
    return await this.del(key);
  }

  async invalidateUserSessions(userId) {
    return await this.invalidatePattern(`${CACHE_KEYS.SESSION}*:${userId}*`);
  }

  async getCachedUser(userId) {
    const key = this.generateUserKey(userId);
    const cached = await this.get(key);
    if (cached) {
      this.stats.user.hits++;
      return cached;
    }
    this.stats.user.misses++;
    return null;
  }

  async setCachedUser(userId, userData, ttl = CACHE_TTL.USER) {
    const key = this.generateUserKey(userId);
    return await this.set(key, userData, ttl);
  }

  async invalidateUserCache(userId) {
    const key = this.generateUserKey(userId);
    return await this.del(key);
  }

  async getCachedApiResponse(key) {
    const fullKey = `${CACHE_KEYS.API}${key}`;
    const cached = await this.get(fullKey);
    if (cached) {
      this.stats.api.hits++;
      return cached;
    }
    this.stats.api.misses++;
    return null;
  }

  async setCachedApiResponse(key, responseData, isPublic = true, ttl = CACHE_TTL.API_PUBLIC) {
    const fullKey = `${CACHE_KEYS.API}${key}`;
    return await this.set(fullKey, responseData, isPublic ? CACHE_TTL.API_PUBLIC : CACHE_TTL.API_PRIVATE);
  }

  async invalidateApiCache(pattern = '*') {
    return await this.invalidatePattern(`${CACHE_KEYS.API}${pattern}`);
  }

  async invalidateAllUserCache(userId) {
    await Promise.all([
      this.invalidateUserCache(userId),
      this.invalidatePattern(`${CACHE_KEYS.API}*:user:${userId}*`),
      this.invalidatePattern(`${CACHE_KEYS.PERMISSIONS}${userId}`)
    ]);
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

  async isHealthy() {
    try {
      if (!this.isRedisConnected) {
        return false;
      }
      const pong = await redisClient.ping();
      return pong === 'PONG';
    } catch (error) {
      return false;
    }
  }

  getStats() {
    const total = this.stats.hits + this.stats.misses;
    const sessionTotal = this.stats.sessions.hits + this.stats.sessions.misses;
    const apiTotal = this.stats.api.hits + this.stats.api.misses;
    const userTotal = this.stats.user.hits + this.stats.user.misses;

    return {
      overall: {
        hits: this.stats.hits,
        misses: this.stats.misses,
        hitRate: total > 0 ? ((this.stats.hits / total) * 100).toFixed(2) + '%' : '0%',
        sets: this.stats.sets,
        deletes: this.stats.deletes,
        errors: this.stats.errors
      },
      session: {
        hits: this.stats.sessions.hits,
        misses: this.stats.sessions.misses,
        hitRate: sessionTotal > 0 ? ((this.stats.sessions.hits / sessionTotal) * 100).toFixed(2) + '%' : '0%'
      },
      api: {
        hits: this.stats.api.hits,
        misses: this.stats.api.misses,
        hitRate: apiTotal > 0 ? ((this.stats.api.hits / apiTotal) * 100).toFixed(2) + '%' : '0%'
      },
      user: {
        hits: this.stats.user.hits,
        misses: this.stats.user.misses,
        hitRate: userTotal > 0 ? ((this.stats.user.hits / userTotal) * 100).toFixed(2) + '%' : '0%'
      },
      memoryCacheSize: this.memoryCache.size,
      isRedisConnected: this.isRedisConnected,
      cacheKeys: CACHE_KEYS,
      cacheTTL: CACHE_TTL
    };
  }

  resetStats() {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
      sessions: { hits: 0, misses: 0 },
      api: { hits: 0, misses: 0 },
      user: { hits: 0, misses: 0 }
    };
  }
}

const cacheService = new CacheService();

module.exports = cacheService;
module.exports.CACHE_KEYS = CACHE_KEYS;
module.exports.CACHE_TTL = CACHE_TTL;
