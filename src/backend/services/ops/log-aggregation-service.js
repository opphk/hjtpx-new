const { logError, logWarn, logInfo } = require('../../utils/productionLogger');

class LogAggregationService {
  constructor() {
    this.logs = [];
    this.maxLogsInMemory = 10000;
    this.logSources = ['frontend', 'backend', 'database', 'api', 'system', 'security'];
    this.logLevels = ['error', 'warn', 'info', 'debug', 'trace'];
    this.alertRules = new Map();
    this.initialized = false;
  }

  initialize() {
    if (this.initialized) return;
    
    logInfo('Initializing log aggregation service');
    this.initialized = true;
  }

  async ingestLog(logEntry) {
    const normalizedLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: logEntry.timestamp || new Date().toISOString(),
      level: logEntry.level || 'info',
      message: logEntry.message,
      source: logEntry.source || 'system',
      metadata: logEntry.metadata || {},
      stack: logEntry.stack || null,
      userId: logEntry.userId || null,
      requestId: logEntry.requestId || null,
      ip: logEntry.ip || null,
      userAgent: logEntry.userAgent || null,
      tags: logEntry.tags || []
    };

    this.logs.unshift(normalizedLog);

    if (this.logs.length > this.maxLogsInMemory) {
      this.logs.pop();
    }

    await this.checkAlertRules(normalizedLog);

    logInfo('Log ingested', { 
      id: normalizedLog.id, 
      level: normalizedLog.level, 
      source: normalizedLog.source 
    });

