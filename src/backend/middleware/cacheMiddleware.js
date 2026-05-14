const cacheService = require('../services/cacheService');

const CACHEABLE_METHODS = ['GET', 'HEAD'];
const DEFAULT_TTL = 300;

const cacheConfig = {
  '/api/v1/users': { ttl: 60, isPublic: false, tags: ['users'] },
  '/api/v1/notifications': { ttl: 30, isPublic: false, tags: ['notifications'] },
  '/api/v1/health': { ttl: 5, isPublic: true, tags: ['health'] },
  '/api/v1/analytics': { ttl: 60, isPublic: false, tags: ['analytics'] },
  '/api/docs': { ttl: 3600, isPublic: true, tags: ['docs'] }
};

function generateCacheKey(req) {
  const base = `${req.method}:${req.originalUrl}`;
  
  if (req.user) {
    return `${base}:user:${req.user.id}`;
  }
  
  const queryKeys = Object.keys(req.query).sort();
  if (queryKeys.length > 0) {
    const queryHash = queryKeys.map(k => `${k}=${req.query[k]}`).join('&');
    return `${base}:${queryHash}`;
  }
  
  return base;
}

function shouldCache(req) {
  if (!CACHEABLE_METHODS.includes(req.method)) {
    return false;
  }
  
  if (req.query.noCache === 'true' || req.headers['cache-control']?.includes('no-cache')) {
    return false;
  }
  
  if (req.user && req.user.role === 'admin') {
    return false;
  }
  
  return true;
}

function getCacheConfig(path) {
  for (const [pattern, config] of Object.entries(cacheConfig)) {
    if (path.startsWith(pattern)) {
      return config;
    }
  }
  return { ttl: DEFAULT_TTL, isPublic: true, tags: [] };
}

function apiCache(ttl = DEFAULT_TTL, options = {}) {
  return async (req, res, next) => {
    if (!shouldCache(req)) {
      return next();
    }

    const cacheKey = generateCacheKey(req);
    const config = getCacheConfig(req.path);
    const effectiveTtl = options.ttl || config.ttl || ttl;
    const tags = options.tags || config.tags || [];
    
    try {
      const cachedResponse = await cacheService.getCachedApiResponse(cacheKey);
      
      if (cachedResponse) {
        res.set('X-Cache', 'HIT');
        res.set('X-Cache-Key', cacheKey);
        res.set('X-Cache-TTL', effectiveTtl.toString());
        
        if (req.xhr || req.headers.accept?.includes('application/json')) {
          return res.json(cachedResponse);
        }
        return res.send(cachedResponse);
      }

      res.set('X-Cache', 'MISS');
      res.set('X-Cache-Key', cacheKey);

      const originalJson = res.json.bind(res);
      const originalSend = res.send.bind(res);
      let responseData = null;
      let hasCached = false;

      res.json = (data) => {
        if (!hasCached && res.statusCode === 200) {
          responseData = data;
          hasCached = true;
        }
        return originalJson(data);
      };

      res.send = (data) => {
        if (!hasCached && res.statusCode === 200 && typeof data !== 'string' || !data.startsWith('<')) {
          responseData = data;
          hasCached = true;
        }
        return originalSend(data);
      };

      res.on('finish', async () => {
        if (responseData && res.statusCode === 200) {
          await cacheService.setCachedApiResponse(
            cacheKey,
            responseData,
            config.isPublic,
            effectiveTtl,
            tags
          );
        }
      });

      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      next();
    }
  };
}

function invalidateCache(pattern = '*') {
  return async (req, res, next) => {
    try {
      await cacheService.invalidateApiCache(pattern);
      next();
    } catch (error) {
      console.error('Cache invalidation error:', error);
      next();
    }
  };
}

function invalidateCacheByTag(tag) {
  return async (req, res, next) => {
    try {
      await cacheService.invalidateTag(tag);
      next();
    } catch (error) {
      console.error('Tag cache invalidation error:', error);
      next();
    }
  };
}

function userCacheMiddleware() {
  return async (req, res, next) => {
    if (req.method !== 'GET' || !req.user) {
      return next();
    }

    try {
      const userId = req.user.id;
      const cacheKey = `user:${userId}`;
      
      const cachedUser = await cacheService.getCachedUser(cacheKey);
      
      if (cachedUser) {
        res.set('X-User-Cache', 'HIT');
        req.cachedUser = cachedUser;
      } else {
        res.set('X-User-Cache', 'MISS');
      }
      
      const originalJson = res.json.bind(res);
      res.json = (data) => {
        if (res.statusCode === 200 && data && data.data && data.data.id === userId) {
          cacheService.setCachedUser(cacheKey, data.data, undefined, [`user:${userId}`, 'user']).catch(() => {});
        }
        return originalJson(data);
      };

      next();
    } catch (error) {
      console.error('User cache middleware error:', error);
      next();
    }
  };
}

function cacheStatsMiddleware() {
  return async (req, res, next) => {
    if (req.path === '/api/v1/cache/stats' && req.method === 'GET') {
      try {
        const stats = cacheService.getStats();
        return res.success(stats, 'Cache statistics retrieved successfully');
      } catch (error) {
        console.error('Cache stats error:', error);
        return res.error('Failed to retrieve cache statistics', 500);
      }
    }
    next();
  };
}

module.exports = {
  apiCache,
  invalidateCache,
  invalidateCacheByTag,
  userCacheMiddleware,
  cacheStatsMiddleware,
  shouldCache,
  generateCacheKey,
  getCacheConfig,
  cacheConfig
};
