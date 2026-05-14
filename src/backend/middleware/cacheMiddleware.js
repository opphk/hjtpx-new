const cacheService = require('../services/cacheService');

const CACHEABLE_METHODS = ['GET'];
const DEFAULT_TTL = 300;

const cacheConfig = {
  '/api/v1/users': { ttl: 60, isPublic: false },
  '/api/v1/notifications': { ttl: 30, isPublic: false },
  '/api/v1/health': { ttl: 5, isPublic: true },
  '/api/v1/analytics': { ttl: 60, isPublic: false },
  '/api/docs': { ttl: 3600, isPublic: true }
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
  
  if (req.query.noCache === 'true') {
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
  return { ttl: DEFAULT_TTL, isPublic: true };
}

function apiCache(ttl = DEFAULT_TTL, options = {}) {
  return async (req, res, next) => {
    if (!shouldCache(req)) {
      return next();
    }

    const cacheKey = generateCacheKey(req);
    
    try {
      const cachedResponse = await cacheService.getCachedApiResponse(cacheKey);
      
      if (cachedResponse) {
        res.set('X-Cache', 'HIT');
        res.set('X-Cache-Key', cacheKey);
        
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

      res.json = (data) => {
        responseData = data;
        return originalJson(data);
      };

      res.send = (data) => {
        if (typeof data === 'string' && data.startsWith('<')) {
          return originalSend(data);
        }
        responseData = data;
        return originalSend(data);
      };

      res.on('finish', async () => {
        if (responseData && res.statusCode === 200) {
          const config = getCacheConfig(req.path);
          const effectiveTtl = options.ttl || config.ttl || ttl;
          
          await cacheService.setCachedApiResponse(
            cacheKey,
            responseData,
            config.isPublic,
            effectiveTtl
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
          cacheService.setCachedUser(cacheKey, data.data).catch(() => {});
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

module.exports = {
  apiCache,
  invalidateCache,
  userCacheMiddleware,
  shouldCache,
  generateCacheKey,
  getCacheConfig,
  cacheConfig
};
