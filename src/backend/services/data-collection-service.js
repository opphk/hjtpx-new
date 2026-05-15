const db = require('../../config/database/db');
const redisClient = require('../../config/redis/client');

class DataCollectionService {
  constructor() {
    this.redisConnected = false;
    this.eventBuffer = [];
    this.bufferSize = 100;
    this.flushInterval = 5000;
    this.init();
  }

  async init() {
    try {
      if (!redisClient.isOpen) {
        await redisClient.connect();
      }
      this.redisConnected = true;
      this.startPeriodicFlush();
    } catch (error) {
      console.error('Redis connection failed:', error);
      this.redisConnected = false;
    }
  }

  startPeriodicFlush() {
    setInterval(() => {
      this.flushBuffer();
    }, this.flushInterval);
  }

  async flushBuffer() {
    if (this.eventBuffer.length === 0) return;

    const eventsToFlush = [...this.eventBuffer];
    this.eventBuffer = [];

    try {
      for (const event of eventsToFlush) {
        await this.persistEvent(event);
      }
    } catch (error) {
      console.error('Error flushing event buffer:', error);
      this.eventBuffer.unshift(...eventsToFlush);
    }
  }

  async persistEvent(event) {
    const { userId, eventType, eventData, timestamp, sessionId, deviceInfo, location } = event;

    await db.query(
      `INSERT INTO analytics_events 
       (user_id, event_type, event_data, timestamp, session_id, device_info, location)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId, eventType, JSON.stringify(eventData), timestamp, sessionId, JSON.stringify(deviceInfo), location]
    );

    if (this.redisConnected) {
      const date = new Date(timestamp).toISOString().split('T')[0];
      const pipeline = redisClient.multi();

      pipeline.hIncrBy(`analytics:events:${date}`, `${eventType}:count`, 1);
      pipeline.hIncrBy(`analytics:events:${date}`, 'total:count', 1);
      pipeline.zAdd('analytics:events:realtime', {
        score: timestamp,
        value: JSON.stringify({ eventType, timestamp, userId })
      });

      if (userId) {
        pipeline.sAdd('analytics:users:session', userId.toString());
        pipeline.hIncrBy(`analytics:user:${userId}:daily`, date, 1);
      }

      await pipeline.exec();
    }
  }

  async trackEvent(userId, eventType, eventData = {}, metadata = {}) {
    const event = {
      userId,
      eventType,
      eventData,
      timestamp: Date.now(),
      sessionId: metadata.sessionId || null,
      deviceInfo: metadata.deviceInfo || {},
      location: metadata.location || null
    };

    this.eventBuffer.push(event);

    if (this.eventBuffer.length >= this.bufferSize) {
      setTimeout(() => this.flushBuffer(), 0);
    }

    return { success: true, queued: true };
  }

  async trackPageView(userId, pageData) {
    return this.trackEvent(userId, 'page_view', {
      page: pageData.page,
      title: pageData.title,
      referrer: pageData.referrer,
      url: pageData.url
    }, {
      sessionId: pageData.sessionId,
      deviceInfo: pageData.deviceInfo,
      location: pageData.location
    });
  }

  async trackClick(userId, clickData) {
    return this.trackEvent(userId, 'click', {
      element: clickData.element,
      elementId: clickData.elementId,
      elementClass: clickData.elementClass,
      x: clickData.x,
      y: clickData.y
    }, {
      sessionId: clickData.sessionId,
      deviceInfo: clickData.deviceInfo
    });
  }

  async trackFormSubmission(userId, formData) {
    return this.trackEvent(userId, 'form_submission', {
      formId: formData.formId,
      formName: formData.formName,
      success: formData.success,
      fieldsCount: formData.fieldsCount,
      duration: formData.duration
    }, {
      sessionId: formData.sessionId
    });
  }

  async trackSearch(userId, searchData) {
    return this.trackEvent(userId, 'search', {
      query: searchData.query,
      resultsCount: searchData.resultsCount,
      filters: searchData.filters
    }, {
      sessionId: searchData.sessionId
    });
  }

  async trackApiCall(userId, apiData) {
    return this.trackEvent(userId, 'api_call', {
      endpoint: apiData.endpoint,
      method: apiData.method,
      statusCode: apiData.statusCode,
      duration: apiData.duration,
      responseSize: apiData.responseSize
    });
  }

  async trackUserBehavior(userId, behaviorData) {
    return this.trackEvent(userId, 'user_behavior', {
      type: behaviorData.type,
      duration: behaviorData.duration,
      actions: behaviorData.actions,
      scrollDepth: behaviorData.scrollDepth,
      clicksCount: behaviorData.clicksCount
    }, {
      sessionId: behaviorData.sessionId
    });
  }

  async getEventStats(options = {}) {
    const { startDate, endDate, eventType, userId, granularity = 'day' } = options;

    let dateFormat = 'YYYY-MM-DD';
    if (granularity === 'hour') dateFormat = 'YYYY-MM-DD HH24:00';
    if (granularity === 'month') dateFormat = 'YYYY-MM';

    let query = `
      SELECT 
        DATE_TRUNC('${granularity}', timestamp) as time,
        event_type,
        COUNT(*) as count,
        COUNT(DISTINCT user_id) as unique_users
      FROM analytics_events
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (startDate) {
      query += ` AND timestamp >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      query += ` AND timestamp <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    if (eventType) {
      query += ` AND event_type = $${paramIndex}`;
      params.push(eventType);
      paramIndex++;
    }

    if (userId) {
      query += ` AND user_id = $${paramIndex}`;
      params.push(userId);
      paramIndex++;
    }

    query += ` GROUP BY time, event_type ORDER BY time DESC`;

    try {
      const result = await db.query(query, params);
      return {
        success: true,
        data: result.rows,
        granularity
      };
    } catch (error) {
      console.error('Error getting event stats:', error);
      return { success: false, error: error.message };
    }
  }

  async getUserJourney(userId, sessionId = null) {
    try {
      let query = `
        SELECT 
          event_type,
          event_data,
          timestamp,
          session_id
        FROM analytics_events
        WHERE user_id = $1
      `;
      const params = [userId];

      if (sessionId) {
        query += ` AND session_id = $2`;
        params.push(sessionId);
      }

      query += ` ORDER BY timestamp ASC LIMIT 1000`;

      const result = await db.query(query, params);

      return {
        success: true,
        journey: result.rows,
        totalEvents: result.rows.length
      };
    } catch (error) {
      console.error('Error getting user journey:', error);
      return { success: false, error: error.message };
    }
  }

  async getFunnelAnalysis(funnelSteps) {
    try {
      const results = [];
      let previousCount = null;

      for (const step of funnelSteps) {
        let query = `
          SELECT COUNT(DISTINCT user_id) as count
          FROM analytics_events
          WHERE event_type = $1
        `;
        const params = [step.eventType];

        if (step.properties) {
          const propertyConditions = Object.keys(step.properties).map((key, idx) => {
            params.push(step.properties[key]);
            return `event_data->>'${key}' = $${params.length}`;
          });
          query += ` AND ${propertyConditions.join(' AND ')}`;
        }

        if (previousCount !== null && step.withinDays) {
          query += ` AND user_id IN (
            SELECT DISTINCT user_id FROM analytics_events 
            WHERE event_type = $${params.length + 1}
            AND timestamp >= NOW() - INTERVAL '${step.withinDays} days'
          )`;
        }

        const result = await db.query(query, params);
        const count = parseInt(result.rows[0]?.count || 0);

        results.push({
          step: step.name,
          eventType: step.eventType,
          count,
          conversionRate: previousCount ? ((count / previousCount) * 100).toFixed(2) : 100
        });

        previousCount = count;
      }

      return { success: true, funnel: results };
    } catch (error) {
      console.error('Error performing funnel analysis:', error);
      return { success: false, error: error.message };
    }
  }

  async getCohortAnalysis(cohortType = 'daily', eventType = null) {
    try {
      const dateTrunc = cohortType === 'weekly' ? 'week' : 'day';

      const query = `
        WITH cohorts AS (
          SELECT 
            user_id,
            DATE_TRUNC('${dateTrunc}', MIN(timestamp)) as cohort_date
          FROM analytics_events
          ${eventType ? `WHERE event_type = '${eventType}'` : ''}
          GROUP BY user_id
        ),
        activity AS (
          SELECT 
            ae.user_id,
            DATE_TRUNC('${dateTrunc}', ae.timestamp) as activity_date,
            c.cohort_date
          FROM analytics_events ae
          JOIN cohorts c ON ae.user_id = c.user_id
          ${eventType ? `WHERE ae.event_type = '${eventType}'` : ''}
        )
        SELECT 
          cohort_date,
          activity_date,
          COUNT(DISTINCT user_id) as users
        FROM activity
        GROUP BY cohort_date, activity_date
        ORDER BY cohort_date, activity_date
      `;

      const result = await db.query(query);

      const cohorts = {};
      result.rows.forEach(row => {
        const cohortKey = row.cohort_date.toISOString().split('T')[0];
        if (!cohorts[cohortKey]) {
          cohorts[cohortKey] = { cohortDate: cohortKey, retention: [] };
        }
        const period = Math.floor((new Date(row.activity_date) - new Date(row.cohort_date)) / (1000 * 60 * 60 * 24));
        cohorts[cohortKey].retention[period] = parseInt(row.users);
      });

      return {
        success: true,
        cohorts: Object.values(cohorts)
      };
    } catch (error) {
      console.error('Error performing cohort analysis:', error);
      return { success: false, error: error.message };
    }
  }

  async getRealTimeMetrics() {
    if (!this.redisConnected) {
      return { success: false, error: 'Redis not connected' };
    }

    try {
      const now = Date.now();
      const oneMinuteAgo = now - 60000;
      const fiveMinutesAgo = now - 300000;

      const [lastMinuteEvents, lastFiveMinutesEvents, activeUsers, topEvents] = await Promise.all([
        redisClient.zCount('analytics:events:realtime', fiveMinutesAgo, now),
        redisClient.zCount('analytics:events:realtime', fiveMinutesAgo, now),
        redisClient.sCard('analytics:users:session'),
        this.getTopEventsInPeriod(60000)
      ]);

      return {
        success: true,
        metrics: {
          eventsLastMinute: lastMinuteEvents,
          eventsLastFiveMinutes: lastFiveMinutesEvents,
          activeUsers,
          topEvents,
          timestamp: now
        }
      };
    } catch (error) {
      console.error('Error getting real-time metrics:', error);
      return { success: false, error: error.message };
    }
  }

  async getTopEventsInPeriod(periodMs) {
    try {
      const startTime = Date.now() - periodMs;
      const events = await redisClient.zRange('analytics:events:realtime', startTime, Date.now());

      const eventCounts = {};
      events.forEach(eventStr => {
        try {
          const event = JSON.parse(eventStr);
          eventCounts[event.eventType] = (eventCounts[event.eventType] || 0) + 1;
        } catch (e) {}
      });

      return Object.entries(eventCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([eventType, count]) => ({ eventType, count }));
    } catch (error) {
      return [];
    }
  }

  async cleanup(options = {}) {
    const { olderThanDays = 90 } = options;

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const result = await db.query(
        `DELETE FROM analytics_events WHERE timestamp < $1`,
        [cutoffDate.getTime()]
      );

      return {
        success: true,
        deletedCount: result.rowCount
      };
    } catch (error) {
      console.error('Error cleaning up analytics data:', error);
      return { success: false, error: error.message };
    }
  }
}

const dataCollectionService = new DataCollectionService();

module.exports = dataCollectionService;
