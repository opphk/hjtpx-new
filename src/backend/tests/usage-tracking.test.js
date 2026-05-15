jest.mock('../../config/database/db', () => ({
  query: jest.fn(),
}));

jest.mock('./cacheService', () => ({
  get: jest.fn(),
  set: jest.fn(),
}));

const pool = require('../../config/database/db');
const cacheService = require('./cacheService');
const usageTracking = require('./usage-tracking');

describe('Usage Tracking Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    usageTracking.resetStats();
    usageTracking.pendingRecords = [];
  });

  describe('recordRequest', () => {
    it('should add request to pending records', async () => {
      const requestData = {
        apiKeyId: 'test-key',
        endpoint: '/api/test',
        method: 'GET',
        statusCode: 200,
        responseTime: 100,
        requestSize: 0,
        responseSize: 1024,
        userAgent: 'test-agent',
        ip: '127.0.0.1',
        requestId: 'req-123',
      };

      await usageTracking.recordRequest(requestData);

      expect(usageTracking.pendingRecords).toHaveLength(1);
      expect(usageTracking.pendingRecords[0]).toEqual(requestData);
    });

    it('should flush records when batch size is reached', async () => {
      pool.query.mockResolvedValue({ rows: [] });
      cacheService.get.mockResolvedValue(null);
      cacheService.set.mockResolvedValue(true);

      for (let i = 0; i < 100; i++) {
        usageTracking.pendingRecords.push({
          apiKeyId: `key-${i}`,
          endpoint: '/api/test',
          method: 'GET',
          statusCode: 200,
          responseTime: 100,
          requestSize: 0,
          responseSize: 1024,
          userAgent: 'test-agent',
          ip: '127.0.0.1',
          requestId: `req-${i}`,
        });
      }

      await usageTracking.recordRequest({
        apiKeyId: 'trigger-flush',
        endpoint: '/api/test',
        method: 'GET',
        statusCode: 200,
        responseTime: 100,
        requestSize: 0,
        responseSize: 1024,
        userAgent: 'test-agent',
        ip: '127.0.0.1',
        requestId: 'flush-trigger',
      });

      expect(pool.query).toHaveBeenCalled();
    });
  });

  describe('updateRealTimeStats', () => {
    it('should update real-time statistics', async () => {
      cacheService.get.mockResolvedValue(null);
      cacheService.set.mockResolvedValue(true);

      const requestData = {
        apiKeyId: 'test-key',
        endpoint: '/api/test',
        statusCode: 200,
        responseTime: 150,
      };

      await usageTracking.updateRealTimeStats(requestData);

      expect(cacheService.set).toHaveBeenCalled();
      const setCall = cacheService.set.mock.calls[0];
      const savedStats = setCall[2];
      
      expect(savedStats.totalRequests).toBe(1);
      expect(savedStats.totalResponseTime).toBe(150);
    });

    it('should increment error count for failed requests', async () => {
      cacheService.get.mockResolvedValue({
        totalRequests: 10,
        totalErrors: 2,
        totalResponseTime: 1000,
        endpoints: {},
        statusCodes: {},
      });
      cacheService.set.mockResolvedValue(true);

      const requestData = {
        apiKeyId: 'test-key',
        endpoint: '/api/test',
        statusCode: 500,
        responseTime: 100,
      };

      await usageTracking.updateRealTimeStats(requestData);

      const setCall = cacheService.set.mock.calls[0];
      const savedStats = setCall[2];
      
      expect(savedStats.totalRequests).toBe(11);
      expect(savedStats.totalErrors).toBe(3);
    });
  });

  describe('getUsageStats', () => {
    it('should retrieve usage statistics from database', async () => {
      cacheService.get.mockResolvedValue(null);
      cacheService.set.mockResolvedValue(true);

      pool.query.mockResolvedValue({
        rows: [
          {
            period: new Date(),
            total_requests: '100',
            error_requests: '5',
            avg_response_time: '150.5',
            total_request_size: '1000',
            total_response_size: '10000',
            unique_endpoints: '3',
          },
        ],
      });

      const stats = await usageTracking.getUsageStats('test-key', {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        granularity: 'day',
      });

      expect(stats).toHaveProperty('summary');
      expect(stats.summary.totalRequests).toBe(100);
      expect(stats.summary.totalErrors).toBe(5);
      expect(stats.period).toHaveLength(1);
    });

    it('should return cached results if available', async () => {
      const cachedStats = {
        summary: { totalRequests: 50 },
        period: [],
      };
      cacheService.get.mockResolvedValue(cachedStats);

      const stats = await usageTracking.getUsageStats('test-key');

      expect(stats).toEqual(cachedStats);
      expect(pool.query).not.toHaveBeenCalled();
    });
  });

  describe('calculateBilling', () => {
    it('should calculate billing for API key', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{ plan: 'FREE' }],
      });
      pool.query.mockResolvedValueOnce({
        rows: [{
          total_requests: '500',
          unique_endpoints: '5',
          avg_response_time: '120',
        }],
      });

      const billing = await usageTracking.calculateBilling('test-key', 'monthly');

      expect(billing).toHaveProperty('period');
      expect(billing).toHaveProperty('plan');
      expect(billing).toHaveProperty('usage');
      expect(billing).toHaveProperty('billing');
      expect(billing.plan.name).toBe('Free');
      expect(billing.usage.totalRequests).toBe(500);
    });

    it('should calculate overage costs', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{ plan: 'FREE' }],
      });
      pool.query.mockResolvedValueOnce({
        rows: [{
          total_requests: '2000',
          unique_endpoints: '10',
          avg_response_time: '100',
        }],
      });

      const billing = await usageTracking.calculateBilling('test-key', 'monthly');

      expect(billing.billing.overageCost).toBe(0.5);
      expect(billing.usage.overageRequests).toBe(1000);
    });
  });

  describe('getTopEndpoints', () => {
    it('should return top endpoints by usage', async () => {
      pool.query.mockResolvedValue({
        rows: [
          { endpoint: '/api/a', total_requests: '1000', errors: '10', avg_response_time: '150', min_response_time: '50', max_response_time: '500' },
          { endpoint: '/api/b', total_requests: '500', errors: '5', avg_response_time: '100', min_response_time: '30', max_response_time: '300' },
        ],
      });

      const topEndpoints = await usageTracking.getTopEndpoints('test-key', { limit: 10 });

      expect(topEndpoints).toHaveLength(2);
      expect(topEndpoints[0].endpoint).toBe('/api/a');
      expect(topEndpoints[0].totalRequests).toBe(1000);
    });
  });

  describe('getRealtimeStats', () => {
    it('should aggregate real-time stats from cache', async () => {
      const hourStats = {
        totalRequests: 100,
        totalErrors: 5,
        totalResponseTime: 10000,
        endpoints: {},
        statusCodes: {},
      };

      cacheService.get
        .mockResolvedValueOnce(hourStats)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      const stats = await usageTracking.getRealtimeStats('test-key');

      expect(stats).toHaveProperty('totalRequests');
      expect(stats).toHaveProperty('totalErrors');
      expect(stats).toHaveProperty('requestsByHour');
    });
  });

  describe('BILLING_PLANS', () => {
    it('should have correct plan configurations', () => {
      const { BILLING_PLANS } = usageTracking;

      expect(BILLING_PLANS.FREE).toHaveProperty('monthlyRequests', 1000);
      expect(BILLING_PLANS.FREE).toHaveProperty('pricePerThousand', 0);
      
      expect(BILLING_PLANS.STARTER).toHaveProperty('monthlyRequests', 10000);
      expect(BILLING_PLANS.STARTER).toHaveProperty('pricePerThousand', 0.5);
      
      expect(BILLING_PLANS.PROFESSIONAL).toHaveProperty('monthlyRequests', 100000);
      expect(BILLING_PLANS.ENTERPRISE).toHaveProperty('monthlyRequests', Infinity);
    });
  });

  describe('formatBytes', () => {
    it('should format bytes correctly', () => {
      expect(usageTracking.formatBytes(0)).toBe('0 B');
      expect(usageTracking.formatBytes(1024)).toBe('1 KB');
      expect(usageTracking.formatBytes(1048576)).toBe('1 MB');
      expect(usageTracking.formatBytes(1073741824)).toBe('1 GB');
    });
  });

  describe('getStats', () => {
    it('should return service statistics', () => {
      usageTracking.stats.recordsTracked = 100;
      usageTracking.stats.errors = 5;

      const stats = usageTracking.getStats();

      expect(stats).toHaveProperty('recordsTracked', 100);
      expect(stats).toHaveProperty('errors', 5);
      expect(stats).toHaveProperty('pendingRecords');
    });
  });
});
