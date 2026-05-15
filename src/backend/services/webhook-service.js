const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const pool = require('../../config/database/db');
const cacheService = require('./cacheService');

const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAYS = [1000, 5000, 30000];
const WEBHOOK_TIMEOUT = 10000;
const CACHE_TTL = {
  WEBHOOK: 300,
  WEBHOOK_LIST: 60,
};

const WEBHOOK_EVENTS = {
  REQUEST_COMPLETED: 'request.completed',
  REQUEST_FAILED: 'request.failed',
  RATE_LIMITED: 'rate.limited',
  KEY_EXPIRED: 'key.expired',
  KEY_CREATED: 'key.created',
  KEY_REVOKED: 'key.revoked',
  QUOTA_WARNING: 'quota.warning',
  QUOTA_EXCEEDED: 'quota.exceeded',
};

class WebhookService {
  constructor() {
    this.stats = {
      webhooksCreated: 0,
      webhooksDeleted: 0,
      deliveriesAttempted: 0,
      deliveriesSuccess: 0,
      deliveriesFailed: 0,
      retries: 0,
      signatureVerifications: 0,
      signatureFailures: 0,
      errors: 0,
    };
    this.retryQueue = new Map();
    this.activeDeliveries = new Map();
  }

  async createWebhook({ owner, url, events, secret }) {
    try {
      const webhookId = uuidv4();
      const signingSecret = secret || crypto.randomBytes(32).toString('hex');

      const query = `
        INSERT INTO webhooks (id, owner, url, events, signing_secret, is_active, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())
        RETURNING id, owner, url, events, is_active, created_at, updated_at
      `;

      const values = [webhookId, owner, url, JSON.stringify(events), signingSecret];
      const result = await pool.query(query, values);

      const webhook = {
        ...result.rows[0],
        events: JSON.parse(result.rows[0].events),
      };

      await cacheService.set(`webhook:${webhookId}`, webhook, CACHE_TTL.WEBHOOK);
      await cacheService.invalidatePattern(`webhooks:${owner}:*`);

      this.stats.webhooksCreated++;

      return {
        ...webhook,
        signingSecret,
      };
    } catch (error) {
      this.stats.errors++;
      console.error('Create Webhook Error:', error);
      throw error;
    }
  }

  async getWebhook(webhookId) {
    try {
      const cached = await cacheService.get(`webhook:${webhookId}`);
      if (cached) {
        return cached;
      }

      const query = `
        SELECT id, owner, url, events, is_active, created_at, updated_at, last_triggered_at, success_rate
        FROM webhooks
        WHERE id = $1
      `;

      const result = await pool.query(query, [webhookId]);

      if (result.rows.length === 0) {
        return null;
      }

      const webhook = {
        ...result.rows[0],
        events: JSON.parse(result.rows[0].events),
      };

      await cacheService.set(`webhook:${webhookId}`, webhook, CACHE_TTL.WEBHOOK);

      return webhook;
    } catch (error) {
      this.stats.errors++;
      console.error('Get Webhook Error:', error);
      throw error;
    }
  }

  async listWebhooks(ownerId) {
    try {
      const cacheKey = `webhooks:${ownerId}:list`;
      const cached = await cacheService.get(cacheKey);

      if (cached) {
        return cached;
      }

      const query = `
        SELECT id, owner, url, events, is_active, created_at, updated_at, 
               last_triggered_at, success_rate, total_deliveries, failed_deliveries
        FROM webhooks
        WHERE owner = $1
        ORDER BY created_at DESC
      `;

      const result = await pool.query(query, [ownerId]);

      const webhooks = result.rows.map(row => ({
        ...row,
        events: JSON.parse(row.events),
        successRate: row.total_deliveries > 0
          ? (((row.total_deliveries - row.failed_deliveries) / row.total_deliveries) * 100).toFixed(2) + '%'
          : '0%',
      }));

      await cacheService.set(cacheKey, webhooks, CACHE_TTL.WEBHOOK_LIST);

      return webhooks;
    } catch (error) {
      this.stats.errors++;
      console.error('List Webhooks Error:', error);
      throw error;
    }
  }

