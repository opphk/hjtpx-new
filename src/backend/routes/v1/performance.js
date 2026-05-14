const express = require('express');
const router = express.Router();
const { performanceMonitor } = require('../middleware/performanceMonitor');
const cacheService = require('../services/cacheService');
const queryOptimizer = require('../utils/queryOptimizer');
const db = require('../../config/database/db');

router.get('/metrics', (req, res) => {
  try {
    const metrics = performanceMonitor.getMetrics();
    res.success(metrics);
  } catch (error) {
    res.error(error.message, 500);
  }
});

router.get('/metrics/health', async (req, res) => {
  try {
    const health = performanceMonitor.healthCheck();
    const cacheStats = cacheService.getStats();
    const poolStats = db.getPoolStats ? await db.getPoolStats() : {};
    const queryCacheStats = queryOptimizer.getCacheStats();

    res.success({
      performance: health,
      cache: cacheStats,
      database: poolStats,
      queryCache: queryCacheStats
    });
  } catch (error) {
    res.error(error.message, 500);
  }
});

router.get('/metrics/endpoints', (req, res) => {
  try {
    const metrics = performanceMonitor.getMetrics();
    res.success({
      endpoints: metrics.topSlowEndpoints,
      errors: metrics.topErrorEndpoints
    });
  } catch (error) {
    res.error(error.message, 500);
  }
});

router.post('/metrics/reset', (req, res) => {
  try {
    performanceMonitor.resetMetrics();
    queryOptimizer.clearCache();
    res.success({ message: 'Metrics reset successfully' });
  } catch (error) {
    res.error(error.message, 500);
  }
});

router.get('/cache/stats', (req, res) => {
  try {
    const stats = cacheService.getStats();
    res.success(stats);
  } catch (error) {
    res.error(error.message, 500);
  }
});

router.post('/cache/clear', (req, res) => {
  try {
    cacheService.clear();
    queryOptimizer.clearCache();
    res.success({ message: 'Cache cleared successfully' });
  } catch (error) {
    res.error(error.message, 500);
  }
});

router.post('/cache/invalidate/:pattern', (req, res) => {
  try {
    const { pattern } = req.params;
    cacheService.invalidatePattern(pattern);
    res.success({ message: `Pattern ${pattern} invalidated` });
  } catch (error) {
    res.error(error.message, 500);
  }
});

router.get('/database/stats', async (req, res) => {
  try {
    const poolStats = await db.getPoolStats();
    const health = await db.healthCheck();
    res.success({
      pool: poolStats,
      database: health
    });
  } catch (error) {
    res.error(error.message, 500);
  }
});

router.post('/database/explain', async (req, res) => {
  try {
    const { query, params } = req.body;
    if (!query) {
      return res.badRequest('Query is required');
    }
    const explainResult = await queryOptimizer.explainQuery(query, params);
    res.success(explainResult);
  } catch (error) {
    res.error(error.message, 500);
  }
});

router.get('/system/info', (req, res) => {
  try {
    const info = {
      pid: process.pid,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      platform: process.platform,
      nodeVersion: process.version,
      env: {
        nodeEnv: process.env.NODE_ENV,
        port: process.env.PORT
      }
    };
    res.success(info);
  } catch (error) {
    res.error(error.message, 500);
  }
});

module.exports = router;
