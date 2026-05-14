const express = require('express');

const router = express.Router();
const db = require('../../../config/database/db');
const {
  generatePerformanceReport,
  databaseMonitor,
  cacheMonitor
} = require('../../middleware/performanceMonitor');
const { checkRole } = require('../../middleware/rbac');
const analyticsService = require('../../services/analyticsService');

router.get('/dashboard', async (req, res) => {
  try {
    const summary = await analyticsService.getDashboardSummary();
    const performanceReport = generatePerformanceReport();

    const cacheStats = cacheMonitor()?.getStats() || null;
    const dbStats = databaseMonitor.getMetrics();

    res.json({
      success: true,
      data: {
        analytics: summary,
        performance: performanceReport.performance,
        database: dbStats,
        cache: cacheStats,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard data'
    });
  }
});

router.get('/users/:userId/activity', async (req, res) => {
  try {
    const { userId } = req.params;
    const { days = 7 } = req.query;

    const stats = await analyticsService.getUserActivityStats(userId, parseInt(days));

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching user activity:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user activity'
    });
  }
});

router.get('/features/usage', async (req, res) => {
  try {
    const { days = 7 } = req.query;

    const stats = await analyticsService.getFeatureUsageStats(parseInt(days));

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching feature usage:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch feature usage'
    });
  }
});

router.get('/engagement', async (req, res) => {
  try {
    const { days = 7 } = req.query;

    const stats = await analyticsService.getUserEngagementStats(parseInt(days));

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching engagement stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch engagement stats'
    });
  }
});

router.get('/realtime', async (req, res) => {
  try {
    const stats = await analyticsService.getRealTimeStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching real-time stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch real-time stats'
    });
  }
});

router.get('/api/performance', async (req, res) => {
  try {
    const { days = 7 } = req.query;

    const stats = await analyticsService.getApiPerformanceStats(parseInt(days));

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching API performance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch API performance'
    });
  }
});

router.get('/anomalies', async (req, res) => {
  try {
    const anomalies = await analyticsService.detectAnomalies();

    res.json({
      success: true,
      data: anomalies
    });
  } catch (error) {
    console.error('Error detecting anomalies:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to detect anomalies'
    });
  }
});

router.get('/performance/report', async (req, res) => {
  try {
    const report = generatePerformanceReport();

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Error generating performance report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate performance report'
    });
  }
});

router.get('/performance/database', async (req, res) => {
  try {
    const metrics = databaseMonitor.getMetrics();

    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    console.error('Error fetching database metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch database metrics'
    });
  }
});

router.get('/performance/cache', async (req, res) => {
  try {
    const stats = cacheMonitor()?.getDetailedStats() || null;

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching cache stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch cache stats'
    });
  }
});

router.post('/track/event', async (req, res) => {
  try {
    const { userId, eventType, eventData = {} } = req.body;

    if (!userId || !eventType) {
      return res.status(400).json({
        success: false,
        error: 'userId and eventType are required'
      });
    }

    const result = await analyticsService.trackEvent(userId, eventType, eventData);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error tracking event:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to track event'
    });
  }
});

router.post('/track/pageview', async (req, res) => {
  try {
    const { userId, page, metadata = {} } = req.body;

    if (!userId || !page) {
      return res.status(400).json({
        success: false,
        error: 'userId and page are required'
      });
    }

    const result = await analyticsService.trackPageView(userId, page, metadata);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error tracking page view:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to track page view'
    });
  }
});

router.post('/track/feature', async (req, res) => {
  try {
    const { userId, feature, action, metadata = {} } = req.body;

    if (!userId || !feature || !action) {
      return res.status(400).json({
        success: false,
        error: 'userId, feature, and action are required'
      });
    }

    const result = await analyticsService.trackFeatureUsage(userId, feature, action, metadata);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error tracking feature usage:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to track feature usage'
    });
  }
});

router.get('/charts/daily', async (req, res) => {
  try {
    const { days = 30 } = req.query;

    const dailyStats = await db.query(
      `SELECT
         DATE(created_at) as date,
         COUNT(DISTINCT user_id) as unique_users,
         COUNT(*) as total_events,
         COUNT(*) FILTER (WHERE event_type LIKE 'feature:%') as feature_events,
         COUNT(*) FILTER (WHERE event_type = 'page_view') as page_views
       FROM user_events
       WHERE created_at >= NOW() - INTERVAL '1 day' * $1
       GROUP BY DATE(created_at)
       ORDER BY date DESC`,
      [parseInt(days)]
    );

    res.json({
      success: true,
      data: {
        chart: {
          labels: dailyStats.rows.map(r => r.date),
          datasets: {
            uniqueUsers: dailyStats.rows.map(r => parseInt(r.unique_users)),
            totalEvents: dailyStats.rows.map(r => parseInt(r.total_events)),
            featureEvents: dailyStats.rows.map(r => parseInt(r.feature_events)),
            pageViews: dailyStats.rows.map(r => parseInt(r.page_views))
          }
        },
        period: { days: parseInt(days) }
      }
    });
  } catch (error) {
    console.error('Error fetching daily chart data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch chart data'
    });
  }
});

