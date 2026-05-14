const db = require('../../../config/database/db');
const redisClient = require('../../../config/redis/client');

const realTimeAnalyticsService = require('./realTimeAnalyticsService');

class AnalyticsService {
  constructor() {
    this.redisConnected = false;
    this.initRedis();
  }

  async initRedis() {
    try {
      if (!redisClient.isOpen) {
        await redisClient.connect();
      }
      this.redisConnected = true;
    } catch (error) {
      console.error('Redis connection failed for analytics:', error);
      this.redisConnected = false;
    }
  }

  async trackEvent(userId, eventType, eventData = {}) {
    const timestamp = Date.now();
    const date = new Date().toISOString().split('T')[0];

    try {
      if (this.redisConnected) {
        const pipeline = redisClient.multi();

        pipeline.hIncrBy(`analytics:events:${date}`, `${eventType}:count`, 1);
        pipeline.hIncrBy(`analytics:users:${date}`, `${userId}:count`, 1);
        pipeline.zAdd(`analytics:events:timeline`, {
          score: timestamp,
          value: `${eventType}:${userId}:${timestamp}`
        });
        pipeline.expire(`analytics:events:${date}`, 86400 * 7);
        pipeline.expire(`analytics:users:${date}`, 86400 * 7);
        pipeline.expire(`analytics:events:timeline`, 86400 * 7);

        await pipeline.exec();
      }

      await db.query(
        `INSERT INTO user_events (user_id, event_type, event_data, created_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (user_id, event_type) DO UPDATE SET
         event_data = $3, created_at = NOW()`,
        [userId, eventType, JSON.stringify(eventData)]
      );

      return { success: true, timestamp };
    } catch (error) {
      console.error('Error tracking event:', error);
      return { success: false, error: error.message };
    }
  }

  async trackPageView(userId, page, metadata = {}) {
    return this.trackEvent(userId, 'page_view', { page, ...metadata });
  }

  async trackFeatureUsage(userId, feature, action, metadata = {}) {
    return this.trackEvent(userId, `feature:${feature}:${action}`, {
      feature,
      action,
      ...metadata
    });
  }

  async trackApiCall(userId, endpoint, method, statusCode, duration) {
    return this.trackEvent(userId, 'api_call', { endpoint, method, statusCode, duration });
  }

  async getUserActivityStats(userId, days = 7) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const result = await db.query(
        `SELECT DATE(created_at) as date, COUNT(*) as count
         FROM user_events
         WHERE user_id = $1 AND created_at >= $2
         GROUP BY DATE(created_at)
         ORDER BY date DESC`,
        [userId, startDate]
      );

      const featureUsage = await db.query(
        `SELECT event_type, COUNT(*) as count
         FROM user_events
         WHERE user_id = $1 AND created_at >= $2 AND event_type LIKE 'feature:%'
         GROUP BY event_type
         ORDER BY count DESC
         LIMIT 10`,
        [userId, startDate]
      );

      const totalEvents = await db.query(
        `SELECT COUNT(*) as total FROM user_events WHERE user_id = $1 AND created_at >= $2`,
        [userId, startDate]
      );