  async updateWebhook(webhookId, ownerId, updates) {
    try {
      const allowedFields = ['url', 'events', 'is_active'];
      const setClause = [];
      const values = [];
      let paramIndex = 1;

      for (const [field, value] of Object.entries(updates)) {
        if (allowedFields.includes(field)) {
          setClause.push(`${field} = $${paramIndex}`);
          values.push(field === 'events' ? JSON.stringify(value) : value);
          paramIndex++;
        }
      }

      if (setClause.length === 0) {
        throw new Error('No valid fields to update');
      }

      setClause.push(`updated_at = NOW()`);
      values.push(webhookId, ownerId);

      const query = `
        UPDATE webhooks
        SET ${setClause.join(', ')}
        WHERE id = $${paramIndex} AND owner = $${paramIndex + 1}
        RETURNING id, url, events, is_active, updated_at
      `;

      const result = await pool.query(query, values);

      if (result.rows.length === 0) {
        throw new Error('Webhook not found or access denied');
      }

      await cacheService.invalidatePattern(`webhook:${webhookId}`);
      await cacheService.invalidatePattern(`webhooks:${ownerId}:*`);

      return {
        ...result.rows[0],
        events: JSON.parse(result.rows[0].events),
      };
    } catch (error) {
      this.stats.errors++;
      console.error('Update Webhook Error:', error);
      throw error;
    }
  }

  async deleteWebhook(webhookId, ownerId) {
    try {
      const query = `
        DELETE FROM webhooks
        WHERE id = $1 AND owner = $2
        RETURNING id
      `;

      const result = await pool.query(query, [webhookId, ownerId]);

      if (result.rows.length === 0) {
        throw new Error('Webhook not found or access denied');
      }

      await cacheService.invalidatePattern(`webhook:${webhookId}`);
      await cacheService.invalidatePattern(`webhooks:${ownerId}:*`);

      this.stats.webhooksDeleted++;

      return true;
    } catch (error) {
      this.stats.errors++;
      console.error('Delete Webhook Error:', error);
      throw error;
    }
  }

  async triggerWebhook(apiKeyId, event, payload) {
    try {
      const query = `
        SELECT w.id, w.url, w.signing_secret, w.owner, ak.name as api_key_name
        FROM webhooks w
        JOIN api_keys ak ON w.owner = ak.owner
        WHERE ak.id = $1
          AND w.is_active = true
          AND $2 = ANY(w.events)
      `;

      const result = await pool.query(query, [apiKeyId, event]);

      const deliveries = [];

      for (const webhook of result.rows) {
        const delivery = await this.deliverWebhook(webhook, event, payload);
        deliveries.push(delivery);
      }

      return deliveries;
    } catch (error) {
      this.stats.errors++;
      console.error('Trigger Webhook Error:', error);
      throw error;
    }
  }

  async deliverWebhook(webhook, event, payload) {
    const deliveryId = uuidv4();
    const timestamp = Math.floor(Date.now() / 1000);

    const payloadToSign = JSON.stringify({ ...payload, timestamp });
    const signature = this.generateSignature(payloadToSign, webhook.signing_secret);

    const deliveryData = {
      id: deliveryId,
      webhookId: webhook.id,
      event,
      payload,
      url: webhook.url,
      attempts: 0,
      status: 'pending',
      createdAt: new Date(),
    };

    this.activeDeliveries.set(deliveryId, deliveryData);

    try {
      const response = await this.makeDeliveryRequest(webhook.url, {
        event,
        timestamp,
        signature,
        data: payload,
      });

      await this.recordDelivery(deliveryId, webhook.id, event, {
        status: 'success',
        statusCode: response.statusCode,
        response: response.body,
      });

      this.activeDeliveries.delete(deliveryId);
      this.stats.deliveriesSuccess++;

      return {
        deliveryId,
        status: 'success',
        statusCode: response.statusCode,
      };
    } catch (error) {
      this.activeDeliveries.delete(deliveryId);
      this.stats.deliveriesFailed++;

      await this.recordDelivery(deliveryId, webhook.id, event, {
        status: 'failed',
        error: error.message,
      });

      this.scheduleRetry(webhook, event, payload, 0);

      return {
        deliveryId,
        status: 'failed',
        error: error.message,
        willRetry: true,
      };
    }
  }

