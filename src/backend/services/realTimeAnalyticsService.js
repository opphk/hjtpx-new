const redisClient = require('../../../config/redis/client');

class RealTimeAnalyticsService {
  constructor() {
    this.isConnected = false;
    this.initConnection();
  }

  async initConnection() {
    try {
      if (!redisClient.isOpen) {
        await redisClient.connect();
      }
      this.isConnected = true;
      redisClient.on('error', err => {
        console.error('Redis error in real-time analytics:', err);
        this.isConnected = false;
      });
      redisClient.on('connect', () => {
        this.isConnected = true;
      });
    } catch (error) {
      console.error('Failed to connect to Redis for real-time analytics:', error);
      this.isConnected = false;
    }
  }

  async recordActiveUser(userId, sessionId) {
    if (!this.isConnected) return false;

    try {
      const now = Date.now();
      const minuteKey = `realtime:active:minute:${Math.floor(now / 60000)}`;
      const hourKey = `realtime:active:hour:${Math.floor(now / 3600000)}`;
      const dailyKey = `realtime:active:daily:${new Date().toISOString().split('T')[0]}`;

      const pipeline = redisClient.multi();

      pipeline.sAdd('active:users', userId.toString());
      pipeline.sAdd(minuteKey, userId.toString());
      pipeline.sAdd(hourKey, userId.toString());
      pipeline.sAdd(dailyKey, userId.toString());

      pipeline.expire(minuteKey, 120);
      pipeline.expire(hourKey, 7200);
      pipeline.expire(dailyKey, 86400 * 2);

      pipeline.hSet(`user:session:${userId}`, {
        sessionId: sessionId,
        lastActive: now,
        ip: ''
      });
      pipeline.expire(`user:session:${userId}`, 3600);

      await pipeline.exec();
      return true;
    } catch (error) {
      console.error('Error recording active user:', error);
      return false;
    }
  }

  async removeActiveUser(userId) {
    if (!this.isConnected) return false;

    try {
      await redisClient.sRem('active:users', userId.toString());
      return true;
    } catch (error) {
      console.error('Error removing active user:', error);
      return false;
    }
  }

  async recordRequest(endpoint, method, statusCode, duration) {
    if (!this.isConnected) return false;

    try {
      const now = Date.now();
      const minuteKey = `realtime:requests:minute:${Math.floor(now / 60000)}`;
      const hourKey = `realtime:requests:hour:${Math.floor(now / 3600000)}`;

      const pipeline = redisClient.multi();

      pipeline.incr('analytics:requests:minute');
      pipeline.incr(`analytics:requests:endpoint:${endpoint}:minute`);

      pipeline.hIncrBy(minuteKey, 'total', 1);
      pipeline.hIncrBy(minuteKey, `status:${statusCode}`, 1);
      pipeline.hIncrByFloat(minuteKey, 'total_duration', duration);
      pipeline.zAdd('analytics:features:realtime', { score: now, value: endpoint });

      pipeline.expire(minuteKey, 120);
      pipeline.expire(hourKey, 7200);

      await pipeline.exec();
      return true;
    } catch (error) {
      console.error('Error recording request:', error);
      return false;
    }
  }

  async recordEvent(eventType, userId, metadata = {}) {
    if (!this.isConnected) return false;

    try {
      const now = Date.now();
      const minuteKey = `realtime:events:minute:${Math.floor(now / 60000)}`;
      const eventKey = `realtime:events:${eventType}:${new Date().toISOString().split('T')[0]}`;

      const pipeline = redisClient.multi();

      pipeline.incr('analytics:events:minute');
      pipeline.hIncrBy(minuteKey, eventType, 1);
      pipeline.hIncrBy(eventKey, 'total', 1);
      pipeline.hIncrBy(eventKey, userId, 1);

      pipeline.zAdd('analytics:events:timeline', {
        score: now,
        value: `${eventType}:${userId}:${now}`
      });

      pipeline.expire(minuteKey, 120);
      pipeline.expire(eventKey, 86400 * 2);

      await pipeline.exec();
      return true;
    } catch (error) {
      console.error('Error recording event:', error);
      return false;
    }
  }

  async trackHotData(key, value, ttl = 300) {
    if (!this.isConnected) return null;

    try {
      const hotKey = `hotdata:${key}:${value}`;
      const now = Date.now();

      await redisClient.zIncrBy('hotdata:keys', 1, hotKey);
      await redisClient.hSet(hotKey, {
        value,
        accessCount: 1,
        firstAccess: now,
        lastAccess: now
      });
      await redisClient.expire(hotKey, ttl);

      return { success: true, hotKey };
    } catch (error) {
      console.error('Error tracking hot data:', error);
      return { success: false, error: error.message };
    }
  }

