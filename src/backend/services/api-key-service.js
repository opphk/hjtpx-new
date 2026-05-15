const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const pool = require('../../config/database/db');
const cacheService = require('./cacheService');

const API_KEY_LENGTH = 32;
const API_KEY_PREFIX = 'hjtpx_';
const CACHE_TTL = {
  API_KEY: 300,
  API_KEY_LIST: 60,
};

class ApiKeyService {
  constructor() {
    this.stats = {
      validations: 0,
      validationsSuccess: 0,
      validationsFailure: 0,
      creations: 0,
      revocations: 0,
      errors: 0,
    };
  }

  async generateApiKey() {
    const keyId = uuidv4();
    const randomBytes = crypto.randomBytes(API_KEY_LENGTH).toString('hex');
    const key = `${API_KEY_PREFIX}${randomBytes}`;
    const hashedKey = this.hashKey(key);
    
    return {
      id: keyId,
      key,
      hashedKey,
    };
  }

  hashKey(key) {
    return crypto.createHash('sha256').update(key).digest('hex');
  }

  async createApiKey({ owner, name, permissions = ['read'], rateLimit = 100, expiresAt = null }) {
    try {
      const { id, key, hashedKey } = await this.generateApiKey();
      
      const query = `
        INSERT INTO api_keys (id, owner, name, hashed_key, permissions, rate_limit, expires_at, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        RETURNING id, owner, name, permissions, rate_limit, expires_at, created_at, is_active
      `;
      
      const values = [id, owner, name, hashedKey, JSON.stringify(permissions), rateLimit, expiresAt];
      const result = await pool.query(query, values);
      
      const apiKeyData = {
        ...result.rows[0],
        permissions: JSON.parse(result.rows[0].permissions),
      };
      
      await cacheService.set(`apikey:${id}`, apiKeyData, CACHE_TTL.API_KEY);
      await cacheService.invalidatePattern(`apikeys:${owner}:*`);
      
      this.stats.creations++;
      
      return {
        ...apiKeyData,
        key,
      };
    } catch (error) {
      this.stats.errors++;
      console.error('Create API Key Error:', error);
      throw error;
    }
  }

  async validateApiKey(key) {
    this.stats.validations++;
    
    try {
      if (!key || typeof key !== 'string') {
        this.stats.validationsFailure++;
        return {
          valid: false,
          error: 'MISSING_KEY',
          message: 'API key is required',
        };
      }
      
      if (!key.startsWith(API_KEY_PREFIX)) {
        this.stats.validationsFailure++;
        return {
          valid: false,
          error: 'INVALID_FORMAT',
          message: 'Invalid API key format',
        };
      }
      
      const hashedKey = this.hashKey(key);
      
      const cacheKey = `apikey:hash:${hashedKey}`;
      const cachedData = await cacheService.get(cacheKey);
      
      if (cachedData) {
        this.stats.validationsSuccess++;
        return {
          valid: true,
          data: cachedData,
        };
      }
      
      const query = `
        SELECT ak.id, ak.owner, ak.name, ak.permissions, ak.rate_limit, 
               ak.expires_at, ak.is_active, ak.created_at,
               u.email as owner_email, u.name as owner_name
        FROM api_keys ak
        JOIN users u ON ak.owner = u.id
        WHERE ak.hashed_key = $1
      `;
      
      const result = await pool.query(query, [hashedKey]);
      
      if (result.rows.length === 0) {
        this.stats.validationsFailure++;
        return {
          valid: false,
          error: 'NOT_FOUND',
          message: 'API key not found',
        };
      }
      
      const apiKey = result.rows[0];
      
      if (!apiKey.is_active) {
        this.stats.validationsFailure++;
        return {
          valid: false,
          error: 'INACTIVE_KEY',
          message: 'API key has been deactivated',
        };
      }
      
      if (apiKey.expires_at && new Date(apiKey.expires_at) < new Date()) {
        this.stats.validationsFailure++;
        return {
          valid: false,
          error: 'EXPIRED_KEY',
          message: 'API key has expired',
        };
      }
      
      const apiKeyData = {
        id: apiKey.id,
        owner: apiKey.owner,
        name: apiKey.name,
        permissions: JSON.parse(apiKey.permissions),
        rateLimit: apiKey.rate_limit,
        expiresAt: apiKey.expires_at,
        createdAt: apiKey.created_at,
        ownerEmail: apiKey.owner_email,
        ownerName: apiKey.owner_name,
      };
      
      await cacheService.set(cacheKey, apiKeyData, CACHE_TTL.API_KEY);
      await cacheService.set(`apikey:${apiKey.id}`, apiKeyData, CACHE_TTL.API_KEY);
      
      this.stats.validationsSuccess++;
      
      return {
        valid: true,
        data: apiKeyData,
      };
    } catch (error) {
      this.stats.errors++;
      this.stats.validationsFailure++;
      console.error('Validate API Key Error:', error);
      return {
        valid: false,
        error: 'VALIDATION_ERROR',
        message: 'Error validating API key',
      };
    }
  }

  async listApiKeys(ownerId) {
    try {
      const cacheKey = `apikeys:${ownerId}:list`;
      const cached = await cacheService.get(cacheKey);
      
      if (cached) {
        return cached;
      }
      
      const query = `
        SELECT id, owner, name, permissions, rate_limit, expires_at, 
               created_at, updated_at, is_active
        FROM api_keys
        WHERE owner = $1
        ORDER BY created_at DESC
      `;
      
      const result = await pool.query(query, [ownerId]);
      
      const apiKeys = result.rows.map(row => ({
        ...row,
        permissions: JSON.parse(row.permissions),
      }));
      
      await cacheService.set(cacheKey, apiKeys, CACHE_TTL.API_KEY_LIST);
      
      return apiKeys;
    } catch (error) {
      this.stats.errors++;
      console.error('List API Keys Error:', error);
      throw error;
    }
  }

