const crypto = require('crypto');

jest.mock('../../config/database/db', () => ({
  query: jest.fn(),
}));

jest.mock('./cacheService', () => ({
  get: jest.fn(),
  set: jest.fn(),
  invalidatePattern: jest.fn(),
  isHealthy: jest.fn(),
}));

const pool = require('../../config/database/db');
const cacheService = require('./cacheService');
const apiKeyService = require('./api-key-service');

describe('API Key Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    apiKeyService.resetStats();
  });

  describe('generateApiKey', () => {
    it('should generate a valid API key with correct prefix', () => {
      const result = apiKeyService.generateApiKey();

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('key');
      expect(result).toHaveProperty('hashedKey');
      expect(result.key).toMatch(/^hjtpx_[a-f0-9]{64}$/);
    });

    it('should generate unique keys', () => {
      const key1 = apiKeyService.generateApiKey();
      const key2 = apiKeyService.generateApiKey();

      expect(key1.key).not.toBe(key2.key);
      expect(key1.id).not.toBe(key2.id);
    });
  });

  describe('hashKey', () => {
    it('should hash a key consistently', () => {
      const key = 'test_key';
      const hash1 = apiKeyService.hashKey(key);
      const hash2 = apiKeyService.hashKey(key);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64);
    });

    it('should produce different hashes for different keys', () => {
      const hash1 = apiKeyService.hashKey('key1');
      const hash2 = apiKeyService.hashKey('key2');

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('createApiKey', () => {
    it('should create an API key in database', async () => {
      pool.query.mockResolvedValue({
        rows: [{
          id: 'test-id',
          owner: 'owner-id',
          name: 'Test Key',
          permissions: '["read"]',
          rate_limit: 100,
          expires_at: null,
          created_at: new Date(),
          is_active: true,
        }],
      });
      cacheService.set.mockResolvedValue(true);
      cacheService.invalidatePattern.mockResolvedValue(true);

      const result = await apiKeyService.createApiKey({
        owner: 'owner-id',
        name: 'Test Key',
        permissions: ['read'],
        rateLimit: 100,
      });

      expect(pool.query).toHaveBeenCalled();
      expect(result).toHaveProperty('key');
      expect(result.name).toBe('Test Key');
      expect(result.permissions).toEqual(['read']);
    });

    it('should handle database errors', async () => {
      pool.query.mockRejectedValue(new Error('Database error'));

      await expect(apiKeyService.createApiKey({
        owner: 'owner-id',
        name: 'Test Key',
      })).rejects.toThrow('Database error');
    });
  });

  describe('validateApiKey', () => {
    it('should return invalid for missing key', async () => {
      const result = await apiKeyService.validateApiKey(null);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('MISSING_KEY');
    });

    it('should return invalid for wrong format', async () => {
      const result = await apiKeyService.validateApiKey('wrong_format_key');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('INVALID_FORMAT');
    });

    it('should validate a valid API key', async () => {
      const hashedKey = apiKeyService.hashKey('hjtpx_testkey');
      cacheService.get.mockResolvedValue(null);
      pool.query.mockResolvedValue({
        rows: [{
          id: 'test-id',
          owner: 'owner-id',
          name: 'Test Key',
          permissions: '["read"]',
          rate_limit: 100,
          expires_at: null,
          is_active: true,
          created_at: new Date(),
          owner_email: 'test@example.com',
          owner_name: 'Test User',
        }],
      });
      cacheService.set.mockResolvedValue(true);

      const result = await apiKeyService.validateApiKey('hjtpx_testkey');

      expect(result.valid).toBe(true);
      expect(result.data).toHaveProperty('id');
      expect(result.data.permissions).toEqual(['read']);
    });

    it('should return invalid for inactive key', async () => {
      cacheService.get.mockResolvedValue(null);
      pool.query.mockResolvedValue({
        rows: [{
          id: 'test-id',
          owner: 'owner-id',
          name: 'Test Key',
          permissions: '["read"]',
          rate_limit: 100,
          expires_at: null,
          is_active: false,
          created_at: new Date(),
          owner_email: 'test@example.com',
          owner_name: 'Test User',
        }],
      });

      const result = await apiKeyService.validateApiKey('hjtpx_testkey');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('INACTIVE_KEY');
    });

    it('should return invalid for expired key', async () => {
      cacheService.get.mockResolvedValue(null);
      pool.query.mockResolvedValue({
        rows: [{
          id: 'test-id',
          owner: 'owner-id',
          name: 'Test Key',
          permissions: '["read"]',
          rate_limit: 100,
          expires_at: new Date(Date.now() - 86400000),
          is_active: true,
          created_at: new Date(),
          owner_email: 'test@example.com',
          owner_name: 'Test User',
        }],
      });

      const result = await apiKeyService.validateApiKey('hjtpx_testkey');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('EXPIRED_KEY');
    });
  });

  describe('revokeApiKey', () => {
    it('should revoke an API key', async () => {
      pool.query.mockResolvedValue({ rows: [{ id: 'test-id' }] });
      cacheService.invalidatePattern.mockResolvedValue(true);

      const result = await apiKeyService.revokeApiKey('test-id', 'owner-id');

      expect(result).toBe(true);
      expect(pool.query).toHaveBeenCalled();
    });

    it('should throw error for non-existent key', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      await expect(apiKeyService.revokeApiKey('test-id', 'owner-id'))
        .rejects.toThrow('API key not found or access denied');
    });
  });

  describe('listApiKeys', () => {
    it('should list all API keys for an owner', async () => {
      cacheService.get.mockResolvedValue(null);
      pool.query.mockResolvedValue({
        rows: [
          { id: 'key1', name: 'Key 1', permissions: '["read"]' },
          { id: 'key2', name: 'Key 2', permissions: '["read", "write"]' },
        ],
      });
      cacheService.set.mockResolvedValue(true);

      const result = await apiKeyService.listApiKeys('owner-id');

      expect(result).toHaveLength(2);
      expect(result[0].permissions).toEqual(['read']);
      expect(result[1].permissions).toEqual(['read', 'write']);
    });

    it('should return cached results if available', async () => {
      const cachedKeys = [{ id: 'key1', name: 'Cached Key' }];
      cacheService.get.mockResolvedValue(cachedKeys);

      const result = await apiKeyService.listApiKeys('owner-id');

      expect(result).toEqual(cachedKeys);
      expect(pool.query).not.toHaveBeenCalled();
    });
  });

  describe('checkPermissions', () => {
    it('should return true for allowed permission', async () => {
      pool.query.mockResolvedValue({
        rows: [{ permissions: '["read", "write"]' }],
      });

      const result = await apiKeyService.checkPermissions('key-id', 'read');

      expect(result).toBe(true);
    });

    it('should return false for denied permission', async () => {
      pool.query.mockResolvedValue({
        rows: [{ permissions: '["read"]' }],
      });

      const result = await apiKeyService.checkPermissions('key-id', 'admin');

      expect(result).toBe(false);
    });

    it('should return true for admin permission', async () => {
      pool.query.mockResolvedValue({
        rows: [{ permissions: '["admin"]' }],
      });

      const result = await apiKeyService.checkPermissions('key-id', 'read');

      expect(result).toBe(true);
    });
  });

  describe('getStats', () => {
    it('should return service statistics', () => {
      const stats = apiKeyService.getStats();

      expect(stats).toHaveProperty('validations');
      expect(stats).toHaveProperty('validationsSuccess');
      expect(stats).toHaveProperty('validationsFailure');
      expect(stats).toHaveProperty('creations');
      expect(stats).toHaveProperty('successRate');
    });
  });
});
