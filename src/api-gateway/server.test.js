const request = require('supertest');
const express = require('express');

jest.mock('../backend/services/cacheService', () => ({
  get: jest.fn(),
  set: jest.fn(),
  invalidatePattern: jest.fn(),
  isHealthy: jest.fn(() => Promise.resolve(true)),
}));

jest.mock('../backend/services/api-key-service', () => ({
  validateApiKey: jest.fn(),
  createApiKey: jest.fn(),
  listApiKeys: jest.fn(),
  revokeApiKey: jest.fn(),
}));

jest.mock('../backend/services/usage-tracking', () => ({
  recordRequest: jest.fn(),
  getUsageStats: jest.fn(),
  getBillingInfo: jest.fn(),
}));

jest.mock('../backend/services/webhook-service', () => ({
  createWebhook: jest.fn(),
  listWebhooks: jest.fn(),
  deleteWebhook: jest.fn(),
}));

jest.mock('../backend/services/api-docs-generator', () => ({
  generateOpenAPISpec: jest.fn(() => ({ openapi: '3.0.0', info: { title: 'Test API' } })),
  generateMarkdownDocs: jest.fn(() => '# Test Documentation'),
}));

const cacheService = require('../backend/services/cacheService');
const apiKeyService = require('../backend/services/api-key-service');
const usageTracking = require('../backend/services/usage-tracking');
const webhookService = require('../backend/services/webhook-service');
const apiDocsGenerator = require('../backend/services/api-docs-generator');

const { app } = require('../api-gateway/server');