    return normalizedLog;
  }

  async queryLogs(params) {
    const {
      level,
      source,
      search,
      startDate,
      endDate,
      tags,
      page = 1,
      limit = 50
    } = params;

    let filteredLogs = [...this.logs];

    if (level && level !== 'all') {
      filteredLogs = filteredLogs.filter(log => log.level === level);
    }

    if (source && source !== 'all') {
      filteredLogs = filteredLogs.filter(log => log.source === source);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      filteredLogs = filteredLogs.filter(log => 
        log.message.toLowerCase().includes(searchLower) ||
        (log.stack && log.stack.toLowerCase().includes(searchLower))
      );
    }

    if (startDate) {
      const start = new Date(startDate);
      filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) >= start);
    }

    if (endDate) {
      const end = new Date(endDate);
      filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) <= end);
    }

    if (tags && tags.length > 0) {
      filteredLogs = filteredLogs.filter(log => 
        tags.some(tag => log.tags.includes(tag))
      );
    }

    filteredLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    const total = filteredLogs.length;
    const startIndex = (page - 1) * limit;
    const paginatedLogs = filteredLogs.slice(startIndex, startIndex + limit);

    return {
      logs: paginatedLogs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  async getLogStats(timeRange = '24h') {
    const now = Date.now();
    const rangeMs = this.parseTimeRange(timeRange);
    const cutoff = new Date(now - rangeMs);

    const recentLogs = this.logs.filter(log => new Date(log.timestamp) >= cutoff);

    const stats = {
      total: recentLogs.length,
      byLevel: {},
      bySource: {},
      errorRate: 0,
      warningRate: 0,
      topErrors: [],
      timeSeries: []
    };

    this.logLevels.forEach(level => {
      stats.byLevel[level] = 0;
    });

    const errorCounts = new Map();

    recentLogs.forEach(log => {
      stats.byLevel[log.level] = (stats.byLevel[log.level] || 0) + 1;
      stats.bySource[log.source] = (stats.bySource[log.source] || 0) + 1;

      if (log.level === 'error') {
        const current = errorCounts.get(log.message) || { count: 0, lastSeen: null };
        errorCounts.set(log.message, {
          count: current.count + 1,
          lastSeen: log.timestamp
        });
      }
    });

    stats.errorRate = recentLogs.length > 0 
      ? (stats.byLevel.error / recentLogs.length * 100).toFixed(2) 
      : 0;
    stats.warningRate = recentLogs.length > 0 
      ? (stats.byLevel.warn / recentLogs.length * 100).toFixed(2) 
      : 0;

    stats.topErrors = Array.from(errorCounts.entries())
      .map(([message, data]) => ({ message, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const bucketSize = Math.floor(rangeMs / 100);
    const buckets = new Map();
    
    for (let i = 0; i < 100; i++) {
      const bucketStart = cutoff.getTime() + (i * bucketSize);
      buckets.set(bucketStart, { count: 0, errors: 0, warnings: 0 });
    }

    recentLogs.forEach(log => {
      const logTime = new Date(log.timestamp).getTime();
      const bucketKey = Math.floor((logTime - cutoff.getTime()) / bucketSize) * bucketSize + cutoff.getTime();
      const bucket = buckets.get(bucketKey);
      if (bucket) {
        bucket.count++;
        if (log.level === 'error') bucket.errors++;
        if (log.level === 'warn') bucket.warnings++;
      }
    });

    stats.timeSeries = Array.from(buckets.entries())
      .map(([timestamp, data]) => ({
        timestamp: new Date(timestamp).toISOString(),
        ...data
      }))
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    return stats;
  }

  parseTimeRange(timeRange) {
    const match = timeRange.match(/^(\d+)(h|d|m)$/);
    if (!match) return 24 * 60 * 60 * 1000;

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      case 'm': return value * 30 * 24 * 60 * 60 * 1000;
      default: return 24 * 60 * 60 * 1000;
    }
  }

  registerAlertRule(rule) {
    const ruleId = `rule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const alertRule = {
      id: ruleId,
      name: rule.name,
      condition: rule.condition,
      threshold: rule.threshold || 1,
      timeWindow: rule.timeWindow || '5m',
      severity: rule.severity || 'medium',
      enabled: rule.enabled !== false,
      cooldown: rule.cooldown || '10m',
      lastTriggered: null,
      createdAt: new Date().toISOString()
    };

    this.alertRules.set(ruleId, alertRule);
    logInfo('Alert rule registered', { ruleId, name: rule.name });

    return alertRule;
  }

  async checkAlertRules(log) {
    for (const [ruleId, rule] of this.alertRules) {
      if (!rule.enabled) continue;

      if (this.shouldSkipDueToCooldown(rule)) continue;

      if (this.evaluateCondition(rule, log)) {
        await this.triggerAlert(rule, log);
      }
    }
  }

  shouldSkipDueToCooldown(rule) {
    if (!rule.lastTriggered) return false;

    const cooldownMs = this.parseTimeRange(rule.cooldown);
    const timeSinceLastTrigger = Date.now() - new Date(rule.lastTriggered).getTime();

    return timeSinceLastTrigger < cooldownMs;
  }

  evaluateCondition(rule, log) {
    switch (rule.condition) {
      case 'error_count':
        const recentErrors = this.logs.filter(l => {
          const logTime = new Date(l.timestamp).getTime();
          const windowMs = this.parseTimeRange(rule.timeWindow);
          return l.level === 'error' && (Date.now() - logTime) < windowMs;
        });
        return recentErrors.length >= rule.threshold;

      case 'error_message_match':
        return log.level === 'error' && rule.pattern && 
          new RegExp(rule.pattern).test(log.message);

      case 'source_error_rate':
        const windowLogs = this.logs.filter(l => {
          const logTime = new Date(l.timestamp).getTime();
          const windowMs = this.parseTimeRange(rule.timeWindow);
          return (Date.now() - logTime) < windowMs;
        });
        const sourceErrors = windowLogs.filter(l => 
          l.source === rule.source && l.level === 'error'
        );
        return windowLogs.length > 0 && (sourceErrors.length / windowLogs.length) > rule.threshold;

      case 'keyword_match':
        return rule.keywords && rule.keywords.some(keyword => 
          log.message.toLowerCase().includes(keyword.toLowerCase())
        );

      default:
        return false;
    }
  }

  async triggerAlert(rule, log) {
    rule.lastTriggered = new Date().toISOString();
    this.alertRules.set(rule.id, rule);

    logWarn('Log alert triggered', {
      ruleId: rule.id,
      ruleName: rule.name,
      severity: rule.severity,
      logId: log.id,
      message: log.message
    });

    return {
      id: `alert-${Date.now()}`,
      ruleId: rule.id,
      ruleName: rule.name,
      severity: rule.severity,
      log: log,
      timestamp: new Date().toISOString()
    };
  }

  getAlertRules() {
    return Array.from(this.alertRules.values());
  }

  updateAlertRule(ruleId, updates) {
    const rule = this.alertRules.get(ruleId);
    if (!rule) return null;

    Object.assign(rule, updates);
    this.alertRules.set(ruleId, rule);

    return rule;
  }

  deleteAlertRule(ruleId) {
    return this.alertRules.delete(ruleId);
  }

  clearOldLogs(maxAgeDays = 7) {
    const cutoff = new Date(Date.now() - (maxAgeDays * 24 * 60 * 60 * 1000));
    const initialCount = this.logs.length;

    this.logs = this.logs.filter(log => new Date(log.timestamp) >= cutoff);

    const removedCount = initialCount - this.logs.length;
    logInfo('Old logs cleared', { removedCount, maxAgeDays });

    return removedCount;
  }

  exportLogs(params) {
    const { logs } = this.queryLogs(params);
    return logs.map(log => ({
      timestamp: log.timestamp,
      level: log.level,
      source: log.source,
      message: log.message,
      ...(log.stack && { stack: log.stack }),
      ...(log.metadata && { metadata: log.metadata })
    }));
  }

  getSources() {
    return this.logSources;
  }

  getLevels() {
    return this.logLevels;
  }
}

const logAggregationService = new LogAggregationService();
logAggregationService.initialize();

module.exports = {
  LogAggregationService,
  logAggregationService
};
