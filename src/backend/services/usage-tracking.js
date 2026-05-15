const pool = require('../../config/database/db');
const cacheService = require('./cacheService');

const BILLING_PLANS = {
  FREE: {
    name: 'Free',
    monthlyRequests: 1000,
    pricePerThousand: 0,
    features: ['Basic Analytics', '1 Webhook'],
  },
  STARTER: {
    name: 'Starter',
    monthlyRequests: 10000,
    pricePerThousand: 0.5,
    features: ['Basic Analytics', '5 Webhooks', 'Email Support'],
  },
  PROFESSIONAL: {
    name: 'Professional',
    monthlyRequests: 100000,
    pricePerThousand: 0.3,
    features: ['Advanced Analytics', '25 Webhooks', 'Priority Support'],
  },
  ENTERPRISE: {
    name: 'Enterprise',
    monthlyRequests: Infinity,
    pricePerThousand: 0.2,
    features: ['Full Analytics', 'Unlimited Webhooks', '24/7 Support'],
  },
};

const GRANULARITIES = {
  MINUTE: 'minute',
  HOUR: 'hour',
  DAY: 'day',
  WEEK: 'week',
  MONTH: 'month',
};

class UsageTracking {
  constructor() {
    this.stats = {
      recordsTracked: 0,
      errors: 0,
      cacheHits: 0,
      cacheMisses: 0,
      billingCalculations: 0,
    };
    this.defaultGranularity = GRANULARITIES.HOUR;
    this.batchSize = 100;
    this.pendingRecords = [];
    this.flushInterval = 5000;
    this.startFlushTimer();
  }

  startFlushTimer() {
    setInterval(() => {
      this.flushPendingRecords();
    }, this.flushInterval);
  }