describe('API Gateway Server', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /health', () => {
    it('should return healthy status', async () => {
      const response = await request(app)
        .get('/health')
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('healthy');
      expect(response.body.services).toBeDefined();
      expect(response.body.timestamp).toBeDefined();
    });

    it('should include all service statuses', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.services.redis).toBe(true);
      expect(response.body.services.apiKey).toBe(true);
      expect(response.body.services.usageTracking).toBe(true);
      expect(response.body.services.webhook).toBe(true);
    });
  });

  describe('GET /ready', () => {
    it('should return ready status', async () => {
      const response = await request(app)
        .get('/ready')
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);
      expect(response.body.ready).toBe(true);
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('GET /docs/openapi.json', () => {
    it('should return OpenAPI specification', async () => {
      const response = await request(app)
        .get('/docs/openapi.json')
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);
      expect(response.body.openapi).toBe('3.0.0');
      expect(response.body.info.title).toBe('Test API');
    });
  });

  describe('GET /docs/markdown', () => {
    it('should return Markdown documentation', async () => {
      const response = await request(app)
        .get('/docs/markdown')
        .expect('Content-Type', /text\/markdown/);

      expect(response.status).toBe(200);
      expect(response.text).toContain('# Test Documentation');
    });
  });

  describe('404 Handler', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await request(app)
        .get('/unknown/route')
        .expect('Content-Type', /json/);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('Request ID', () => {
    it('should generate unique request ID', async () => {
      const response = await request(app)
        .get('/ready');

      expect(response.headers['x-request-id']).toBeDefined();
      expect(response.headers['x-request-id']).toMatch(/^[a-f0-9-]{36}$/);
    });

    it('should use provided request ID from header', async () => {
      const customId = 'custom-request-id-123';
      const response = await request(app)
        .get('/ready')
        .set('X-Request-ID', customId);

      expect(response.headers['x-request-id']).toBe(customId);
    });
  });

  describe('API Key Authentication', () => {
    const validApiKey = 'hjtpx_valid_test_key_123456789012345678901234567890123456789012345678';

    beforeEach(() => {
      apiKeyService.validateApiKey.mockResolvedValue({
        valid: true,
        data: {
          id: 'key-123',
          owner: 'owner-456',
          name: 'Test Key',
          permissions: ['read'],
        },
      });
    });

    it('should reject requests without API key', async () => {
      const response = await request(app)
        .get('/usage/stats')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('MISSING_API_KEY');
    });

    it('should accept requests with valid API key', async () => {
      usageTracking.getUsageStats.mockResolvedValue({
        summary: { totalRequests: 100 },
        period: [],
      });

      const response = await request(app)
        .get('/usage/stats')
        .set('X-API-Key', validApiKey)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(apiKeyService.validateApiKey).toHaveBeenCalledWith(validApiKey);
    });

    it('should reject invalid API keys', async () => {
      apiKeyService.validateApiKey.mockResolvedValue({
        valid: false,
        error: 'INVALID_API_KEY',
        message: 'Invalid or expired API key',
      });

      const response = await request(app)
        .get('/usage/stats')
        .set('X-API-Key', 'invalid_key')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_API_KEY');
    });
  });

  describe('API Key Management', () => {
    const validApiKey = 'hjtpx_valid_test_key_123456789012345678901234567890123456789012345678';

    beforeEach(() => {
      apiKeyService.validateApiKey.mockResolvedValue({
        valid: true,
        data: {
          id: 'key-123',
          owner: 'owner-456',
          name: 'Admin Key',
          permissions: ['admin'],
        },
      });
    });

    it('should create a new API key', async () => {
      const newKey = {
        id: 'new-key-id',
        key: 'hjtpx_new_key_abcdef12345678901234567890123456789012345678901234567890123456',
        name: 'New Key',
        permissions: ['read'],
      };

      apiKeyService.createApiKey.mockResolvedValue(newKey);

      const response = await request(app)
        .post('/api-keys')
        .set('X-API-Key', validApiKey)
        .send({ name: 'New Key', permissions: ['read'] })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.key).toBeDefined();
    });

    it('should list API keys', async () => {
      const keys = [
        { id: 'key-1', name: 'Key 1' },
        { id: 'key-2', name: 'Key 2' },
      ];

      apiKeyService.listApiKeys.mockResolvedValue(keys);

      const response = await request(app)
        .get('/api-keys')
        .set('X-API-Key', validApiKey)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });

    it('should revoke an API key', async () => {
      apiKeyService.revokeApiKey.mockResolvedValue(true);

      const response = await request(app)
        .delete('/api-keys/key-123')
        .set('X-API-Key', validApiKey)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('API key revoked successfully');
    });
  });

  describe('Usage Statistics', () => {
    const validApiKey = 'hjtpx_valid_test_key_123456789012345678901234567890123456789012345678';

    beforeEach(() => {
      apiKeyService.validateApiKey.mockResolvedValue({
        valid: true,
        data: {
          id: 'key-123',
          owner: 'owner-456',
          name: 'Test Key',
          permissions: ['read'],
        },
      });
    });

    it('should return usage statistics', async () => {
      const stats = {
        summary: {
          totalRequests: 1000,
          totalErrors: 10,
          avgResponseTime: '150ms',
          errorRate: '1%',
          uniqueEndpoints: 5,
        },
        period: [],
      };

      usageTracking.getUsageStats.mockResolvedValue(stats);

      const response = await request(app)
        .get('/usage/stats')
        .set('X-API-Key', validApiKey)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.summary.totalRequests).toBe(1000);
    });

    it('should accept query parameters for date range', async () => {
      usageTracking.getUsageStats.mockResolvedValue({
        summary: { totalRequests: 500 },
        period: [],
      });

      const response = await request(app)
        .get('/usage/stats')
        .query({ startDate: '2024-01-01', endDate: '2024-01-31', granularity: 'day' })
        .set('X-API-Key', validApiKey)
        .expect(200);

      expect(usageTracking.getUsageStats).toHaveBeenCalledWith(
        'key-123',
        expect.objectContaining({
          startDate: '2024-01-01',
          endDate: '2024-01-31',
          granularity: 'day',
        })
      );
    });
  });

  describe('Billing Information', () => {
    const validApiKey = 'hjtpx_valid_test_key_123456789012345678901234567890123456789012345678';

    beforeEach(() => {
      apiKeyService.validateApiKey.mockResolvedValue({
        valid: true,
        data: {
          id: 'key-123',
          owner: 'owner-456',
          name: 'Test Key',
          permissions: ['read'],
        },
      });
    });

    it('should return billing information', async () => {
      const billing = {
        currentBilling: {
          period: { start: '2024-01-01', end: '2024-01-31' },
          plan: { name: 'Professional', price: 49.99 },
          billing: { total: 49.99, currency: 'USD' },
        },
        availablePlans: [],
      };

      usageTracking.getBillingInfo.mockResolvedValue(billing);

      const response = await request(app)
        .get('/usage/billing')
        .set('X-API-Key', validApiKey)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.currentBilling.plan.name).toBe('Professional');
    });
  });

  describe('Webhook Management', () => {
    const validApiKey = 'hjtpx_valid_test_key_123456789012345678901234567890123456789012345678';

    beforeEach(() => {
      apiKeyService.validateApiKey.mockResolvedValue({
        valid: true,
        data: {
          id: 'key-123',
          owner: 'owner-456',
          name: 'Test Key',
          permissions: ['admin'],
        },
      });
    });

    it('should create a webhook', async () => {
      const webhook = {
        id: 'webhook-123',
        url: 'https://example.com/webhook',
        events: ['request.completed'],
        signingSecret: 'secret123',
      };

      webhookService.createWebhook.mockResolvedValue(webhook);

      const response = await request(app)
        .post('/webhooks')
        .set('X-API-Key', validApiKey)
        .send({
          url: 'https://example.com/webhook',
          events: ['request.completed'],
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.signingSecret).toBeDefined();
    });

    it('should list webhooks', async () => {
      const webhooks = [
        { id: 'webhook-1', url: 'https://example1.com/webhook' },
        { id: 'webhook-2', url: 'https://example2.com/webhook' },
      ];

      webhookService.listWebhooks.mockResolvedValue(webhooks);

      const response = await request(app)
        .get('/webhooks')
        .set('X-API-Key', validApiKey)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });

    it('should delete a webhook', async () => {
      webhookService.deleteWebhook.mockResolvedValue(true);

      const response = await request(app)
        .delete('/webhooks/webhook-123')
        .set('X-API-Key', validApiKey)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Webhook deleted successfully');
    });
  });
});