  async revokeApiKey(keyId, ownerId) {
    try {
      const query = `
        UPDATE api_keys
        SET is_active = false, updated_at = NOW()
        WHERE id = $1 AND owner = $2
        RETURNING id
      `;
      
      const result = await pool.query(query, [keyId, ownerId]);
      
      if (result.rows.length === 0) {
        throw new Error('API key not found or access denied');
      }
      
      await cacheService.invalidatePattern(`apikey:${keyId}:*`);
      await cacheService.invalidatePattern(`apikeys:${ownerId}:*`);
      
      this.stats.revocations++;
      
      return true;
    } catch (error) {
      this.stats.errors++;
      console.error('Revoke API Key Error:', error);
      throw error;
    }
  }

  async rotateApiKey(keyId, ownerId) {
    try {
      const { key, hashedKey } = await this.generateApiKey();
      
      const query = `
        UPDATE api_keys
        SET hashed_key = $1, updated_at = NOW()
        WHERE id = $2 AND owner = $3 AND is_active = true
        RETURNING id
      `;
      
      const result = await pool.query(query, [hashedKey, keyId, ownerId]);
      
      if (result.rows.length === 0) {
        throw new Error('API key not found or access denied');
      }
      
      await cacheService.invalidatePattern(`apikey:${keyId}:*`);
      
      return {
        id: keyId,
        key,
      };
    } catch (error) {
      this.stats.errors++;
      console.error('Rotate API Key Error:', error);
      throw error;
    }
  }

  async updateApiKey(keyId, ownerId, updates) {
    try {
      const allowedFields = ['name', 'permissions', 'rate_limit', 'expires_at'];
      const setClause = [];
      const values = [];
      let paramIndex = 1;
      
      for (const [field, value] of Object.entries(updates)) {
        if (allowedFields.includes(field)) {
          setClause.push(`${field} = $${paramIndex}`);
          values.push(field === 'permissions' ? JSON.stringify(value) : value);
          paramIndex++;
        }
      }
      
      if (setClause.length === 0) {
        throw new Error('No valid fields to update');
      }
      
      setClause.push(`updated_at = NOW()`);
      values.push(keyId, ownerId);
      
      const query = `
        UPDATE api_keys
        SET ${setClause.join(', ')}
        WHERE id = $${paramIndex} AND owner = $${paramIndex + 1}
        RETURNING id, name, permissions, rate_limit, expires_at, is_active
      `;
      
      const result = await pool.query(query, values);
      
      if (result.rows.length === 0) {
        throw new Error('API key not found or access denied');
      }
      
      await cacheService.invalidatePattern(`apikey:${keyId}:*`);
      
      return {
        ...result.rows[0],
        permissions: JSON.parse(result.rows[0].permissions),
      };
    } catch (error) {
      this.stats.errors++;
      console.error('Update API Key Error:', error);
      throw error;
    }
  }

  async checkPermissions(apiKeyId, requiredPermission) {
    try {
      const query = `
        SELECT permissions FROM api_keys
        WHERE id = $1 AND is_active = true
      `;
      
      const result = await pool.query(query, [apiKeyId]);
      
      if (result.rows.length === 0) {
        return false;
      }
      
      const permissions = JSON.parse(result.rows[0].permissions);
      return permissions.includes(requiredPermission) || permissions.includes('admin');
    } catch (error) {
      this.stats.errors++;
      console.error('Check Permissions Error:', error);
      return false;
    }
  }

  async getApiKeyStats(keyId) {
    try {
      const query = `
        SELECT 
          ak.id,
          ak.name,
          ak.created_at,
          ak.expires_at,
          ak.is_active,
          COUNT(DISTINCT ur.id) as total_requests,
          COUNT(DISTINCT CASE WHEN ur.created_at > NOW() - INTERVAL '24 hours' THEN ur.id END) as requests_24h,
          COUNT(DISTINCT CASE WHEN ur.created_at > NOW() - INTERVAL '30 days' THEN ur.id END) as requests_30d
        FROM api_keys ak
        LEFT JOIN usage_records ur ON ak.id = ur.api_key_id
        WHERE ak.id = $1
        GROUP BY ak.id, ak.name, ak.created_at, ak.expires_at, ak.is_active
      `;
      
      const result = await pool.query(query, [keyId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return {
        id: result.rows[0].id,
        name: result.rows[0].name,
        createdAt: result.rows[0].created_at,
        expiresAt: result.rows[0].expires_at,
        isActive: result.rows[0].is_active,
        stats: {
          totalRequests: parseInt(result.rows[0].total_requests),
          requests24h: parseInt(result.rows[0].requests_24h),
          requests30d: parseInt(result.rows[0].requests_30d),
        },
      };
    } catch (error) {
      this.stats.errors++;
      console.error('Get API Key Stats Error:', error);
      throw error;
    }
  }

  getStats() {
    return {
      ...this.stats,
      successRate: this.stats.validations > 0 
        ? ((this.stats.validationsSuccess / this.stats.validations) * 100).toFixed(2) + '%'
        : '0%',
    };
  }

  resetStats() {
    this.stats = {
      validations: 0,
      validationsSuccess: 0,
      validationsFailure: 0,
      creations: 0,
      revocations: 0,
      errors: 0,
    };
  }
}

const apiKeyService = new ApiKeyService();

module.exports = apiKeyService;