  async makeDeliveryRequest(url, body) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Webhook delivery timeout'));
      }, WEBHOOK_TIMEOUT);

      const postData = JSON.stringify(body);

      const urlObj = new URL(url);
      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
          'User-Agent': 'HJTPX-Webhook/1.0',
          'X-Webhook-Event': body.event,
          'X-Webhook-Timestamp': body.timestamp.toString(),
        },
      };

      const protocol = urlObj.protocol === 'https:' ? require('https') : require('http');

      const req = protocol.request(options, (res) => {
        let responseBody = '';

        res.on('data', (chunk) => {
          responseBody += chunk;
        });

        res.on('end', () => {
          clearTimeout(timeout);

          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({
              statusCode: res.statusCode,
              body: responseBody,
            });
          } else {
            reject(new Error(`Webhook delivery failed with status ${res.statusCode}`));
          }
        });
      });

      req.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });

      req.write(postData);
      req.end();
    });
  }

  generateSignature(payload, secret) {
    return crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
  }

  verifySignature(payload, signature, secret) {
    this.stats.signatureVerifications++;

    try {
      const expectedSignature = this.generateSignature(payload, secret);

      const isValid = crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );

      return isValid;
    } catch (error) {
      this.stats.signatureFailures++;
      return false;
    }
  }

  scheduleRetry(webhook, event, payload, attemptNumber) {
    if (attemptNumber >= MAX_RETRY_ATTEMPTS) {
      console.log(`Webhook ${webhook.id} failed after ${MAX_RETRY_ATTEMPTS} attempts`);
      return;
    }

    const delay = RETRY_DELAYS[attemptNumber] || RETRY_DELAYS[RETRY_DELAYS.length - 1];

    setTimeout(() => {
      this.retryDelivery(webhook, event, payload, attemptNumber + 1);
    }, delay);
  }

  async retryDelivery(webhook, event, payload, attemptNumber) {
    this.stats.retries++;

    const deliveryId = uuidv4();
    const timestamp = Math.floor(Date.now() / 1000);
    const payloadToSign = JSON.stringify({ ...payload, timestamp });
    const signature = this.generateSignature(payloadToSign, webhook.signing_secret);

    try {
      const response = await this.makeDeliveryRequest(webhook.url, {
        event,
        timestamp,
        signature,
        data: payload,
        attempt: attemptNumber,
      });

      await this.recordDelivery(deliveryId, webhook.id, event, {
        status: 'success',
        statusCode: response.statusCode,
        response: response.body,
        attempt: attemptNumber,
      });

      this.stats.deliveriesSuccess++;

      return {
        deliveryId,
        status: 'success',
        attempt: attemptNumber,
      };
    } catch (error) {
      await this.recordDelivery(deliveryId, webhook.id, event, {
        status: 'failed',
        error: error.message,
        attempt: attemptNumber,
      });

      this.scheduleRetry(webhook, event, payload, attemptNumber);

      return {
        deliveryId,
        status: 'failed',
        error: error.message,
        attempt: attemptNumber,
        willRetry: attemptNumber < MAX_RETRY_ATTEMPTS,
      };
    }
  }

  async recordDelivery(deliveryId, webhookId, event, result) {
    try {
      const query = `
        INSERT INTO webhook_deliveries (id, webhook_id, event, status, status_code, response_body, error_message, attempt, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      `;

      await pool.query(query, [
        deliveryId,
        webhookId,
        event,
        result.status,
        result.statusCode || null,
        result.response || null,
        result.error || null,
        result.attempt || 0,
      ]);

      const updateQuery = `
        UPDATE webhooks
        SET last_triggered_at = NOW(),
            total_deliveries = total_deliveries + 1,
            failed_deliveries = failed_deliveries + $1,
            success_rate = CASE 
              WHEN (total_deliveries + 1) > 0 
              THEN ((total_deliveries - $1::int + 1)::float / (total_deliveries + 1)) * 100 
              ELSE 100 
            END
        WHERE id = $2
      `;

      await pool.query(updateQuery, [result.status === 'failed' ? 1 : 0, webhookId]);

      await cacheService.invalidatePattern(`webhook:${webhookId}`);
    } catch (error) {
      console.error('Record Delivery Error:', error);
    }
  }

  async getDeliveryHistory(webhookId, options = {}) {
    try {
      const { limit = 50, offset = 0 } = options;

      const query = `
        SELECT id, webhook_id, event, status, status_code, response_body, 
               error_message, attempt, created_at
        FROM webhook_deliveries
        WHERE webhook_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `;

      const result = await pool.query(query, [webhookId, limit, offset]);

      return result.rows;
    } catch (error) {
      this.stats.errors++;
      console.error('Get Delivery History Error:', error);
      throw error;
    }
  }

  async testWebhook(webhookId, ownerId) {
    try {
      const webhook = await this.getWebhook(webhookId);

      if (!webhook || webhook.owner !== ownerId) {
        throw new Error('Webhook not found or access denied');
      }

      const testPayload = {
        type: 'test',
        message: 'This is a test webhook delivery',
        timestamp: new Date().toISOString(),
      };

      const delivery = await this.deliverWebhook(webhook, 'test', testPayload);

      return {
        success: delivery.status === 'success',
        delivery,
        message: delivery.status === 'success'
          ? 'Test webhook delivered successfully'
          : `Test webhook delivery failed: ${delivery.error}`,
      };
    } catch (error) {
      this.stats.errors++;
      console.error('Test Webhook Error:', error);
      throw error;
    }
  }

  async getWebhookStats(webhookId) {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_deliveries,
          COUNT(CASE WHEN status = 'success' THEN 1 END) as successful_deliveries,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_deliveries,
          COUNT(CASE WHEN created_at > NOW() - INTERVAL '24 hours' THEN 1 END) as deliveries_24h,
          AVG(CASE WHEN status = 'success' THEN extract(epoch from (updated_at - created_at)) END) as avg_delivery_time
        FROM webhook_deliveries
        WHERE webhook_id = $1
      `;

      const result = await pool.query(query, [webhookId]);

      const stats = result.rows[0];

      return {
        totalDeliveries: parseInt(stats.total_deliveries),
        successfulDeliveries: parseInt(stats.successful_deliveries),
        failedDeliveries: parseInt(stats.failed_deliveries),
        deliveries24h: parseInt(stats.deliveries_24h),
        successRate: stats.total_deliveries > 0
          ? ((stats.successful_deliveries / stats.total_deliveries) * 100).toFixed(2) + '%'
          : '0%',
        avgDeliveryTime: stats.avg_delivery_time
          ? parseFloat(stats.avg_delivery_time).toFixed(2) + 's'
          : '0s',
      };
    } catch (error) {
      this.stats.errors++;
      console.error('Get Webhook Stats Error:', error);
      throw error;
    }
  }

  async validateWebhookUrl(url) {
    try {
      const urlObj = new URL(url);

      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return { valid: false, reason: 'Invalid protocol' };
      }

      if (['localhost', '127.0.0.1', '0.0.0.0'].includes(urlObj.hostname)) {
        return { valid: false, reason: 'Localhost URLs are not allowed' };
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, reason: 'Invalid URL format' };
    }
  }

  getStats() {
    return {
      ...this.stats,
      activeDeliveries: this.activeDeliveries.size,
      queuedRetries: this.retryQueue.size,
    };
  }

  resetStats() {
    this.stats = {
      webhooksCreated: 0,
      webhooksDeleted: 0,
      deliveriesAttempted: 0,
      deliveriesSuccess: 0,
      deliveriesFailed: 0,
      retries: 0,
      signatureVerifications: 0,
      signatureFailures: 0,
      errors: 0,
    };
  }
}

const webhookService = new WebhookService();

module.exports = webhookService;
module.exports.WEBHOOK_EVENTS = WEBHOOK_EVENTS;
module.exports.MAX_RETRY_ATTEMPTS = MAX_RETRY_ATTEMPTS;
