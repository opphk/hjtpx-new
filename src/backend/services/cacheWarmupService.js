const cacheService = require('../services/cacheService');

class CacheWarmupService {
  constructor() {
    this.isWarmingUp = false;
    this.warmupQueue = [];
    this.warmupInterval = parseInt(process.env.CACHE_WARMUP_INTERVAL) || 3600000;
    this.intervalId = null;
  }

  async warmup() {
    if (this.isWarmingUp) {
      console.log('Cache warmup already in progress');
      return;
    }

    this.isWarmingUp = true;
    console.log('Starting cache warmup...');
    const startTime = Date.now();

    try {
      for (const warmupFn of this.warmupQueue) {
        try {
          await warmupFn();
        } catch (error) {
          console.error('Warmup function failed:', error);
        }
      }

      const duration = Date.now() - startTime;
      console.log(`Cache warmup completed in ${duration}ms`);
    } catch (error) {
      console.error('Cache warmup failed:', error);
    } finally {
      this.isWarmingUp = false;
    }
  }

  registerWarmup(key, fetchFn, ttl = 300) {
    this.warmupQueue.push(async () => {
      console.log(`Warming up cache: ${key}`);
      try {
        const data = await fetchFn();
        await cacheService.set(key, data, ttl);
        console.log(`Cache warmed up: ${key}`);
      } catch (error) {
        console.error(`Failed to warm up ${key}:`, error);
      }
    });
  }

  registerUserCacheWarmup() {
    this.registerWarmup('users:all', async () => {
      const userService = require('../services/userService');
      return userService.getAllUsers();
    }, 300);
  }

  registerStatsWarmup() {
    this.registerWarmup('system:stats', async () => {
      const db = require('../../config/database/db');
      const result = await db.query('SELECT COUNT(*) as count FROM users');
      return {
        userCount: result.rows[0]?.count || 0,
        timestamp: new Date().toISOString()
      };
    }, 60);
  }

  startAutoWarmup() {
    if (this.intervalId) {
      return;
    }

    this.registerUserCacheWarmup();
    this.registerStatsWarmup();

    this.warmup();

    this.intervalId = setInterval(() => {
      this.warmup();
    }, this.warmupInterval);

    console.log(`Auto warmup started (interval: ${this.warmupInterval}ms)`);
  }

  stopAutoWarmup() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('Auto warmup stopped');
    }
  }

  getStatus() {
    return {
      isWarmingUp: this.isWarmingUp,
      warmupQueueSize: this.warmupQueue.length,
      autoWarmupActive: !!this.intervalId,
      interval: this.warmupInterval
    };
  }
}

const cacheWarmupService = new CacheWarmupService();

module.exports = cacheWarmupService;
