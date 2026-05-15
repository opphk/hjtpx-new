const { logError, logWarn, logInfo } = require('../../utils/productionLogger');

class OpsAlertService {
  constructor() {
    this.alerts = new Map();
    this.alertHistory = [];
    this.maxHistorySize = 500;
    this.notificationChannels = new Map();
    this.alertRules = new Map();
    this.alertCooldowns = new Map();
    this.initialized = false;
  }

  initialize() {
    if (this.initialized) return;
    
    this.registerDefaultRules();
    this.initialized = true;
    logInfo('Ops alert service initialized');
  }

  registerDefaultRules() {
    const defaultRules = [
      {
        name: 'High CPU Usage',
        type: 'system',
        condition: 'threshold',
        metric: 'cpuUsage',
        threshold: 80,
        severity: 'high',
        enabled: true,
        cooldown: '10m'
      },
      {
        name: 'High Memory Usage',
        type: 'system',
        condition: 'threshold',
        metric: 'memoryUsage',
        threshold: 85,
        severity: 'high',
        enabled: true,
        cooldown: '10m'
      },
      {
        name: 'Server Offline',
        type: 'server',
        condition: 'status_change',
        status: 'offline',
        severity: 'critical',
        enabled: true,
        cooldown: '5m'
      },
      {
        name: 'Deployment Failed',
        type: 'deployment',
        condition: 'status_change',
        status: 'failed',
        severity: 'high',
        enabled: true,
        cooldown: '15m'
      },
      {
        name: 'High Error Rate',
        type: 'application',
        condition: 'error_rate',
        threshold: 0.05,
        timeWindow: '5m',
        severity: 'critical',
        enabled: true,
        cooldown: '5m'
      },
      {
        name: 'Disk Space Low',
        type: 'system',
        condition: 'threshold',
        metric: 'diskUsage',
        threshold: 90,
        severity: 'medium',
        enabled: true,
        cooldown: '30m'
      },
      {
        name: 'SSL Certificate Expiring',
        type: 'security',
        condition: 'expiry',
        daysRemaining: 30,
        severity: 'medium',
        enabled: true,
        cooldown: '24h'
      }
    ];

    defaultRules.forEach(rule => this.registerAlertRule(rule));
  }

  async createAlert(alertData) {
    const alertId = `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const alert = {
      id: alertId,
      type: alertData.type || 'system',
      severity: alertData.severity || 'medium',
      message: alertData.message,
      details: alertData.details || {},
      status: 'active',
      acknowledged: false,
      acknowledgedAt: null,
      acknowledgedBy: null,
      resolved: false,
      resolvedAt: null,
      resolvedBy: null,
      createdAt: new Date().toISOString(),
      tags: alertData.tags || []
    };

    this.alerts.set(alertId, alert);
    this.addToHistory(alert);

    logWarn('Alert created', {
      alertId,
      type: alert.type,
      severity: alert.severity,
      message: alert.message
    });

    await this.notifyChannels(alert);

    return alert;
  }

  async acknowledgeAlert(alertId, userId) {
    const alert = this.alerts.get(alertId);
    if (!alert) {
      throw new Error('Alert not found');
    }

    alert.acknowledged = true;
    alert.acknowledgedAt = new Date().toISOString();
    alert.acknowledgedBy = userId;
    alert.status = 'acknowledged';

    this.alerts.set(alertId, alert);
    this.addToHistory(alert);

    logInfo('Alert acknowledged', { alertId, userId });

    return alert;
  }

  async resolveAlert(alertId, userId) {
    const alert = this.alerts.get(alertId);
    if (!alert) {
      throw new Error('Alert not found');
    }

    alert.resolved = true;
    alert.resolvedAt = new Date().toISOString();
    alert.resolvedBy = userId;
    alert.status = 'resolved';

    this.alerts.set(alertId, alert);
    this.alertCooldowns.delete(alert.type);
    this.addToHistory(alert);

    logInfo('Alert resolved', { alertId, userId });

    return alert;
  }

  async deleteAlert(alertId) {
    const alert = this.alerts.get(alertId);
    if (!alert) {
      throw new Error('Alert not found');
    }

    this.alerts.delete(alertId);
    logInfo('Alert deleted', { alertId });

    return true;
  }

  registerAlertRule(ruleData) {
    const ruleId = `rule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const rule = {
      id: ruleId,
      name: ruleData.name,
      type: ruleData.type,
      condition: ruleData.condition,
      metric: ruleData.metric || null,
      threshold: ruleData.threshold || null,
      severity: ruleData.severity || 'medium',
      enabled: ruleData.enabled !== false,
      cooldown: ruleData.cooldown || '10m',
      timeWindow: ruleData.timeWindow || '5m',
      tags: ruleData.tags || [],
      createdAt: new Date().toISOString(),
      lastTriggered: null
    };

    this.alertRules.set(ruleId, rule);
    logInfo('Alert rule registered', { ruleId, name: rule.name });

    return rule;
  }

  updateAlertRule(ruleId, updates) {
    const rule = this.alertRules.get(ruleId);
    if (!rule) return null;

    Object.assign(rule, updates);
    this.alertRules.set(ruleId, rule);

    logInfo('Alert rule updated', { ruleId });

    return rule;
  }

  deleteAlertRule(ruleId) {
    return this.alertRules.delete(ruleId);
  }

  getAlertRules() {
    return Array.from(this.alertRules.values());
  }

