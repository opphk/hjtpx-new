const express = require('express');
const router = express.Router();
const enhancedAnalyticsService = require('../services/enhanced-analytics-service');
const dataCollectionService = require('../services/data-collection-service');
const reportGeneratorService = require('../services/report-generator');

router.get('/dashboard', async (req, res) => {
  try {
    const { period = '7d', refresh = false } = req.query;
    const dashboardData = await enhancedAnalyticsService.getDashboardData({
      period,
      refresh: refresh === 'true'
    });
    res.json(dashboardData);
  } catch (error) {
    console.error('Error getting dashboard data:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/realtime', async (req, res) => {
  try {
    const metrics = await dataCollectionService.getRealTimeMetrics();
    res.json(metrics);
  } catch (error) {
    console.error('Error getting real-time metrics:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/track', async (req, res) => {
  try {
    const { userId, eventType, eventData, metadata } = req.body;

    if (!eventType) {
      return res.status(400).json({ error: 'eventType is required' });
    }

    const result = await dataCollectionService.trackEvent(userId, eventType, eventData || {}, metadata || {});
    res.json(result);
  } catch (error) {
    console.error('Error tracking event:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/track/pageview', async (req, res) => {
  try {
    const { userId, page, title, referrer, url, sessionId, deviceInfo, location } = req.body;

    if (!page) {
      return res.status(400).json({ error: 'page is required' });
    }

    const result = await dataCollectionService.trackPageView(userId, {
      page, title, referrer, url, sessionId, deviceInfo, location
    });
    res.json(result);
  } catch (error) {
    console.error('Error tracking page view:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/track/click', async (req, res) => {
  try {
    const { userId, element, elementId, elementClass, x, y, sessionId, deviceInfo } = req.body;

    const result = await dataCollectionService.trackClick(userId, {
      element, elementId, elementClass, x, y, sessionId, deviceInfo
    });
    res.json(result);
  } catch (error) {
    console.error('Error tracking click:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/track/form', async (req, res) => {
  try {
    const { userId, formId, formName, success, fieldsCount, duration, sessionId } = req.body;

    const result = await dataCollectionService.trackFormSubmission(userId, {
      formId, formName, success, fieldsCount, duration, sessionId
    });
    res.json(result);
  } catch (error) {
    console.error('Error tracking form submission:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/track/search', async (req, res) => {
  try {
    const { userId, query, resultsCount, filters, sessionId } = req.body;

    const result = await dataCollectionService.trackSearch(userId, {
      query, resultsCount, filters, sessionId
    });
    res.json(result);
  } catch (error) {
    console.error('Error tracking search:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/track/behavior', async (req, res) => {
  try {
    const { userId, type, duration, actions, scrollDepth, clicksCount, sessionId } = req.body;

    const result = await dataCollectionService.trackUserBehavior(userId, {
      type, duration, actions, scrollDepth, clicksCount, sessionId
    });
    res.json(result);
  } catch (error) {
    console.error('Error tracking user behavior:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const { startDate, endDate, eventType, userId, granularity = 'day' } = req.query;
    const stats = await dataCollectionService.getEventStats({
      startDate: startDate ? new Date(startDate).getTime() : undefined,
      endDate: endDate ? new Date(endDate).getTime() : undefined,
      eventType,
      userId,
      granularity
    });
    res.json(stats);
  } catch (error) {
    console.error('Error getting event stats:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/funnel', async (req, res) => {
  try {
    const { steps } = req.body;

    if (!steps || !Array.isArray(steps)) {
      return res.status(400).json({ error: 'steps array is required' });
    }

    const funnel = await dataCollectionService.getFunnelAnalysis(steps);
    res.json(funnel);
  } catch (error) {
    console.error('Error performing funnel analysis:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/cohort', async (req, res) => {
  try {
    const { type = 'daily', eventType } = req.query;
    const cohort = await dataCollectionService.getCohortAnalysis(type, eventType);
    res.json(cohort);
  } catch (error) {
    console.error('Error performing cohort analysis:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/trends', async (req, res) => {
  try {
    const { metrics, period = '30d' } = req.query;

    if (!metrics) {
      return res.status(400).json({ error: 'metrics parameter is required' });
    }

    const metricsArray = metrics.split(',').map(m => m.trim());
    const trends = await enhancedAnalyticsService.getTrendAnalysis(metricsArray, period);
    res.json(trends);
  } catch (error) {
    console.error('Error getting trend analysis:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/predict', async (req, res) => {
  try {
    const { metric, days = 7 } = req.query;

    if (!metric) {
      return res.status(400).json({ error: 'metric parameter is required' });
    }

    const prediction = await enhancedAnalyticsService.getPredictiveAnalytics(metric, parseInt(days));
    res.json(prediction);
  } catch (error) {
    console.error('Error getting predictive analytics:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/correlation', async (req, res) => {
  try {
    const { metrics } = req.query;

    if (!metrics) {
      return res.status(400).json({ error: 'metrics parameter is required' });
    }

    const metricsArray = metrics.split(',').map(m => m.trim());
    const correlations = await enhancedAnalyticsService.getCorrelationAnalysis(metricsArray);
    res.json(correlations);
  } catch (error) {
    console.error('Error getting correlation analysis:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/segments', async (req, res) => {
  try {
    const segments = [
      { name: 'power_users', minEvents: 50 },
      { name: 'regular_users', minEvents: 10, maxEvents: 49 },
      { name: 'casual_users', minEvents: 2, maxEvents: 9 },
      { name: 'one_time_users', maxEvents: 1 }
    ];

    const analysis = await enhancedAnalyticsService.getSegmentAnalysis(segments);
    res.json(analysis);
  } catch (error) {
    console.error('Error getting segment analysis:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/report', async (req, res) => {
  try {
    const {
      template = 'summary',
      format = 'json',
      period = { days: 7 },
      sections = [],
      filters = {},
      title = 'Analytics Report',
      includeCharts = true
    } = req.body;

    const report = await reportGeneratorService.generateReport({
      template,
      format,
      period,
      sections,
      filters,
      title,
      includeCharts
    });

    if (format === 'json') {
      return res.json(report);
    }

    const exported = await reportGeneratorService.exportToFormat(report, format);

    res.setHeader('Content-Type', exported.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${exported.filename}"`);
    res.send(exported.content);
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/reports/templates', async (req, res) => {
  try {
    const saved = await reportGeneratorService.getSavedTemplates();
    res.json({
      success: true,
      builtIn: reportGeneratorService.templates,
      saved: saved.templates || []
    });
  } catch (error) {
    console.error('Error getting templates:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/reports/templates', async (req, res) => {
  try {
    const { name, description, sections, config } = req.body;

    if (!name || !sections) {
      return res.status(400).json({ error: 'name and sections are required' });
    }

    const result = await reportGeneratorService.saveReportTemplate({
      name,
      description,
      sections,
      config
    });
    res.json(result);
  } catch (error) {
    console.error('Error saving template:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/cleanup', async (req, res) => {
  try {
    const { olderThanDays = 90 } = req.body;
    const result = await dataCollectionService.cleanup({ olderThanDays });
    res.json(result);
  } catch (error) {
    console.error('Error cleaning up data:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
