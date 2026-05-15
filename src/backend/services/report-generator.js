const db = require('../../config/database/db');
const redisClient = require('../../config/redis/client');
const path = require('path');
const fs = require('fs').promises;

class ReportGeneratorService {
  constructor() {
    this.templates = this.loadTemplates();
    this.supportedFormats = ['pdf', 'excel', 'csv', 'json'];
  }

  loadTemplates() {
    return {
      summary: {
        name: 'Summary Report',
        description: 'Overview of key metrics and KPIs',
        sections: ['summary', 'topEvents', 'userEngagement', 'trends']
      },
      detailed: {
        name: 'Detailed Analytics Report',
        description: 'Comprehensive analysis with all metrics',
        sections: ['summary', 'activityByDay', 'topEvents', 'userEngagement', 'deviceBreakdown', 'geographicData', 'funnels', 'cohorts']
      },
      executive: {
        name: 'Executive Summary',
        description: 'High-level overview for leadership',
        sections: ['summary', 'trends', 'keyInsights']
      },
      custom: {
        name: 'Custom Report',
        description: 'User-defined metrics and visualizations',
        sections: []
      }
    };
  }

  async generateReport(options = {}) {
    const {
      template = 'summary',
      format = 'pdf',
      period = { days: 7 },
      sections = [],
      filters = {},
      title = 'Analytics Report',
      includeCharts = true
    } = options;

    try {
      const templateConfig = this.templates[template] || this.templates.custom;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - period.days);

      const reportData = await this.gatherReportData(templateConfig, startDate, options);

      const report = {
        meta: {
          id: this.generateReportId(),
          title,
          template,
          format,
          generatedAt: new Date().toISOString(),
          period: {
            start: startDate.toISOString(),
            end: new Date().toISOString(),
            days: period.days
          },
          version: '1.0'
        },
        data: reportData,
        charts: includeCharts ? await this.generateChartData(reportData) : []
      };

      return report;
    } catch (error) {
      console.error('Error generating report:', error);
      throw error;
    }
  }

  async gatherReportData(templateConfig, startDate, options) {
    const sections = templateConfig.sections.length > 0 ? templateConfig.sections : options.sections || [];

    const dataGatherers = {
      summary: async () => this.getSummaryData(startDate),
      activityByDay: async () => this.getActivityData(startDate),
      topEvents: async () => this.getTopEventsData(startDate, 20),
      userEngagement: async () => this.getUserEngagementData(startDate),
      deviceBreakdown: async () => this.getDeviceData(startDate),
      geographicData: async () => this.getGeographicData(startDate),
      funnels: async () => this.getFunnelData(options.funnels || []),
      cohorts: async () => this.getCohortData(startDate),
      trends: async () => this.getTrendData(startDate),
      keyInsights: async () => this.generateInsights(startDate)
    };

    const data = {};
    for (const section of sections) {
      if (dataGatherers[section]) {
        data[section] = await dataGatherers[section]();
      }
    }

    return data;
  }

  async getSummaryData(startDate) {
    try {
      const stats = await db.query(`
        SELECT 
          COUNT(*) as total_events,
          COUNT(DISTINCT user_id) as unique_users,
          COUNT(DISTINCT session_id) as sessions,
          COUNT(DISTINCT event_type) as event_types
        FROM analytics_events
        WHERE timestamp >= $1
      `, [startDate.getTime()]);

      const previousPeriodStart = new Date(startDate);
      previousPeriodStart.setDate(previousPeriodStart.getDate() * 2);
      const previousStats = await db.query(`
        SELECT COUNT(*) as total_events
        FROM analytics_events
        WHERE timestamp >= $1 AND timestamp < $2
      `, [previousPeriodStart.getTime(), startDate.getTime()]);

      const currentEvents = parseInt(stats.rows[0]?.total_events || 0);
      const previousEvents = parseInt(previousStats.rows[0]?.total_events || 0);
      const changePercent = previousEvents > 0 
        ? (((currentEvents - previousEvents) / previousEvents) * 100).toFixed(1)
        : 0;

      return {
        totalEvents: currentEvents,
        uniqueUsers: parseInt(stats.rows[0]?.unique_users || 0),
        totalSessions: parseInt(stats.rows[0]?.sessions || 0),
        eventTypes: parseInt(stats.rows[0]?.event_types || 0),
        comparison: {
          changePercent,
          isPositive: changePercent >= 0
        }
      };
    } catch (error) {
      console.error('Error getting summary data:', error);
      return {};
    }
  }

  async getActivityData(startDate) {
    try {
      const result = await db.query(`
        SELECT 
          DATE(timestamp) as date,
          COUNT(*) as events,
          COUNT(DISTINCT user_id) as users,
          COUNT(DISTINCT session_id) as sessions
        FROM analytics_events
        WHERE timestamp >= $1
        GROUP BY DATE(timestamp)
        ORDER BY date ASC
      `, [startDate.getTime()]);

      return result.rows.map(row => ({
        date: row.date.toISOString().split('T')[0],
        events: parseInt(row.events),
        users: parseInt(row.users),
        sessions: parseInt(row.sessions)
      }));
    } catch (error) {
      console.error('Error getting activity data:', error);
      return [];
    }
  }

  async getTopEventsData(startDate, limit = 20) {
    try {
      const result = await db.query(`
        SELECT 
          event_type,
          COUNT(*) as count,
          COUNT(DISTINCT user_id) as unique_users,
          COUNT(DISTINCT session_id) as sessions
        FROM analytics_events
        WHERE timestamp >= $1
        GROUP BY event_type
        ORDER BY count DESC
        LIMIT $2
      `, [startDate.getTime(), limit]);

      return result.rows.map(row => ({
        eventType: row.event_type,
        count: parseInt(row.count),
        uniqueUsers: parseInt(row.unique_users),
        sessions: parseInt(row.sessions)
      }));
    } catch (error) {
      console.error('Error getting top events data:', error);
      return [];
    }
  }

  async getUserEngagementData(startDate) {
    try {
      const userTypes = await db.query(`
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
        userTypes: userTypes.rows,
        weeklyRetention: retention.rows
      };
    } catch (error) {
      console.error('Error getting user engagement data:', error);
      return { userTypes: [], weeklyRetention: [] };
    }
  }

  async getDeviceData(startDate) {
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
      console.error('Error getting device data:', error);
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

  async getFunnelData(funnels) {
    const results = [];

    for (const funnel of funnels) {
      let previousCount = null;
      const steps = [];

      for (const step of funnel.steps) {
        const result = await db.query(`
          SELECT COUNT(DISTINCT user_id) as count
          FROM analytics_events
          WHERE event_type = $1
        `, [step.eventType]);

        const count = parseInt(result.rows[0]?.count || 0);
        steps.push({
          name: step.name,
          eventType: step.eventType,
          count,
          conversionRate: previousCount ? ((count / previousCount) * 100).toFixed(2) : 100
        });

        previousCount = count;
      }

      results.push({ name: funnel.name, steps });
    }

    return results;
  }

  async getCohortData(startDate) {
    try {
      const result = await db.query(`
        WITH cohorts AS (
          SELECT 
            user_id,
            DATE_TRUNC('week', MIN(timestamp)) as cohort_week
          FROM analytics_events
          WHERE timestamp >= $1
          GROUP BY user_id
        )
        SELECT 
          cohort_week,
          COUNT(*) as cohort_size
        FROM cohorts
        GROUP BY cohort_week
        ORDER BY cohort_week DESC
        LIMIT 12
      `, [startDate.getTime()]);

      return result.rows.map(row => ({
        cohortWeek: row.cohort_week.toISOString(),
        cohortSize: parseInt(row.cohort_size)
      }));
    } catch (error) {
      console.error('Error getting cohort data:', error);
      return [];
    }
  }

  async getTrendData(startDate) {
    try {
      const result = await db.query(`
        SELECT 
          event_type,
          DATE(timestamp) as date,
          COUNT(*) as count
        FROM analytics_events
        WHERE timestamp >= $1
          AND event_type IN (
            SELECT event_type 
            FROM analytics_events 
            WHERE timestamp >= $1
            GROUP BY event_type 
            ORDER BY COUNT(*) DESC 
            LIMIT 5
          )
        GROUP BY event_type, DATE(timestamp)
        ORDER BY event_type, date
      `, [startDate.getTime()]);

      const trends = {};
      result.rows.forEach(row => {
        const eventType = row.event_type;
        if (!trends[eventType]) {
          trends[eventType] = [];
        }
        trends[eventType].push({
          date: row.date.toISOString().split('T')[0],
          count: parseInt(row.count)
        });
      });

      return trends;
    } catch (error) {
      console.error('Error getting trend data:', error);
      return {};
    }
  }

  async generateInsights(startDate) {
    const insights = [];

    try {
      const topEvent = await db.query(`
        SELECT event_type, COUNT(*) as count
        FROM analytics_events
        WHERE timestamp >= $1
        GROUP BY event_type
        ORDER BY count DESC
        LIMIT 1
      `, [startDate.getTime()]);

      if (topEvent.rows.length > 0) {
        insights.push({
          type: 'top_metric',
          title: 'Most Popular Event',
          description: `${topEvent.rows[0].event_type} with ${topEvent.rows[0].count} occurrences`,
          importance: 'high'
        });
      }

      const userRetention = await db.query(`
        SELECT 
          COUNT(DISTINCT user_id) FILTER (WHERE timestamp >= $1) as current_users,
          COUNT(DISTINCT user_id) FILTER (WHERE timestamp >= $2 AND timestamp < $1) as returning_users
        FROM analytics_events
      `, [startDate.getTime(), startDate.getTime() * 2]);

      if (userRetention.rows[0]) {
        const { current_users, returning_users } = userRetention.rows[0];
        const retentionRate = current_users > 0 ? ((returning_users / current_users) * 100).toFixed(1) : 0;
        insights.push({
          type: 'retention',
          title: 'User Retention Rate',
          description: `${retentionRate}% of users returned`,
          importance: retentionRate > 50 ? 'high' : 'medium'
        });
      }

      const peakActivity = await db.query(`
        SELECT 
          TO_CHAR(timestamp, 'HH24:00') as hour,
          COUNT(*) as count
        FROM analytics_events
        WHERE timestamp >= $1
        GROUP BY hour
        ORDER BY count DESC
        LIMIT 1
      `, [startDate.getTime()]);

      if (peakActivity.rows.length > 0) {
        insights.push({
          type: 'peak_time',
          title: 'Peak Activity Hour',
          description: `Most activity occurs at ${peakActivity.rows[0].hour}:00`,
          importance: 'medium'
        });
      }
    } catch (error) {
      console.error('Error generating insights:', error);
    }

    return insights;
  }

  async generateChartData(reportData) {
    const charts = [];

    if (reportData.activityByDay && reportData.activityByDay.length > 0) {
      charts.push({
        type: 'line',
        title: 'Activity Over Time',
        data: reportData.activityByDay.map(row => ({
          x: row.date,
          y: row.events,
          users: row.users
        })),
        xKey: 'date',
        yKey: 'events'
      });
    }

    if (reportData.topEvents && reportData.topEvents.length > 0) {
      charts.push({
        type: 'bar',
        title: 'Top Events',
        data: reportData.topEvents.slice(0, 10),
        xKey: 'eventType',
        yKey: 'count'
      });
    }

    if (reportData.userEngagement?.userTypes) {
      charts.push({
        type: 'pie',
        title: 'User Distribution',
        data: reportData.userEngagement.userTypes,
        nameKey: 'user_type',
        valueKey: 'count'
      });
    }

    if (reportData.deviceBreakdown && reportData.deviceBreakdown.length > 0) {
      charts.push({
        type: 'bar',
        title: 'Device Breakdown',
        data: reportData.deviceBreakdown,
        xKey: 'deviceType',
        yKey: 'count'
      });
    }

    return charts;
  }

  generateReportId() {
    return `rpt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async exportToFormat(report, format) {
    switch (format.toLowerCase()) {
      case 'json':
        return this.exportToJSON(report);
      case 'csv':
        return this.exportToCSV(report);
      case 'excel':
        return this.exportToExcel(report);
      case 'pdf':
        return this.exportToPDF(report);
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  exportToJSON(report) {
    return {
      content: JSON.stringify(report, null, 2),
      contentType: 'application/json',
      filename: `${report.meta.title.replace(/\s+/g, '_')}_${report.meta.id}.json`
    };
  }

  exportToCSV(report) {
    const lines = [];

    lines.push(`Report: ${report.meta.title}`);
    lines.push(`Generated: ${report.meta.generatedAt}`);
    lines.push(`Period: ${report.meta.period.start} to ${report.meta.period.end}`);
    lines.push('');

    if (report.data.summary) {
      lines.push('=== Summary ===');
      Object.entries(report.data.summary).forEach(([key, value]) => {
        if (typeof value !== 'object') {
          lines.push(`${key}: ${value}`);
        }
      });
      lines.push('');
    }

    if (report.data.activityByDay) {
      lines.push('=== Daily Activity ===');
      lines.push('Date,Events,Users,Sessions');
      report.data.activityByDay.forEach(row => {
        lines.push(`${row.date},${row.events},${row.users},${row.sessions}`);
      });
      lines.push('');
    }

    if (report.data.topEvents) {
      lines.push('=== Top Events ===');
      lines.push('Event Type,Count,Unique Users');
      report.data.topEvents.forEach(row => {
        lines.push(`${row.eventType},${row.count},${row.uniqueUsers}`);
      });
    }

    return {
      content: lines.join('\n'),
      contentType: 'text/csv',
      filename: `${report.meta.title.replace(/\s+/g, '_')}_${report.meta.id}.csv`
    };
  }

  async exportToExcel(report) {
    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'HJTPX Analytics';
    workbook.created = new Date();

    const summarySheet = workbook.addWorksheet('Summary');
    summarySheet.columns = [
      { header: 'Metric', key: 'metric', width: 30 },
      { header: 'Value', key: 'value', width: 20 }
    ];

    if (report.data.summary) {
      Object.entries(report.data.summary).forEach(([key, value]) => {
        if (typeof value !== 'object') {
          summarySheet.addRow({ metric: key, value });
        }
      });
    }

    if (report.data.activityByDay) {
      const activitySheet = workbook.addWorksheet('Activity');
      activitySheet.columns = [
        { header: 'Date', key: 'date', width: 15 },
        { header: 'Events', key: 'events', width: 15 },
        { header: 'Users', key: 'users', width: 15 },
        { header: 'Sessions', key: 'sessions', width: 15 }
      ];
      report.data.activityByDay.forEach(row => activitySheet.addRow(row));
    }

    if (report.data.topEvents) {
      const eventsSheet = workbook.addWorksheet('Top Events');
      eventsSheet.columns = [
        { header: 'Event Type', key: 'eventType', width: 40 },
        { header: 'Count', key: 'count', width: 15 },
        { header: 'Unique Users', key: 'uniqueUsers', width: 15 }
      ];
      report.data.topEvents.forEach(row => eventsSheet.addRow(row));
    }

    const buffer = await workbook.xlsx.writeBuffer();

    return {
      content: buffer,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      filename: `${report.meta.title.replace(/\s+/g, '_')}_${report.meta.id}.xlsx`
    };
  }

  async exportToPDF(report) {
    const pdfContent = this.generatePDFContent(report);

    return {
      content: pdfContent,
      contentType: 'application/pdf',
      filename: `${report.meta.title.replace(/\s+/g, '_')}_${report.meta.id}.pdf`
    };
  }

  generatePDFContent(report) {
    let content = '';

    content += `${report.meta.title}\n`;
    content += `${'='.repeat(report.meta.title.length)}\n\n`;
    content += `Generated: ${report.meta.generatedAt}\n`;
    content += `Period: ${report.meta.period.start} to ${report.meta.period.end}\n\n`;

    if (report.data.summary) {
      content += `SUMMARY\n${'-'.repeat(50)}\n`;
      Object.entries(report.data.summary).forEach(([key, value]) => {
        if (typeof value !== 'object') {
          content += `${key}: ${value}\n`;
        }
      });
      content += '\n';
    }

    if (report.data.activityByDay && report.data.activityByDay.length > 0) {
      content += `DAILY ACTIVITY\n${'-'.repeat(50)}\n`;
      content += 'Date         | Events | Users | Sessions\n';
      content += '-'.repeat(50) + '\n';
      report.data.activityByDay.forEach(row => {
        content += `${row.date}    | ${row.events.toString().padStart(6)} | ${row.users.toString().padStart(5)} | ${row.sessions.toString().padStart(7)}\n`;
      });
      content += '\n';
    }

    if (report.data.topEvents && report.data.topEvents.length > 0) {
      content += `TOP EVENTS\n${'-'.repeat(50)}\n`;
      report.data.topEvents.slice(0, 10).forEach((row, idx) => {
        content += `${(idx + 1).toString().padStart(2)}. ${row.eventType} - ${row.count} occurrences\n`;
      });
      content += '\n';
    }

    if (report.data.keyInsights) {
      content += `KEY INSIGHTS\n${'-'.repeat(50)}\n`;
      report.data.keyInsights.forEach(insight => {
        content += `• [${insight.importance.toUpperCase()}] ${insight.title}: ${insight.description}\n`;
      });
    }

    return content;
  }

  async saveReportTemplate(template) {
    try {
      await db.query(`
        INSERT INTO report_templates (name, description, sections, config)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (name) DO UPDATE SET
        description = $2, sections = $3, config = $4, updated_at = NOW()
      `, [template.name, template.description, JSON.stringify(template.sections), JSON.stringify(template.config || {})]);

      return { success: true, message: 'Template saved successfully' };
    } catch (error) {
      console.error('Error saving template:', error);
      return { success: false, error: error.message };
    }
  }

  async getSavedTemplates() {
    try {
      const result = await db.query(`
        SELECT id, name, description, sections, config, created_at, updated_at
        FROM report_templates
        ORDER BY updated_at DESC
      `);

      return {
        success: true,
        templates: result.rows.map(row => ({
          ...row,
          sections: typeof row.sections === 'string' ? JSON.parse(row.sections) : row.sections,
          config: typeof row.config === 'string' ? JSON.parse(row.config) : row.config
        }))
      };
    } catch (error) {
      console.error('Error getting saved templates:', error);
      return { success: false, error: error.message };
    }
  }
}

const reportGeneratorService = new ReportGeneratorService();

module.exports = reportGeneratorService;