      return {
        activityByDay: result.rows,
        featureUsage: featureUsage.rows,
        totalEvents: parseInt(totalEvents.rows[0]?.total || 0),
        period: { start: startDate, end: new Date() }
      };
    } catch (error) {
      console.error('Error getting user activity stats:', error);
      return { activityByDay: [], featureUsage: [], totalEvents: 0, error: error.message };
    }
  }

  async getFeatureUsageStats(days = 7) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const result = await db.query(
        `SELECT
           event_type,
           COUNT(*) as usage_count,
           COUNT(DISTINCT user_id) as unique_users
         FROM user_events
         WHERE event_type LIKE 'feature:%' AND created_at >= $1
         GROUP BY event_type
         ORDER BY usage_count DESC`,
        [startDate]
      );

      return {
        features: result.rows,
        period: { start: startDate, end: new Date() }
      };
    } catch (error) {
      console.error('Error getting feature usage stats:', error);
      return { features: [], error: error.message };
    }
  }

  async getUserEngagementStats(days = 7) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const dailyStats = await db.query(
        `SELECT
           DATE(created_at) as date,
           COUNT(DISTINCT user_id) as active_users,
           COUNT(*) as total_events,
           AVG(CASE WHEN event_type LIKE 'feature:%' THEN 1 ELSE 0 END) as avg_feature_usage
         FROM user_events
         WHERE created_at >= $1
         GROUP BY DATE(created_at)
         ORDER BY date DESC`,
        [startDate]
      );

      const newUsers = await db.query(
        `SELECT COUNT(DISTINCT user_id) as count
         FROM user_events
         WHERE created_at >= $1
         AND user_id NOT IN (
           SELECT DISTINCT user_id FROM user_events WHERE created_at < $1
         )`,
        [startDate]
      );

      const retention = await db.query(
        `WITH user_activity AS (
           SELECT user_id, MIN(DATE(created_at)) as first_seen
           FROM user_events
           WHERE created_at >= $1
           GROUP BY user_id
         )
         SELECT
           COUNT(*) FILTER (WHERE first_seen = CURRENT_DATE - 1) as returning_1d,
           COUNT(*) FILTER (WHERE first_seen = CURRENT_DATE - 7) as returning_7d
         FROM user_activity`,
        [startDate]
      );

      return {
        dailyStats: dailyStats.rows,
        newUsers: parseInt(newUsers.rows[0]?.count || 0),
        retention: retention.rows[0],
        period: { start: startDate, end: new Date() }
      };
    } catch (error) {
      console.error('Error getting engagement stats:', error);
      return { dailyStats: [], newUsers: 0, retention: {}, error: error.message };
    }
  }

  async getRealTimeStats() {
    try {
      return await realTimeAnalyticsService.getRealTimeStats();
    } catch (error) {
      console.error('Error getting real-time stats:', error);
      return {
        activeUsers: 0,
        requestsLastMinute: 0,
        eventsLastMinute: 0,
        topFeatures: [],
        error: error.message
      };
    }
  }

  async recordApiPerformance(endpoint, method, duration, statusCode) {
    const date = new Date().toISOString().split('T')[0];

    try {
      if (this.redisConnected) {
        const pipeline = redisClient.multi();

        pipeline.hIncrBy(`analytics:api:${date}`, `${endpoint}:${method}:count`, 1);
        pipeline.hIncrBy(`analytics:api:${date}`, `${endpoint}:${method}:total_duration`, duration);
        pipeline.hIncrBy(`analytics:api:${date}`, `${endpoint}:${method}:status:${statusCode}`, 1);
        pipeline.zAdd('analytics:features:realtime', { score: Date.now(), value: endpoint });

        await pipeline.exec();
      }

      await db.query(
        `INSERT INTO api_performance (endpoint, method, duration_ms, status_code, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [endpoint, method, duration, statusCode]
      );

      return { success: true };
    } catch (error) {
      console.error('Error recording API performance:', error);
      return { success: false, error: error.message };
    }
  }

  async getApiPerformanceStats(days = 7) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const result = await db.query(
        `SELECT
           endpoint,
           method,
           COUNT(*) as call_count,
           AVG(duration_ms) as avg_duration,
           MIN(duration_ms) as min_duration,
           MAX(duration_ms) as max_duration,
           PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms) as p95_duration,
           PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY duration_ms) as p99_duration
         FROM api_performance
         WHERE created_at >= $1
         GROUP BY endpoint, method
         ORDER BY call_count DESC`,
        [startDate]
      );

      const statusCodes = await db.query(
        `SELECT
           endpoint,
           status_code,
           COUNT(*) as count
         FROM api_performance
         WHERE created_at >= $1
         GROUP BY endpoint, status_code
         ORDER BY count DESC`,
        [startDate]
      );

      return {
        endpoints: result.rows,
        statusCodes: statusCodes.rows,
        period: { start: startDate, end: new Date() }
      };
    } catch (error) {
      console.error('Error getting API performance stats:', error);
      return { endpoints: [], statusCodes: [], error: error.message };
    }
  }

  async getDashboardSummary() {
    try {
      const [activeUsers, eventsToday, topFeatures, recentActivity] = await Promise.all([
        this.getActiveUsersCount(),
        this.getTodayEventsCount(),
        this.getTopFeatures(5),
        this.getRecentActivity(10)
      ]);

      return {
        activeUsers,
        eventsToday,
        topFeatures,
        recentActivity,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting dashboard summary:', error);
      return { error: error.message };
    }
  }

  async getActiveUsersCount() {
    if (!this.redisConnected) return 0;

    try {
      return await redisClient.sCard('active:users');
    } catch (error) {
      return 0;
    }
  }

  async getTodayEventsCount() {
    const date = new Date().toISOString().split('T')[0];

    try {
      if (this.redisConnected) {
        const count = await redisClient.hGet(`analytics:events:${date}`, 'total:count');
        return parseInt(count || 0);
      }

      const result = await db.query(
        `SELECT COUNT(*) as count FROM user_events WHERE DATE(created_at) = $1`,
        [date]
      );
      return parseInt(result.rows[0]?.count || 0);
    } catch (error) {
      return 0;
    }
  }

  async getTopFeatures(limit = 5) {
    try {
      const result = await db.query(
        `SELECT event_type as feature, COUNT(*) as usage_count
         FROM user_events
         WHERE event_type LIKE 'feature:%' AND created_at >= NOW() - INTERVAL '7 days'
         GROUP BY event_type
         ORDER BY usage_count DESC
         LIMIT $1`,
        [limit]
      );
      return result.rows;
    } catch (error) {
      return [];
    }
  }

  async getRecentActivity(limit = 10) {
    try {
      const result = await db.query(
        `SELECT ue.user_id, ue.event_type, ue.created_at, u.username
         FROM user_events ue
         LEFT JOIN users u ON ue.user_id = u.id
         ORDER BY ue.created_at DESC
         LIMIT $1`,
        [limit]
      );
      return result.rows;
    } catch (error) {
      return [];
    }
  }

  async detectAnomalies() {
    try {
      const [dbAnomalies, realtimeAnomalies] = await Promise.all([
        this.detectDatabaseAnomalies(),
        realTimeAnalyticsService.detectAnomalies()
      ]);

      return {
        anomalies: [...dbAnomalies, ...realtimeAnomalies.anomalies],
        count: dbAnomalies.length + realtimeAnomalies.count,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error detecting anomalies:', error);
      return { anomalies: [], count: 0, error: error.message };
    }
  }

  async detectDatabaseAnomalies() {
    try {
      const anomalies = [];

      const highErrorRate = await db.query(
        `SELECT
           endpoint,
           method,
           COUNT(*) FILTER (WHERE status_code >= 400) as error_count,
           COUNT(*) as total_count,
           (COUNT(*) FILTER (WHERE status_code >= 400)::float / COUNT(*)) as error_rate
         FROM api_performance
         WHERE created_at >= NOW() - INTERVAL '1 hour'
         GROUP BY endpoint, method
         HAVING COUNT(*) FILTER (WHERE status_code >= 400)::float / COUNT(*) > 0.1`
      );

      if (highErrorRate.rows.length > 0) {
        anomalies.push({
          type: 'high_error_rate',
          severity: 'warning',
          endpoints: highErrorRate.rows,
          timestamp: new Date()
        });
      }

      const slowEndpoints = await db.query(
        `SELECT
           endpoint,
           method,
           AVG(duration_ms) as avg_duration,
           MAX(duration_ms) as max_duration
         FROM api_performance
         WHERE created_at >= NOW() - INTERVAL '1 hour'
         GROUP BY endpoint, method
         HAVING AVG(duration_ms) > 5000`
      );

      if (slowEndpoints.rows.length > 0) {
        anomalies.push({
          type: 'slow_endpoints',
          severity: 'info',
          endpoints: slowEndpoints.rows,
          timestamp: new Date()
        });
      }

      const unusualActivity = await db.query(
        `SELECT
           user_id,
           COUNT(*) as event_count
         FROM user_events
         WHERE created_at >= NOW() - INTERVAL '1 hour'
         GROUP BY user_id
         HAVING COUNT(*) > 1000`
      );

      if (unusualActivity.rows.length > 0) {
        anomalies.push({
          type: 'unusual_activity',
          severity: 'warning',
          users: unusualActivity.rows,
          timestamp: new Date()
        });
      }

      return anomalies;
    } catch (error) {
      console.error('Error detecting database anomalies:', error);
      return [];
    }
  }
}

const analyticsService = new AnalyticsService();

module.exports = analyticsService;