  async incrementHotDataAccess(key, value) {
    if (!this.isConnected) return null;

    try {
      const hotKey = `hotdata:${key}:${value}`;
      const now = Date.now();

      await redisClient.zIncrBy('hotdata:keys', 1, hotKey);
      await redisClient.hIncrBy(hotKey, 'accessCount', 1);
      await redisClient.hSet(hotKey, 'lastAccess', now);

      return { success: true };
    } catch (error) {
      console.error('Error incrementing hot data access:', error);
      return { success: false, error: error.message };
    }
  }

  async getHotData(key, limit = 10) {
    if (!this.isConnected) return [];

    try {
      const pattern = `hotdata:${key}:*`;
      const hotKeys = await redisClient.keys(pattern);

      if (hotKeys.length === 0) return [];

      const hotData = await redisClient.mGet(hotKeys);
      const scoredData = [];

      for (const hotKey of hotKeys) {
        const score = await redisClient.zScore('hotdata:keys', hotKey);
        const data = await redisClient.hGetAll(hotKey);
        scoredData.push({
          key: hotKey.replace(`hotdata:${key}:`, ''),
          accessCount: parseInt(data.accessCount || 0),
          score: score || 0,
          firstAccess: new Date(parseInt(data.firstAccess || 0)),
          lastAccess: new Date(parseInt(data.lastAccess || 0))
        });
      }

      return scoredData.sort((a, b) => b.accessCount - a.accessCount).slice(0, limit);
    } catch (error) {
      console.error('Error getting hot data:', error);
      return [];
    }
  }

  async getActiveUsersCount() {
    if (!this.isConnected) return 0;

    try {
      return await redisClient.sCard('active:users');
    } catch (error) {
      console.error('Error getting active users count:', error);
      return 0;
    }
  }

  async getRequestsLastMinute() {
    if (!this.isConnected) return 0;

    try {
      const count = await redisClient.get('analytics:requests:minute');
      return parseInt(count || 0);
    } catch (error) {
      console.error('Error getting requests count:', error);
      return 0;
    }
  }

  async getEventsLastMinute() {
    if (!this.isConnected) return 0;

    try {
      const count = await redisClient.get('analytics:events:minute');
      return parseInt(count || 0);
    } catch (error) {
      console.error('Error getting events count:', error);
      return 0;
    }
  }

