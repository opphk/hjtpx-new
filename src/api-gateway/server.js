const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const { v4: uuidv4 } = require('uuid');
const cacheService = require('../backend/services/cacheService');

const rateLimiter = require('../backend/middleware/rateLimiter');
const errorHandler = require('../backend/middleware/errorHandler');
const logger = require('../backend/middleware/logger');

const apiKeyService = require('../backend/services/api-key-service');
const usageTracking = require('../backend/services/usage-tracking');
const webhookService = require('../backend/services/webhook-service');
const apiDocsGenerator = require('../backend/services/api-docs-generator');

const API_GATEWAY_PORT = process.env.API_GATEWAY_PORT || 3000;
const REQUEST_TIMEOUT = process.env.REQUEST_TIMEOUT || 30000;

const app = express();

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Request-ID', 'X-API-Version'],
  exposedHeaders: ['X-Request-ID', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  credentials: true,
  maxAge: 86400,
}));

app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use((req, res, next) => {
  req.requestId = req.headers['x-request-id'] || uuidv4();
  res.setHeader('X-Request-ID', req.requestId);
  next();
});

const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logData = {
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      apiKey: req.headers['x-api-key']?.substring(0, 10) + '...',
    };
    
    if (res.statusCode >= 400) {
      console.error('API Request:', JSON.stringify(logData));
    } else {
      console.log('API Request:', JSON.stringify(logData));
    }
  });
  
  next();
};

app.use(requestLogger);

app.get('/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      redis: await cacheService.isHealthy(),
      apiKey: true,
      usageTracking: true,
      webhook: true,
    },
  };
  
  const isHealthy = Object.values(health.services).every(s => s === true);
  res.status(isHealthy ? 200 : 503).json(health);
});

app.get('/ready', (req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});

const authenticateApiKey = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'];
    
    if (!apiKey) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'MISSING_API_KEY',
          message: 'API key is required. Please provide X-API-Key header.',
        },
      });
    }
    
    const keyValidation = await apiKeyService.validateApiKey(apiKey);
    
    if (!keyValidation.valid) {
      return res.status(401).json({
        success: false,
        error: {
          code: keyValidation.error || 'INVALID_API_KEY',
          message: keyValidation.message || 'Invalid or expired API key.',
        },
      });
    }
    
    req.apiKeyData = keyValidation.data;
    req.apiKeyId = keyValidation.data.id;
    req.apiKeyOwner = keyValidation.data.owner;
    
    next();
  } catch (error) {
    console.error('API Key Authentication Error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'AUTH_ERROR',
        message: 'Authentication service error.',
      },
    });
  }
};

const apiRateLimiter = rateLimiter.createRateLimiter({
  windowMs: 60 * 1000,
  max: 100,
  keyGenerator: (req) => {
    return req.apiKeyId ? `apikey:${req.apiKeyId}` : `ip:${req.ip}`;
  },
  handler: (req, res) => {
    res.setHeader('X-RateLimit-Remaining', 0);
    res.setHeader('X-RateLimit-Reset', Math.ceil(Date.now() / 1000) + 60);
    
    return res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'API rate limit exceeded. Please slow down your requests.',
        retryAfter: 60,
      },
    });
  },
});

const trackUsage = async (req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', async () => {
    try {
      const duration = Date.now() - startTime;
      
      await usageTracking.recordRequest({
        apiKeyId: req.apiKeyId,
        endpoint: req.path,
        method: req.method,
        statusCode: res.statusCode,
        responseTime: duration,
        requestSize: parseInt(req.headers['content-length'] || 0),
        responseSize: parseInt(res.get('content-length') || 0),
        userAgent: req.headers['user-agent'],
        ip: req.ip,
        requestId: req.requestId,
      });
    } catch (error) {
      console.error('Usage Tracking Error:', error);
    }
  });
  
  next();
};

const ROUTES_CONFIG = {
  '/api/v1/captcha': {
    target: process.env.CAPTCHA_SERVICE_URL || 'http://localhost:8080',
    timeout: REQUEST_TIMEOUT,
  },
  '/api/v1/users': {
    target: process.env.USER_SERVICE_URL || 'http://localhost:8081',
    timeout: REQUEST_TIMEOUT,
  },
  '/api/v1/notifications': {
    target: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:8082',
    timeout: REQUEST_TIMEOUT,
  },
};

const setupRoutes = () => {
  app.use('/api/v1/*', authenticateApiKey);
  app.use('/api/v1/*', apiRateLimiter);
  app.use('/api/v1/*', trackUsage);
  
  Object.keys(ROUTES_CONFIG).forEach(routePrefix => {
    app.use(routePrefix, require('../backend/routes' + routePrefix.replace('/api/v1', '')));
  });
};