  async flushPendingRecords() {
    if (this.pendingRecords.length === 0) return;

    const recordsToFlush = this.pendingRecords.splice(0, this.batchSize);
    
    try {
      const values = recordsToFlush.map((r, i) => {
        const offset = i * 11;
        return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11})`;
      }).join(', ');

      const params = recordsToFlush.flatMap(r => [
        r.apiKeyId,
        r.endpoint,
        r.method,
        r.statusCode,
        r.responseTime,
        r.requestSize,
        r.responseSize,
        r.userAgent,
        r.ip,
        r.requestId,
        new Date(),
      ]);

      const query = `
        INSERT INTO usage_records 
        (api_key_id, endpoint, method, status_code, response_time, request_size, response_size, user_agent, ip, request_id, created_at)
        VALUES ${values}
      `;

      await pool.query(query, params);
      this.stats.recordsTracked += recordsToFlush.length;
    } catch (error) {
      this.stats.errors++;
      console.error('Flush Pending Records Error:', error);
      this.pendingRecords.unshift(...recordsToFlush);
    }
  }

  async recordRequest(requestData) {
    this.pendingRecords.push(requestData);

    if (this.pendingRecords.length >= this.batchSize) {
      await this.flushPendingRecords();
    }

    await this.updateRealTimeStats(requestData);
  }

  async updateRealTimeStats(requestData) {
    const { apiKeyId, endpoint, statusCode, responseTime } = requestData;
    const hourKey = `stats:realtime:${apiKeyId}:${new Date().toISOString().slice(0, 13)}`;

    try {
      const existing = await cacheService.get(hourKey);
      const stats = existing || {
        totalRequests: 0,
        totalErrors: 0,
        totalResponseTime: 0,
        endpoints: {},
        statusCodes: {},
      };

      stats.totalRequests++;
      stats.totalResponseTime += responseTime;

      if (statusCode >= 400) {
        stats.totalErrors++;
      }

      stats.statusCodes[statusCode] = (stats.statusCodes[statusCode] || 0) + 1;

      if (!stats.endpoints[endpoint]) {
        stats.endpoints[endpoint] = {
          requests: 0,
          errors: 0,
          avgResponseTime: 0,
        };
      }
      stats.endpoints[endpoint].requests++;
      if (statusCode >= 400) {
        stats.endpoints[endpoint].errors++;
      }

      await cacheService.set(hourKey, stats, 86400);
      this.stats.cacheHits++;
    } catch (error) {
      this.stats.errors++;
      this.stats.cacheMisses++;
      console.error('Update Real-time Stats Error:', error);
    }
  }

  async getUsageStats(apiKeyId, options = {}) {
    const { startDate, endDate, granularity = this.defaultGranularity } = options;
    const cacheKey = `usage:stats:${apiKeyId}:${startDate}:${endDate}:${granularity}`;

    try {
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        this.stats.cacheHits++;
        return cached;
      }
      this.stats.cacheMisses++;

      const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate) : new Date();

      const granularityInterval = this.getGranularityInterval(granularity);
      
      const query = `
        SELECT 
          DATE_TRUNC($4, created_at) as period,
          COUNT(*) as total_requests,
          COUNT(CASE WHEN status_code >= 400 THEN 1 END) as error_requests,
          AVG(response_time) as avg_response_time,
          SUM(request_size) as total_request_size,
          SUM(response_size) as total_response_size,
          COUNT(DISTINCT endpoint) as unique_endpoints
        FROM usage_records
        WHERE api_key_id = $1
          AND created_at >= $2
          AND created_at <= $3
        GROUP BY period
        ORDER BY period ASC
      `;

      const result = await pool.query(query, [apiKeyId, start, end, granularityInterval]);

      const stats = {
        summary: {
          totalRequests: 0,
          totalErrors: 0,
          avgResponseTime: 0,
          uniqueEndpoints: new Set(),
        },
        period: [],
      };

      result.rows.forEach(row => {
        const requests = parseInt(row.total_requests);
        const errors = parseInt(row.error_requests);
        
        stats.summary.totalRequests += requests;
        stats.summary.totalErrors += errors;
        stats.period.push({
          period: row.period,
          requests,
          errors,
          errorRate: requests > 0 ? ((errors / requests) * 100).toFixed(2) + '%' : '0%',
          avgResponseTime: parseFloat(row.avg_response_time || 0).toFixed(2) + 'ms',
          totalRequestSize: this.formatBytes(parseInt(row.total_request_size) || 0),
          totalResponseSize: this.formatBytes(parseInt(row.total_response_size) || 0),
          uniqueEndpoints: parseInt(row.unique_endpoints),
        });
      });

      if (stats.summary.totalRequests > 0) {
        stats.summary.avgResponseTime = (
          stats.period.reduce((sum, p) => sum + parseFloat(p.avgResponseTime), 0) / 
          stats.period.length
        ).toFixed(2) + 'ms';
      }

      stats.period.forEach(p => stats.summary.uniqueEndpoints.add(p.uniqueEndpoints));
      stats.summary.uniqueEndpoints = stats.summary.uniqueEndpoints.size;
      stats.summary.errorRate = stats.summary.totalRequests > 0 
        ? ((stats.summary.totalErrors / stats.summary.totalRequests) * 100).toFixed(2) + '%'
        : '0%';

      await cacheService.set(cacheKey, stats, 300);

      return stats;
    } catch (error) {
      this.stats.errors++;
      console.error('Get Usage Stats Error:', error);
      throw error;
    }
  }

  getGranularityInterval(granularity) {
    const intervals = {
      [GRANULARITIES.MINUTE]: 'minute',
      [GRANULARITIES.HOUR]: 'hour',
      [GRANULARITIES.DAY]: 'day',
      [GRANULARITIES.WEEK]: 'week',
      [GRANULARITIES.MONTH]: 'month',
    };
    return intervals[granularity] || GRANULARITIES.HOUR;
  }

  async getTopEndpoints(apiKeyId, options = {}) {
    const { limit = 10, startDate, endDate } = options;
    
    try {
      const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate) : new Date();

      const query = `
        SELECT 
          endpoint,
          COUNT(*) as total_requests,
          COUNT(CASE WHEN status_code >= 400 THEN 1 END) as errors,
          AVG(response_time) as avg_response_time,
          MIN(response_time) as min_response_time,
          MAX(response_time) as max_response_time
        FROM usage_records
        WHERE api_key_id = $1
          AND created_at >= $2
          AND created_at <= $3
        GROUP BY endpoint
        ORDER BY total_requests DESC
        LIMIT $4
      `;

      const result = await pool.query(query, [apiKeyId, start, end, limit]);

      return result.rows.map(row => ({
        endpoint: row.endpoint,
        totalRequests: parseInt(row.total_requests),
        errors: parseInt(row.errors),
        errorRate: parseInt(row.total_requests) > 0 
          ? ((parseInt(row.errors) / parseInt(row.total_requests)) * 100).toFixed(2) + '%'
          : '0%',
        avgResponseTime: parseFloat(row.avg_response_time || 0).toFixed(2) + 'ms',
        minResponseTime: parseFloat(row.min_response_time || 0).toFixed(2) + 'ms',
        maxResponseTime: parseFloat(row.max_response_time || 0).toFixed(2) + 'ms',
      }));
    } catch (error) {
      this.stats.errors++;
      console.error('Get Top Endpoints Error:', error);
      throw error;
    }
  }

  async getRealtimeStats(apiKeyId) {
    try {
      const hoursToCheck = 24;
      const stats = {
        totalRequests: 0,
        totalErrors: 0,
        avgResponseTime: 0,
        requestsByHour: [],
        errorRate: '0%',
      };

      const promises = [];
      for (let i = 0; i < hoursToCheck; i++) {
        const hourKey = `stats:realtime:${apiKeyId}:${new Date(Date.now() - i * 60 * 60 * 1000).toISOString().slice(0, 13)}`;
        promises.push(cacheService.get(hourKey));
      }

      const results = await Promise.all(promises);
      let totalResponseTime = 0;

      results.forEach((hourStats, index) => {
        if (hourStats) {
          stats.totalRequests += hourStats.totalRequests;
          stats.totalErrors += hourStats.totalErrors;
          
          const avgTime = hourStats.totalRequests > 0 
            ? hourStats.totalResponseTime / hourStats.totalRequests 
            : 0;
          totalResponseTime += avgTime;

          stats.requestsByHour.push({
            hour: new Date(Date.now() - (hoursToCheck - 1 - index) * 60 * 60 * 1000).toISOString().slice(0, 13),
            requests: hourStats.totalRequests,
            errors: hourStats.totalErrors,
          });
        } else {
          stats.requestsByHour.push({
            hour: new Date(Date.now() - (hoursToCheck - 1 - index) * 60 * 60 * 1000).toISOString().slice(0, 13),
            requests: 0,
            errors: 0,
          });
        }
      });

      stats.avgResponseTime = stats.totalRequests > 0 
        ? (totalResponseTime / hoursToCheck).toFixed(2) + 'ms'
        : '0ms';
      stats.errorRate = stats.totalRequests > 0 
        ? ((stats.totalErrors / stats.totalRequests) * 100).toFixed(2) + '%'
        : '0%';

      return stats;
    } catch (error) {
      this.stats.errors++;
      console.error('Get Real-time Stats Error:', error);
      throw error;
    }
  }

  async calculateBilling(apiKeyId, period = 'monthly') {
    this.stats.billingCalculations++;

    try {
      const plan = await this.getApiKeyPlan(apiKeyId);
      const { startDate, endDate } = this.getBillingPeriod(period);
      
      const query = `
        SELECT 
          COUNT(*) as total_requests,
          COUNT(DISTINCT endpoint) as unique_endpoints,
          AVG(response_time) as avg_response_time
        FROM usage_records
        WHERE api_key_id = $1
          AND created_at >= $2
          AND created_at <= $3
      `;

      const result = await pool.query(query, [apiKeyId, startDate, endDate]);
      const usage = result.rows[0];

      const totalRequests = parseInt(usage.total_requests);
      const includedRequests = plan.monthlyRequests;
      const overageRequests = Math.max(0, totalRequests - includedRequests);
      const basePrice = plan.pricePerThousand === 0 ? 0 : this.getPlanPrice(plan.name);
      
      const overageCost = overageRequests > 0 
        ? (overageRequests / 1000) * plan.pricePerThousand 
        : 0;

      return {
        period: {
          start: startDate,
          end: endDate,
        },
        plan: {
          name: plan.name,
          includedRequests,
          price: basePrice,
        },
        usage: {
          totalRequests,
          includedRequests,
          overageRequests,
          uniqueEndpoints: parseInt(usage.unique_endpoints),
          avgResponseTime: parseFloat(usage.avg_response_time || 0).toFixed(2) + 'ms',
        },
        billing: {
          basePrice,
          overageCost: parseFloat(overageCost.toFixed(2)),
          total: parseFloat((basePrice + overageCost).toFixed(2)),
          currency: 'USD',
        },
        features: plan.features,
        recommendations: this.generateRecommendations(totalRequests, includedRequests, plan),
      };
    } catch (error) {
      this.stats.errors++;
      console.error('Calculate Billing Error:', error);
      throw error;
    }
  }

  async getApiKeyPlan(apiKeyId) {
    try {
      const query = `
        SELECT plan FROM api_keys WHERE id = $1
      `;
      const result = await pool.query(query, [apiKeyId]);
      
      if (result.rows.length > 0 && result.rows[0].plan) {
        return BILLING_PLANS[result.rows[0].plan.toUpperCase()] || BILLING_PLANS.FREE;
      }
      
      return BILLING_PLANS.FREE;
    } catch (error) {
      console.error('Get API Key Plan Error:', error);
      return BILLING_PLANS.FREE;
    }
  }

  getBillingPeriod(period) {
    const now = new Date();
    let startDate, endDate;

    switch (period) {
      case 'weekly':
        startDate = new Date(now.setDate(now.getDate() - now.getDay()));
        endDate = new Date();
        break;
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date();
        break;
      case 'yearly':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date();
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date();
    }

    return { startDate, endDate };
  }

  getPlanPrice(planName) {
    const prices = {
      'Free': 0,
      'Starter': 9.99,
      'Professional': 49.99,
      'Enterprise': 199.99,
    };
    return prices[planName] || 0;
  }

  generateRecommendations(totalRequests, includedRequests, plan) {
    const recommendations = [];
    const usagePercent = (totalRequests / includedRequests) * 100;

    if (usagePercent >= 90) {
      recommendations.push({
        type: 'upgrade',
        priority: 'high',
        message: `You have used ${usagePercent.toFixed(0)}% of your monthly quota. Consider upgrading to a higher plan.`,
      });
    }

    if (totalRequests < includedRequests * 0.5 && plan !== BILLING_PLANS.FREE) {
      recommendations.push({
        type: 'downgrade',
        priority: 'low',
        message: 'Your usage is below 50% of your current plan. Consider downgrading to save costs.',
      });
    }

    recommendations.push({
      type: 'optimization',
      priority: 'medium',
      message: 'Enable response caching to reduce API calls and improve performance.',
    });

    return recommendations;
  }

  async getBillingInfo(apiKeyId, period = 'monthly') {
    try {
      const billing = await this.calculateBilling(apiKeyId, period);
      
      const availablePlans = Object.entries(BILLING_PLANS).map(([key, plan]) => ({
        id: key,
        name: plan.name,
        price: this.getPlanPrice(plan.name),
        monthlyRequests: plan.monthlyRequests === Infinity ? 'Unlimited' : plan.monthlyRequests,
        pricePerThousand: plan.pricePerThousand,
        features: plan.features,
        recommended: this.isRecommendedPlan(billing.usage.totalRequests, plan),
      }));

      return {
        currentBilling: billing,
        availablePlans,
        nextBillingDate: this.getNextBillingDate(),
        paymentMethods: [],
      };
    } catch (error) {
      this.stats.errors++;
      console.error('Get Billing Info Error:', error);
      throw error;
    }
  }

  isRecommendedPlan(currentUsage, plan) {
    const usagePercent = (currentUsage / plan.monthlyRequests) * 100;
    return usagePercent >= 70 && usagePercent <= 100;
  }

  getNextBillingDate() {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return nextMonth.toISOString();
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async exportUsageData(apiKeyId, format = 'json', options = {}) {
    try {
      const { startDate, endDate } = options;
      const stats = await this.getUsageStats(apiKeyId, {
        startDate,
        endDate,
        granularity: GRANULARITIES.HOUR,
      });

      switch (format) {
        case 'csv':
          return this.convertToCSV(stats);
        case 'json':
        default:
          return JSON.stringify(stats, null, 2);
      }
    } catch (error) {
      this.stats.errors++;
      console.error('Export Usage Data Error:', error);
      throw error;
    }
  }

  convertToCSV(data) {
    const headers = ['Period', 'Requests', 'Errors', 'Error Rate', 'Avg Response Time'];
    const rows = data.period.map(p => [
      p.period,
      p.requests,
      p.errors,
      p.errorRate,
      p.avgResponseTime,
    ]);

    return [
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ].join('\n');
  }

  getStats() {
    return {
      ...this.stats,
      pendingRecords: this.pendingRecords.length,
    };
  }

  resetStats() {
    this.stats = {
      recordsTracked: 0,
      errors: 0,
      cacheHits: 0,
      cacheMisses: 0,
      billingCalculations: 0,
    };
  }
}

const usageTracking = new UsageTracking();

module.exports = usageTracking;
module.exports.BILLING_PLANS = BILLING_PLANS;
module.exports.GRANULARITIES = GRANULARITIES;
