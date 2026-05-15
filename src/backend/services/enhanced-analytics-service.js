const db = require('../../config/database/db');
const redisClient = require('../../config/redis/client');
const dataCollectionService = require('./data-collection-service');

class EnhancedAnalyticsService {
  constructor() {
    this.redisConnected = false;
    this.cache = new Map();
    this.cacheTTL = 60000;
    this.init();
  }

  async init() {
    try {
      if (!redisClient.isOpen) {
        await redisClient.connect();
      }
      this.redisConnected = true;
    } catch (error) {
      console.error('Redis connection failed:', error);
      this.redisConnected = false;
    }
  }

  getCached(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }
    return null;
  }

  setCache(key, data) {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  async getDashboardData(options = {}) {
    const { period = '7d', refresh = false } = options;
    const cacheKey = `dashboard:${period}`;

    if (!refresh) {
      const cached = this.getCached(cacheKey);
      if (cached) return cached;
    }

    try {
      const periodDays = this.parsePeriod(period);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - periodDays);

      const [
        summary,
        activityByDay,
        topEvents,
        userEngagement,
        deviceBreakdown,
        geographicData
      ] = await Promise.all([
        this.getSummaryStats(startDate),
        this.getActivityByDay(startDate),
        this.getTopEvents(startDate, 10),
        this.getUserEngagement(startDate),
        this.getDeviceBreakdown(startDate),
        this.getGeographicData(startDate)
      ]);

      const dashboardData = {
        summary,
        activityByDay,
        topEvents,
        userEngagement,
        deviceBreakdown,
        geographicData,
        period: { start: startDate, end: new Date(), days: periodDays },
        generatedAt: new Date().toISOString()
      };

      this.setCache(cacheKey, dashboardData);
      return dashboardData;
    } catch (error) {
      console.error('Error getting dashboard data:', error);
      return { error: error.message };
    }
  }

  parsePeriod(period) {
    const match = period.match(/^(\d+)([dhm])$/);
    if (!match) return 7;
    const value = parseInt(match[1]);
    const unit = match[2];
    if (unit === 'h') return value / 24;
    if (unit === 'm') return value / 30;
    return value;
  }

  async getSummaryStats(startDate) {
    try {
      const stats = await db.query(`
        SELECT 
          COUNT(*) as total_events,
          COUNT(DISTINCT user_id) as unique_users,
          COUNT(DISTINCT session_id) as sessions,
          COUNT(DISTINCT DATE(timestamp)) as active_days
        FROM analytics_events
        WHERE timestamp >= $1
      `, [startDate.getTime()]);

      const eventTypeBreakdown = await db.query(`
        SELECT 
          event_type,
          COUNT(*) as count
        FROM analytics_events
        WHERE timestamp >= $1
        GROUP BY event_type
        ORDER BY count DESC
        LIMIT 5
      `, [startDate.getTime()]);

      return {
        totalEvents: parseInt(stats.rows[0]?.total_events || 0),
        uniqueUsers: parseInt(stats.rows[0]?.unique_users || 0),
        totalSessions: parseInt(stats.rows[0]?.sessions || 0),
        activeDays: parseInt(stats.rows[0]?.active_days || 0),
        eventBreakdown: eventTypeBreakdown.rows,
        avgEventsPerUser: stats.rows[0]?.unique_users > 0 
          ? (stats.rows[0].total_events / stats.rows[0].unique_users).toFixed(2)
          : 0
      };
    } catch (error) {
      console.error('Error getting summary stats:', error);
      return {};
    }
  }

  async getActivityByDay(startDate) {
    try {
      const result = await db.query(`
        SELECT 
          DATE(timestamp) as date,
          COUNT(*) as events,
          COUNT(DISTINCT user_id) as users
        FROM analytics_events
        WHERE timestamp >= $1
        GROUP BY DATE(timestamp)
        ORDER BY date ASC
      `, [startDate.getTime()]);

      return result.rows.map(row => ({
        date: row.date.toISOString().split('T')[0],
        events: parseInt(row.events),
        users: parseInt(row.users)
      }));
    } catch (error) {
      console.error('Error getting activity by day:', error);
      return [];
    }
  }

  async getTopEvents(startDate, limit = 10) {
    try {
      const result = await db.query(`
        SELECT 
          event_type,
          COUNT(*) as count,
          COUNT(DISTINCT user_id) as unique_users
        FROM analytics_events
        WHERE timestamp >= $1
        GROUP BY event_type
        ORDER BY count DESC
        LIMIT $2
      `, [startDate.getTime(), limit]);

      return result.rows.map(row => ({
        eventType: row.event_type,
        count: parseInt(row.count),
        uniqueUsers: parseInt(row.unique_users)
      }));
    } catch (error) {
      console.error('Error getting top events:', error);
      return [];
    }
  }

  async getUserEngagement(startDate) {
    try {
      const engagement = await db.query(`
        SELECT 
          CASE 
            WHEN event_count = 1 THEN 'one_time'
            WHEN event_count BETWEEN 2 AND 5 THEN 'casual'
            WHEN event_count BETWEEN 6 AND 20 THEN 'regular'
            ELSE 'power_user'
          END as user_type,
          COUNT(*) as count
        FROM (
          SELECT user_id, COUNT(*) as event_count
          FROM analytics_events
          WHERE timestamp >= $1 AND user_id IS NOT NULL
          GROUP BY user_id
        ) user_events
        GROUP BY user_type
      `, [startDate.getTime()]);

      const retention = await db.query(`
        SELECT 
          DATE_TRUNC('week', timestamp) as week,
          COUNT(DISTINCT user_id) as returning_users
        FROM analytics_events
        WHERE timestamp >= $1
          AND user_id IN (
            SELECT DISTINCT user_id 
            FROM analytics_events 
            WHERE timestamp < $1
          )
        GROUP BY week
        ORDER BY week DESC
        LIMIT 8
      `, [startDate.getTime()]);

      return {
        userTypes: engagement.rows,
        weeklyRetention: retention.rows
      };
    } catch (error) {
      console.error('Error getting user engagement:', error);
      return { userTypes: [], weeklyRetention: [] };
    }
  }

  async getDeviceBreakdown(startDate) {
    try {
      const result = await db.query(`
        SELECT 
          device_info->>'type' as device_type,
          device_info->>'browser' as browser,
          device_info->>'os' as operating_system,
          COUNT(*) as count
        FROM analytics_events
        WHERE timestamp >= $1 AND device_info IS NOT NULL
        GROUP BY device_info->>'type', device_info->>'browser', device_info->>'os'
        ORDER BY count DESC
        LIMIT 10
      `, [startDate.getTime()]);

      return result.rows.map(row => ({
        deviceType: row.device_type || 'unknown',
        browser: row.browser || 'unknown',
        os: row.operating_system || 'unknown',
        count: parseInt(row.count)
      }));
    } catch (error) {
      console.error('Error getting device breakdown:', error);
      return [];
    }
  }

  async getGeographicData(startDate) {
    try {
      const result = await db.query(`
        SELECT 
          location,
          COUNT(*) as events,
          COUNT(DISTINCT user_id) as users
        FROM analytics_events
        WHERE timestamp >= $1 AND location IS NOT NULL
        GROUP BY location
        ORDER BY events DESC
        LIMIT 10
      `, [startDate.getTime()]);

      return result.rows.map(row => ({
        location: row.location,
        events: parseInt(row.events),
        users: parseInt(row.users)
      }));
    } catch (error) {
      console.error('Error getting geographic data:', error);
      return [];
    }
  }

  async getTrendAnalysis(metrics, period = '30d') {
    try {
      const periodDays = this.parsePeriod(period);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - periodDays);

      const trends = {};
      for (const metric of metrics) {
        const result = await db.query(`
          SELECT 
            DATE(timestamp) as date,
            COUNT(*) as count
          FROM analytics_events
          WHERE timestamp >= $1 AND event_type = $2
          GROUP BY DATE(timestamp)
          ORDER BY date ASC
        `, [startDate.getTime(), metric]);

        const dataPoints = result.rows.map(row => ({
          date: row.date.toISOString().split('T')[0],
          value: parseInt(row.count)
        }));

        const trend = this.calculateTrend(dataPoints);
        trends[metric] = {
          dataPoints,
          trend,
          average: dataPoints.length > 0
            ? (dataPoints.reduce((sum, p) => sum + p.value, 0) / dataPoints.length).toFixed(2)
            : 0
        };
      }

      return { success: true, trends };
    } catch (error) {
      console.error('Error getting trend analysis:', error);
      return { success: false, error: error.message };
    }
  }

  calculateTrend(dataPoints) {
    if (dataPoints.length < 2) return { direction: 'stable', percentage: 0 };

    const firstHalf = dataPoints.slice(0, Math.floor(dataPoints.length / 2));
    const secondHalf = dataPoints.slice(Math.floor(dataPoints.length / 2));

    const firstAvg = firstHalf.reduce((sum, p) => sum + p.value, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, p) => sum + p.value, 0) / secondHalf.length;

    const change = ((secondAvg - firstAvg) / firstAvg) * 100;

    return {
      direction: change > 5 ? 'up' : change < -5 ? 'down' : 'stable',
      percentage: Math.abs(change).toFixed(2)
    };
  }

  async getPredictiveAnalytics(targetMetric, predictionDays = 7) {
    try {
      const historicalData = await db.query(`
        SELECT 
          DATE(timestamp) as date,
          COUNT(*) as count
        FROM analytics_events
        WHERE event_type = $1
          AND timestamp >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(timestamp)
        ORDER BY date ASC
      `, [targetMetric]);

      const dataPoints = historicalData.rows.map(row => parseInt(row.count));
      
      if (dataPoints.length < 7) {
        return {
          success: false,
          error: 'Insufficient historical data for prediction'
        };
      }

      const prediction = this.simpleLinearRegression(dataPoints, predictionDays);

      return {
        success: true,
        prediction: {
          metric: targetMetric,
          predictedValues: prediction.values,
          confidence: prediction.confidence,
          trend: this.calculateTrend(
            historicalData.rows.map(row => ({ date: row.date, value: parseInt(row.count) }))
          ),
          historicalAverage: (dataPoints.reduce((a, b) => a + b, 0) / dataPoints.length).toFixed(2)
        }
      };
    } catch (error) {
      console.error('Error getting predictive analytics:', error);
      return { success: false, error: error.message };
    }
  }

  simpleLinearRegression(data, forecastPeriods) {
    const n = data.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += data[i];
      sumXY += i * data[i];
      sumX2 += i * i;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const meanY = sumY / n;
    let ssTotal = 0, ssResidual = 0;
    for (let i = 0; i < n; i++) {
      const predicted = slope * i + intercept;
      ssTotal += Math.pow(data[i] - meanY, 2);
      ssResidual += Math.pow(data[i] - predicted, 2);
    }
    const rSquared = 1 - (ssResidual / ssTotal);

    const predictions = [];
    for (let i = 0; i < forecastPeriods; i++) {
      const futureIndex = n + i;
      predictions.push({
        day: i + 1,
        predicted: Math.max(0, Math.round(slope * futureIndex + intercept))
      });
    }

    return {
      values: predictions,
      confidence: Math.max(0, Math.min(1, rSquared)).toFixed(2),
      slope: slope.toFixed(4),
      intercept: intercept.toFixed(2)
    };
  }

  async getCorrelationAnalysis(metrics) {
    try {
      const dataPoints = {};

      for (const metric of metrics) {
        const result = await db.query(`
          SELECT 
            DATE(timestamp) as date,
            COUNT(*) as count
          FROM analytics_events
          WHERE event_type = $1
            AND timestamp >= NOW() - INTERVAL '30 days'
          GROUP BY DATE(timestamp)
          ORDER BY date ASC
        `, [metric]);

        dataPoints[metric] = result.rows.map(row => parseInt(row.count));
      }

      const metricNames = Object.keys(dataPoints);
      const correlations = [];

      for (let i = 0; i < metricNames.length; i++) {
        for (let j = i + 1; j < metricNames.length; j++) {
          const metric1 = metricNames[i];
          const metric2 = metricNames[j];
          const arr1 = dataPoints[metric1];
          const arr2 = dataPoints[metric2];

          if (arr1.length !== arr2.length || arr1.length < 3) continue;

          const correlation = this.pearsonCorrelation(arr1, arr2);
          correlations.push({
            metric1,
            metric2,
            correlation: correlation.toFixed(3),
            strength: this.interpretCorrelation(correlation)
          });
        }
      }

      return { success: true, correlations };
    } catch (error) {
      console.error('Error getting correlation analysis:', error);
      return { success: false, error: error.message };
    }
  }

  pearsonCorrelation(arr1, arr2) {
    const n = arr1.length;
    const mean1 = arr1.reduce((a, b) => a + b, 0) / n;
    const mean2 = arr2.reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let denom1 = 0;
    let denom2 = 0;

    for (let i = 0; i < n; i++) {
      const diff1 = arr1[i] - mean1;
      const diff2 = arr2[i] - mean2;
      numerator += diff1 * diff2;
      denom1 += diff1 * diff1;
      denom2 += diff2 * diff2;
    }

    const denominator = Math.sqrt(denom1 * denom2);
    return denominator === 0 ? 0 : numerator / denominator;
  }

  interpretCorrelation(r) {
    const abs = Math.abs(r);
    if (abs >= 0.8) return 'very strong';
    if (abs >= 0.6) return 'strong';
    if (abs >= 0.4) return 'moderate';
    if (abs >= 0.2) return 'weak';
    return 'very weak';
  }

  async getSegmentAnalysis(segments) {
    try {
      const results = [];

      for (const segment of segments) {
        let query = `
          SELECT 
            COUNT(DISTINCT user_id) as users,
            COUNT(*) as events,
            AVG(event_count) as avg_events_per_user
          FROM (
            SELECT user_id, COUNT(*) as event_count
            FROM analytics_events
            WHERE 1=1
        `;
        const params = [];
        let paramIndex = 1;

        if (segment.startDate) {
          query += ` AND timestamp >= $${paramIndex}`;
          params.push(new Date(segment.startDate).getTime());
          paramIndex++;
        }

        if (segment.endDate) {
          query += ` AND timestamp <= $${paramIndex}`;
          params.push(new Date(segment.endDate).getTime());
          paramIndex++;
        }

        query += ` GROUP BY user_id`;

        if (segment.minEvents) {
          query += ` HAVING COUNT(*) >= $${paramIndex}`;
          params.push(segment.minEvents);
          paramIndex++;
        }

        if (segment.maxEvents) {
          query += ` AND COUNT(*) <= $${paramIndex}`;
          params.push(segment.maxEvents);
          paramIndex++;
        }

        query += ` ) user_stats`;

        const result = await db.query(query, params);
        results.push({
          segment: segment.name,
          users: parseInt(result.rows[0]?.users || 0),
          events: parseInt(result.rows[0]?.events || 0),
          avgEventsPerUser: parseFloat(result.rows[0]?.avg_events_per_user || 0).toFixed(2)
        });
      }

      return { success: true, segments: results };
    } catch (error) {
      console.error('Error getting segment analysis:', error);
      return { success: false, error: error.message };
    }
  }
}

const enhancedAnalyticsService = new EnhancedAnalyticsService();

module.exports = enhancedAnalyticsService;