setupRoutes();

app.post('/api-keys', authenticateApiKey, async (req, res) => {
  try {
    const { name, permissions, rateLimit, expiresAt } = req.body;
    
    const result = await apiKeyService.createApiKey({
      owner: req.apiKeyOwner,
      name,
      permissions,
      rateLimit,
      expiresAt,
    });
    
    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Create API Key Error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CREATE_API_KEY_ERROR',
        message: error.message,
      },
    });
  }
});

app.get('/api-keys', authenticateApiKey, async (req, res) => {
  try {
    const apiKeys = await apiKeyService.listApiKeys(req.apiKeyOwner);
    
    res.json({
      success: true,
      data: apiKeys,
    });
  } catch (error) {
    console.error('List API Keys Error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'LIST_API_KEYS_ERROR',
        message: error.message,
      },
    });
  }
});

app.delete('/api-keys/:keyId', authenticateApiKey, async (req, res) => {
  try {
    const { keyId } = req.params;
    
    await apiKeyService.revokeApiKey(keyId, req.apiKeyOwner);
    
    res.json({
      success: true,
      message: 'API key revoked successfully',
    });
  } catch (error) {
    console.error('Revoke API Key Error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'REVOKE_API_KEY_ERROR',
        message: error.message,
      },
    });
  }
});

app.get('/usage/stats', authenticateApiKey, async (req, res) => {
  try {
    const { startDate, endDate, granularity } = req.query;
    
    const stats = await usageTracking.getUsageStats(req.apiKeyId, {
      startDate,
      endDate,
      granularity,
    });
    
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Get Usage Stats Error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'USAGE_STATS_ERROR',
        message: error.message,
      },
    });
  }
});

app.get('/usage/billing', authenticateApiKey, async (req, res) => {
  try {
    const { period } = req.query;
    
    const billing = await usageTracking.getBillingInfo(req.apiKeyId, period);
    
    res.json({
      success: true,
      data: billing,
    });
  } catch (error) {
    console.error('Get Billing Info Error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'BILLING_ERROR',
        message: error.message,
      },
    });
  }
});

app.post('/webhooks', authenticateApiKey, async (req, res) => {
  try {
    const { url, events, secret } = req.body;
    
    const webhook = await webhookService.createWebhook({
      owner: req.apiKeyOwner,
      url,
      events,
      secret,
    });
    
    res.status(201).json({
      success: true,
      data: webhook,
    });
  } catch (error) {
    console.error('Create Webhook Error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CREATE_WEBHOOK_ERROR',
        message: error.message,
      },
    });
  }
});

app.get('/webhooks', authenticateApiKey, async (req, res) => {
  try {
    const webhooks = await webhookService.listWebhooks(req.apiKeyOwner);
    
    res.json({
      success: true,
      data: webhooks,
    });
  } catch (error) {
    console.error('List Webhooks Error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'LIST_WEBHOOKS_ERROR',
        message: error.message,
      },
    });
  }
});

app.delete('/webhooks/:webhookId', authenticateApiKey, async (req, res) => {
  try {
    const { webhookId } = req.params;
    
    await webhookService.deleteWebhook(webhookId, req.apiKeyOwner);
    
    res.json({
      success: true,
      message: 'Webhook deleted successfully',
    });
  } catch (error) {
    console.error('Delete Webhook Error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DELETE_WEBHOOK_ERROR',
        message: error.message,
      },
    });
  }
});

app.get('/docs/openapi.json', (req, res) => {
  try {
    const openApiSpec = apiDocsGenerator.generateOpenAPISpec();
    res.json(openApiSpec);
  } catch (error) {
    console.error('Generate OpenAPI Spec Error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'OPENAPI_GENERATION_ERROR',
        message: error.message,
      },
    });
  }
});

app.get('/docs/markdown', (req, res) => {
  try {
    const markdown = apiDocsGenerator.generateMarkdownDocs();
    res.type('text/markdown').send(markdown);
  } catch (error) {
    console.error('Generate Markdown Docs Error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'MARKDOWN_GENERATION_ERROR',
        message: error.message,
      },
    });
  }
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    },
  });
});

app.use(errorHandler);

const startServer = () => {
  app.listen(API_GATEWAY_PORT, () => {
    console.log(`API Gateway running on port ${API_GATEWAY_PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Health check: http://localhost:${API_GATEWAY_PORT}/health`);
    console.log(`API docs: http://localhost:${API_GATEWAY_PORT}/docs/openapi.json`);
  });
};

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