router.get('/charts/feature-usage', async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const featureStats = await db.query(
      `SELECT
         event_type as feature,
         COUNT(*) as usage_count,
         COUNT(DISTINCT user_id) as unique_users
       FROM user_events
       WHERE event_type LIKE 'feature:%'
       AND created_at >= NOW() - INTERVAL '30 days'
       GROUP BY event_type
       ORDER BY usage_count DESC
       LIMIT $1`,
      [parseInt(limit)]
    );

    res.json({
      success: true,
      data: {
        chart: {
          labels: featureStats.rows.map(r => r.feature.replace('feature:', '').split(':')[0]),
          datasets: {
            usageCount: featureStats.rows.map(r => parseInt(r.usage_count)),
            uniqueUsers: featureStats.rows.map(r => parseInt(r.unique_users))
          }
        }
      }
    });
  } catch (error) {
    console.error('Error fetching feature usage chart:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch chart data'
    });
  }
});

router.get('/charts/api-performance', async (req, res) => {
  try {
    const { days = 7 } = req.query;

    const apiStats = await db.query(
      `SELECT
         endpoint,
         DATE(created_at) as date,
         COUNT(*) as call_count,
         AVG(duration_ms) as avg_duration,
         PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms) as p95_duration
       FROM api_performance
       WHERE created_at >= NOW() - INTERVAL '1 day' * $1
       GROUP BY endpoint, DATE(created_at)
       ORDER BY date DESC, call_count DESC
       LIMIT 100`,
      [parseInt(days)]
    );

    res.json({
      success: true,
      data: {
        chart: apiStats.rows.map(r => ({
          endpoint: r.endpoint,
          date: r.date,
          callCount: parseInt(r.call_count),
          avgDuration: parseFloat(r.avg_duration),
          p95Duration: parseFloat(r.p95_duration)
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching API performance chart:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch chart data'
    });
  }
});

router.get('/export/summary', async (req, res) => {
  try {
    const { format = 'json', period = '30' } = req.query;

    const summary = await db.query(
      `SELECT
         DATE(created_at) as date,
         COUNT(DISTINCT user_id) as active_users,
         COUNT(*) as total_events,
         COUNT(*) FILTER (WHERE event_type LIKE 'feature:%') as feature_usage,
         COUNT(*) FILTER (WHERE event_type = 'page_view') as page_views
       FROM user_events
       WHERE created_at >= NOW() - INTERVAL '1 day' * $1
       GROUP BY DATE(created_at)
       ORDER BY date DESC`,
      [parseInt(period)]
    );

    const data = summary.rows.map(r => ({
      date: r.date,
      active_users: parseInt(r.active_users),
      total_events: parseInt(r.total_events),
      feature_usage: parseInt(r.feature_usage),
      page_views: parseInt(r.page_views)
    }));

    if (format === 'csv') {
      const csvHeader = 'Date,Active Users,Total Events,Feature Usage,Page Views\n';
      const csvRows = data
        .map(
          r => `${r.date},${r.active_users},${r.total_events},${r.feature_usage},${r.page_views}`
        )
        .join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=analytics-summary.csv');
      return res.send(csvHeader + csvRows);
    }

    res.json({
      success: true,
      data: data,
      exportedAt: new Date().toISOString(),
      period: `${period} days`
    });
  } catch (error) {
    console.error('Error exporting summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export summary'
    });
  }
});

router.get('/export/performance', async (req, res) => {
  try {
    const { format = 'json', days = 7 } = req.query;

    const performance = await db.query(
      `SELECT
         endpoint,
         method,
         COUNT(*) as call_count,
         AVG(duration_ms)::INTEGER as avg_duration,
         MIN(duration_ms) as min_duration,
         MAX(duration_ms) as max_duration,
         PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms)::INTEGER as p95_duration,
         COUNT(*) FILTER (WHERE status_code >= 400) as error_count
       FROM api_performance
       WHERE created_at >= NOW() - INTERVAL '1 day' * $1
       GROUP BY endpoint, method
       ORDER BY call_count DESC`,
      [parseInt(days)]
    );

    const data = performance.rows.map(r => ({
      endpoint: r.endpoint,
      method: r.method,
      call_count: parseInt(r.call_count),
      avg_duration_ms: parseInt(r.avg_duration),
      min_duration_ms: parseInt(r.min_duration),
      max_duration_ms: parseInt(r.max_duration),
      p95_duration_ms: parseInt(r.p95_duration),
      error_count: parseInt(r.error_count)
    }));

    if (format === 'csv') {
      const csvHeader =
        'Endpoint,Method,Call Count,Avg Duration (ms),Min Duration (ms),Max Duration (ms),P95 Duration (ms),Error Count\n';
      const csvRows = data
        .map(
          r =>
            `${r.endpoint},${r.method},${r.call_count},${r.avg_duration_ms},${r.min_duration_ms},${r.max_duration_ms},${r.p95_duration_ms},${r.error_count}`
        )
        .join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=api-performance.csv');
      return res.send(csvHeader + csvRows);
    }

    res.json({
      success: true,
      data: data,
      exportedAt: new Date().toISOString(),
      period: `${days} days`
    });
  } catch (error) {
    console.error('Error exporting performance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export performance'
    });
  }
});

module.exports = router;