  registerNotificationChannel(channelData) {
    const channelId = `channel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const channel = {
      id: channelId,
      name: channelData.name,
      type: channelData.type,
      config: channelData.config || {},
      enabled: channelData.enabled !== false,
      createdAt: new Date().toISOString()
    };

    this.notificationChannels.set(channelId, channel);
    logInfo('Notification channel registered', { channelId, name: channel.name });

    return channel;
  }

  async notifyChannels(alert) {
    const promises = [];

    for (const [channelId, channel] of this.notificationChannels) {
      if (!channel.enabled) continue;

      promises.push(this.sendNotification(channel, alert));
    }

    await Promise.allSettled(promises);
  }

  async sendNotification(channel, alert) {
    try {
      switch (channel.type) {
        case 'email':
          await this.sendEmailNotification(channel, alert);
          break;
        case 'webhook':
          await this.sendWebhookNotification(channel, alert);
          break;
        case 'slack':
          await this.sendSlackNotification(channel, alert);
          break;
        case 'sms':
          await this.sendSMSNotification(channel, alert);
          break;
        default:
          logWarn('Unknown notification channel type', { channelType: channel.type });
      }

      logInfo('Notification sent', { channelId: channel.id, alertId: alert.id });
    } catch (error) {
      logError(error, null, { context: `Notification channel ${channel.id}` });
    }
  }

  async sendEmailNotification(channel, alert) {
    logInfo('Sending email notification', { alertId: alert.id });
  }

  async sendWebhookNotification(channel, alert) {
    logInfo('Sending webhook notification', { alertId: alert.id });
  }

  async sendSlackNotification(channel, alert) {
    logInfo('Sending Slack notification', { alertId: alert.id });
  }

  async sendSMSNotification(channel, alert) {
    logInfo('Sending SMS notification', { alertId: alert.id });
  }

  async evaluateRules(metrics) {
    const triggeredAlerts = [];

    for (const [ruleId, rule] of this.alertRules) {
      if (!rule.enabled) continue;

      if (this.isInCooldown(rule)) continue;

      if (this.evaluateRuleCondition(rule, metrics)) {
        rule.lastTriggered = new Date().toISOString();
        this.alertRules.set(ruleId, rule);

        const alert = await this.createAlert({
          type: rule.type,
          severity: rule.severity,
          message: `${rule.name} triggered`,
          details: {
            ruleId: rule.id,
            ruleName: rule.name,
            metrics
          },
          tags: rule.tags
        });

        triggeredAlerts.push(alert);
      }
    }

    return triggeredAlerts;
  }

  isInCooldown(rule) {
    if (!rule.lastTriggered) return false;

    const cooldownMs = this.parseTimeRange(rule.cooldown);
    const timeSinceLastTrigger = Date.now() - new Date(rule.lastTriggered).getTime();

    return timeSinceLastTrigger < cooldownMs;
  }

  evaluateRuleCondition(rule, metrics) {
    switch (rule.condition) {
      case 'threshold':
        const value = metrics[rule.metric];
        return value !== undefined && value >= rule.threshold;

      case 'status_change':
        return metrics.status === rule.status;

      case 'error_rate':
        return metrics.errorRate !== undefined && metrics.errorRate >= rule.threshold;

      default:
        return false;
    }
  }

  parseTimeRange(timeRange) {
    const match = timeRange.match(/^(\d+)(m|h|d)$/);
    if (!match) return 10 * 60 * 1000;

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      default: return 10 * 60 * 1000;
    }
  }

  getAlerts(filters = {}) {
    let alerts = Array.from(this.alerts.values());

    if (filters.status && filters.status !== 'all') {
      alerts = alerts.filter(a => a.status === filters.status);
    }

    if (filters.severity && filters.severity !== 'all') {
      alerts = alerts.filter(a => a.severity === filters.severity);
    }

    if (filters.type && filters.type !== 'all') {
      alerts = alerts.filter(a => a.type === filters.type);
    }

    alerts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return alerts;
  }

  getActiveAlerts() {
    return this.getAlerts({ status: 'active' });
  }

  getAlertStats() {
    const alerts = Array.from(this.alerts.values());

    return {
      total: alerts.length,
      active: alerts.filter(a => a.status === 'active').length,
      acknowledged: alerts.filter(a => a.status === 'acknowledged').length,
      resolved: alerts.filter(a => a.status === 'resolved').length,
      bySeverity: {
        critical: alerts.filter(a => a.severity === 'critical').length,
        high: alerts.filter(a => a.severity === 'high').length,
        medium: alerts.filter(a => a.severity === 'medium').length,
        low: alerts.filter(a => a.severity === 'low').length
      },
      byType: this.groupBy(alerts, 'type')
    };
  }

  groupBy(array, key) {
    return array.reduce((result, item) => {
      const group = item[key];
      result[group] = (result[group] || 0) + 1;
      return result;
    }, {});
  }

  addToHistory(alert) {
    this.alertHistory.unshift({
      id: alert.id,
      type: alert.type,
      severity: alert.severity,
      status: alert.status,
      timestamp: alert.status === 'resolved' ? alert.resolvedAt : alert.createdAt
    });

    if (this.alertHistory.length > this.maxHistorySize) {
      this.alertHistory.pop();
    }
  }

  getAlertHistory(limit = 100) {
    return this.alertHistory.slice(0, limit);
  }

  getNotificationChannels() {
    return Array.from(this.notificationChannels.values());
  }

  clearOldAlerts(maxAgeDays = 30) {
    const cutoff = new Date(Date.now() - (maxAgeDays * 24 * 60 * 60 * 1000));
    let clearedCount = 0;

    for (const [id, alert] of this.alerts) {
      if (alert.resolved && new Date(alert.resolvedAt) < cutoff) {
        this.alerts.delete(id);
        clearedCount++;
      }
    }

    logInfo('Old alerts cleared', { clearedCount, maxAgeDays });

    return clearedCount;
  }
}

const opsAlertService = new OpsAlertService();
opsAlertService.initialize();

module.exports = {
  OpsAlertService,
  opsAlertService
};