  async getTopActiveEndpoints(limit = 10) {
    if (!this.isConnected) return [];

    try {
      const endpointScores = await redisClient.zRangeWithScores(
        'analytics:features:realtime',
        0,
        -1
      );

      const counts = {};
      const cutoff = Date.now() - 3600000;

      for (const entry of endpointScores) {
        if (entry.score > cutoff) {
          const endpoint = entry.value;
          counts[endpoint] = (counts[endpoint] || 0) + 1;
        }
      }

      return Object.entries(counts)
        .map(([endpoint, count]) => ({ endpoint, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);
    } catch (error) {
      console.error('Error getting top endpoints:', error);
      return [];
    }
  }

  async getRealTimeStats() {
    if (!this.isConnected) {
      return {
        activeUsers: 0,
        requestsLastMinute: 0,
        eventsLastMinute: 0,
        topEndpoints: [],
        status: 'disconnected'
      };
    }

    try {
      const pipeline = redisClient.multi();

      pipeline.sCard('active:users');
      pipeline.get('analytics:requests:minute');
      pipeline.get('analytics:events:minute');
      pipeline.zRangeWithScores('analytics:features:realtime', 0, -1);

      const results = await pipeline.exec();

      const endpointCounts = {};
      const cutoff = Date.now() - 3600000;

      if (results[3]) {
        for (const entry of results[3]) {
          if (entry.score > cutoff) {
            const endpoint = entry.value;
            endpointCounts[endpoint] = (endpointCounts[endpoint] || 0) + 1;
          }
        }
      }

      const topEndpoints = Object.entries(endpointCounts)
        .map(([endpoint, count]) => ({ endpoint, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      return {
        activeUsers: results[0] || 0,
        requestsLastMinute: parseInt(results[1] || 0),
        eventsLastMinute: parseInt(results[2] || 0),
        topEndpoints,
        status: 'connected',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting real-time stats:', error);
      return {
        activeUsers: 0,
        requestsLastMinute: 0,
        eventsLastMinute: 0,
        topEndpoints: [],
        status: 'error',
        error: error.message
      };
    }
  }

  async detectAnomalies() {
    if (!this.isConnected) return { anomalies: [], count: 0 };

    try {
      const anomalies = [];

      const minuteData = await this.getMinuteAnomalyData();

      if (minuteData.requests > 1000) {
        anomalies.push({
          type: 'high_request_volume',
          severity: 'warning',
          metric: 'requests_per_minute',
          value: minuteData.requests,
          threshold: 1000,
          message: `High request volume detected: ${minuteData.requests} requests in the last minute`
        });
      }

      const errorKeys = Object.keys(minuteData).filter(
        k => k.startsWith('status:4') || k.startsWith('status:5')
      );
      const totalErrors = errorKeys.reduce((sum, k) => sum + minuteData[k], 0);
      const errorRate = minuteData.total > 0 ? totalErrors / minuteData.total : 0;

      if (errorRate > 0.1) {
        anomalies.push({
          type: 'high_error_rate',
          severity: 'critical',
          metric: 'error_rate',
          value: errorRate,
          threshold: 0.1,
          message: `High error rate detected: ${(errorRate * 100).toFixed(2)}% errors`
        });
      }

      const unusualEvents = await this.getUnusualEvents();
      if (unusualEvents.length > 0) {
        anomalies.push({
          type: 'unusual_event_pattern',
          severity: 'info',
          events: unusualEvents,
          message: 'Unusual event patterns detected'
        });
      }

      return {
        anomalies,
        count: anomalies.length,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error detecting anomalies:', error);
      return { anomalies: [], count: 0, error: error.message };
    }
  }

  async getMinuteAnomalyData() {
    if (!this.isConnected) return {};

    try {
      const minuteKey = `realtime:requests:minute:${Math.floor(Date.now() / 60000)}`;
      const data = await redisClient.hGetAll(minuteKey);

      const parsed = {};
      for (const [key, value] of Object.entries(data)) {
        parsed[key] = parseInt(value);
      }

      return parsed;
    } catch (error) {
      console.error('Error getting minute anomaly data:', error);
      return {};
    }
  }

  async getUnusualEvents() {
    if (!this.isConnected) return [];

    try {
      const currentMinute = `realtime:events:minute:${Math.floor(Date.now() / 60000)}`;
      const prevMinute = `realtime:events:minute:${Math.floor(Date.now() / 60000) - 1}`;

      const current = await redisClient.hGetAll(currentMinute);
      const previous = await redisClient.hGetAll(prevMinute);

      const unusual = [];

      for (const [eventType, count] of Object.entries(current)) {
        const prevCount = parseInt(previous[eventType] || 0);
        const currCount = parseInt(count);

        if (prevCount > 0 && currCount > prevCount * 3) {
          unusual.push({
            eventType,
            currentCount: currCount,
            previousCount: prevCount,
            increase: (((currCount - prevCount) / prevCount) * 100).toFixed(2) + '%'
          });
        }
      }

      return unusual;
    } catch (error) {
      console.error('Error getting unusual events:', error);
      return [];
    }
  }

  async getHourlyStats(hours = 24) {
    if (!this.isConnected) return [];

    try {
      const stats = [];
      const now = Date.now();

      for (let i = 0; i < hours; i++) {
        const hourKey = `realtime:requests:hour:${Math.floor((now - i * 3600000) / 3600000)}`;
        const minuteKeys = [];

        for (let j = 0; j < 60; j += 5) {
          const minuteKey = `realtime:requests:minute:${Math.floor((now - i * 3600000 - j * 60000) / 60000)}`;
          minuteKeys.push(minuteKey);
        }

        const pipeline = redisClient.multi();
        for (const key of minuteKeys) {
          pipeline.hGetAll(key);
        }

        const results = await pipeline.exec();

        let totalRequests = 0;
        let totalErrors = 0;
        let totalDuration = 0;

        for (const result of results) {
          if (result) {
            totalRequests += parseInt(result.total || 0);
            totalDuration += parseFloat(result.total_duration || 0);
            for (const key of Object.keys(result)) {
              if (key.startsWith('status:4') || key.startsWith('status:5')) {
                totalErrors += parseInt(result[key]);
              }
            }
          }
        }

        stats.push({
          hour: new Date(now - i * 3600000).toISOString(),
          requests: totalRequests,
          errors: totalErrors,
          avgDuration: totalRequests > 0 ? totalDuration / totalRequests : 0
        });
      }

      return stats.reverse();
    } catch (error) {
      console.error('Error getting hourly stats:', error);
      return [];
    }
  }

  async clearOldData() {
    if (!this.isConnected) return false;

    try {
      const now = Date.now();
      const oldMinuteKeys = [];
      const oldHourKeys = [];

      for (let i = 1440; i < 2880; i++) {
        oldMinuteKeys.push(`realtime:requests:minute:${Math.floor((now - i * 60000) / 60000)}`);
        oldMinuteKeys.push(`realtime:events:minute:${Math.floor((now - i * 60000) / 60000)}`);
      }

      for (let i = 48; i < 168; i++) {
        oldHourKeys.push(`realtime:requests:hour:${Math.floor((now - i * 3600000) / 3600000)}`);
      }

      if (oldMinuteKeys.length > 0) {
        await redisClient.del(oldMinuteKeys);
      }

      if (oldHourKeys.length > 0) {
        await redisClient.del(oldHourKeys);
      }

      await redisClient.zRemRangeByScore('analytics:events:timeline', 0, now - 86400000 * 7);

      return true;
    } catch (error) {
      console.error('Error clearing old data:', error);
      return false;
    }
  }
}

const realTimeAnalyticsService = new RealTimeAnalyticsService();

module.exports = realTimeAnalyticsService;
