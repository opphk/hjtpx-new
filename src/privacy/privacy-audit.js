/**
 * 隐私审计模块
 * 实现隐私操作审计、合规检查和报告生成
 * 支持GDPR、CCPA、PIPL等隐私法规合规验证
 */

const crypto = require('crypto');
const { EventEmitter } = require('events');

class PrivacyRegulationChecker {
  constructor() {
    this.regulations = {
      GDPR: {
        name: '通用数据保护条例 (欧盟)',
        principles: [
          'lawfulness_fairness_transparency',
          'purpose_limitation',
          'data_minimization',
          'accuracy',
          'storage_limitation',
          'integrity_confidentiality',
          'accountability'
        ],
        requirements: {
          consent_required: true,
          data_portability: true,
          right_to_erasure: true,
          breach_notification_days: 72,
          dpia_required_threshold: 3
        }
      },
      CCPA: {
        name: '加州消费者隐私法案 (美国)',
        principles: [
          'right_to_know',
          'right_to_delete',
          'right_to_opt_out',
          'right_to_non_discrimination',
          'data_minimization'
        ],
        requirements: {
          opt_out_mechanism: true,
          privacy_policy_required: true,
          service_provider_contracts: true
        }
      },
      PIPL: {
        name: '个人信息保护法 (中国)',
        principles: [
          'lawful_processing',
          'purpose_limitation',
          'data_minimization',
          'storage_limitation',
          'accuracy',
          'security'
        ],
        requirements: {
          separate_consent_for_sensitive: true,
          data_localization: true,
          cross_border_transfer_approval: true,
          impact_assessment_required: true
        }
      }
    };
  }

  /**
   * 检查是否符合特定法规
   */
  checkCompliance(operation, regulation = 'GDPR') {
    const reg = this.regulations[regulation];
    if (!reg) {
      throw new Error(`不支持的法规: ${regulation}`);
    }

    const violations = [];
    const warnings = [];
    const passed = [];

    const complianceChecks = this.getComplianceChecks(operation);

    for (const check of complianceChecks) {
      const result = this.performCheck(check, operation);

      if (result.status === 'fail') {
        violations.push({
          check: check.name,
          requirement: check.requirement,
          details: result.details,
          severity: check.severity || 'high'
        });
      } else if (result.status === 'warning') {
        warnings.push({
          check: check.name,
          details: result.details
        });
      } else {
        passed.push({
          check: check.name
        });
      }
    }

    return {
      regulation,
      regulationName: reg.name,
      compliant: violations.length === 0,
      violations,
      warnings,
      passed,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 获取合规检查项
   */
  getComplianceChecks(operation) {
    const checks = [
      {
        name: '数据收集目的明确性',
        requirement: 'purpose_limitation',
        check: (op) => op.purpose !== undefined && op.purpose.length > 0,
        severity: 'high'
      },
      {
        name: '数据最小化验证',
        requirement: 'data_minimization',
        check: (op) => {
          if (op.dataCategories) {
            return op.dataCategories.length <= 10;
          }
          return true;
        },
        severity: 'medium'
      },
      {
        name: '同意记录验证',
        requirement: 'consent_required',
        check: (op) => {
          if (op.requiresConsent) {
            return op.consentTimestamp !== undefined;
          }
          return true;
        },
        severity: 'high'
      },
      {
        name: '存储期限验证',
        requirement: 'storage_limitation',
        check: (op) => {
          if (op.dataRetention) {
            return op.dataRetention.maxDays !== undefined;
          }
          return true;
        },
        severity: 'medium'
      },
      {
        name: '加密保护验证',
        requirement: 'integrity_confidentiality',
        check: (op) => op.encrypted === true || op.encryptionAlgorithm !== undefined,
        severity: 'high'
      },
      {
        name: '访问控制验证',
        requirement: 'integrity_confidentiality',
        check: (op) => op.accessControl !== undefined || op.authorizedRoles !== undefined,
        severity: 'medium'
      }
    ];

    return checks;
  }

  /**
   * 执行单个检查
   */
  performCheck(check, operation) {
    try {
      const result = check.check(operation);

      if (result === true) {
        return { status: 'pass', details: '检查通过' };
      } else if (result === false) {
        return {
          status: 'fail',
          details: `未满足要求: ${check.requirement}`
        };
      } else {
        return { status: 'warning', details: '需要进一步评估' };
      }
    } catch (error) {
      return { status: 'error', details: error.message };
    }
  }

  /**
   * 生成合规报告
   */
  generateComplianceReport(operations, regulation = 'GDPR') {
    const results = operations.map(op => this.checkCompliance(op, regulation));

    const totalViolations = results.reduce((sum, r) => sum + r.violations.length, 0);
    const totalWarnings = results.reduce((sum, r) => sum + r.warnings.length, 0);
    const compliant = results.filter(r => r.compliant).length;

    return {
      regulation,
      regulationName: this.regulations[regulation].name,
      summary: {
        totalOperations: operations.length,
        compliantOperations: compliant,
        complianceRate: (compliant / operations.length * 100).toFixed(2) + '%',
        totalViolations,
        totalWarnings
      },
      results,
      recommendations: this.generateRecommendations(results, regulation),
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * 生成合规建议
   */
  generateRecommendations(results, regulation) {
    const recommendations = [];

    const violationCounts = {};
    results.forEach(r => {
      r.violations.forEach(v => {
        violationCounts[v.requirement] = (violationCounts[v.requirement] || 0) + 1;
      });
    });

    for (const [requirement, count] of Object.entries(violationCounts)) {
      if (count > 5) {
        recommendations.push({
          priority: 'high',
          requirement,
          description: `${requirement} 相关违规较多 (${count}次)，建议加强控制`,
          regulation
        });
      }
    }

    if (results.length > 100) {
      recommendations.push({
        priority: 'medium',
        description: '建议实施定期隐私审计机制',
        regulation
      });
    }

    return recommendations;
  }
}

class PrivacyMetricsCollector {
  constructor(config = {}) {
    this.metrics = {
      dataAccess: [],
      privacyOperations: [],
      complianceChecks: [],
      privacyBudgetUsage: [],
      dataMinimization: []
    };
    this.config = {
      maxMetricsHistory: config.maxMetricsHistory || 10000,
      aggregationInterval: config.aggregationInterval || 3600000,
      ...config
    };
    this.startTime = Date.now();
  }

  /**
   * 记录数据访问
   */
  recordDataAccess(access) {
    const record = {
      timestamp: Date.now(),
      dataType: access.dataType,
      userId: access.userId,
      operation: access.operation,
      result: access.result,
      metadata: access.metadata || {}
    };

    this.metrics.dataAccess.push(record);

    if (this.metrics.dataAccess.length > this.config.maxMetricsHistory) {
      this.metrics.dataAccess.shift();
    }

    return record;
  }

  /**
   * 记录隐私操作
   */
  recordPrivacyOperation(operation) {
    const record = {
      timestamp: Date.now(),
      operationType: operation.type,
      epsilon: operation.epsilon,
      delta: operation.delta,
      participants: operation.participants,
      result: operation.result,
      details: operation.details || {}
    };

    this.metrics.privacyOperations.push(record);

    if (this.metrics.privacyOperations.length > this.config.maxMetricsHistory) {
      this.metrics.privacyOperations.shift();
    }

    return record;
  }

  /**
   * 记录隐私预算使用
   */
  recordBudgetUsage(usage) {
    const record = {
      timestamp: Date.now(),
      budgetType: usage.type,
      spent: usage.spent,
      remaining: usage.remaining,
      total: usage.total
    };

    this.metrics.privacyBudgetUsage.push(record);

    if (this.metrics.privacyBudgetUsage.length > this.config.maxMetricsHistory) {
      this.metrics.privacyBudgetUsage.shift();
    }

    return record;
  }

  /**
   * 记录合规检查结果
   */
  recordComplianceCheck(check) {
    const record = {
      timestamp: Date.now(),
      operation: check.operation,
      regulation: check.regulation,
      result: check.result,
      violations: check.violations || []
    };

    this.metrics.complianceChecks.push(record);

    if (this.metrics.complianceChecks.length > this.config.maxMetricsHistory) {
      this.metrics.complianceChecks.shift();
    }

    return record;
  }

  /**
   * 获取数据访问统计
   */
  getDataAccessStats(timeRange = null) {
    const records = this.filterByTimeRange(this.metrics.dataAccess, timeRange);

    const byOperation = {};
    const byDataType = {};
    const byUser = {};

    records.forEach(r => {
      byOperation[r.operation] = (byOperation[r.operation] || 0) + 1;
      byDataType[r.dataType] = (byDataType[r.dataType] || 0) + 1;
      byUser[r.userId] = (byUser[r.userId] || 0) + 1;
    });

    return {
      total: records.length,
      byOperation,
      byDataType,
      byUser,
      timeRange
    };
  }

  /**
   * 获取隐私操作统计
   */
  getPrivacyOperationStats(timeRange = null) {
    const records = this.filterByTimeRange(this.metrics.privacyOperations, timeRange);

    const byType = {};
    const totalEpsilon = { sum: 0, count: 0 };

    records.forEach(r => {
      byType[r.operationType] = (byType[r.operationType] || 0) + 1;
      if (r.epsilon) {
        totalEpsilon.sum += r.epsilon;
        totalEpsilon.count++;
      }
    });

    return {
      total: records.length,
      byType,
      averageEpsilon: totalEpsilon.count > 0 ? totalEpsilon.sum / totalEpsilon.count : 0,
      timeRange
    };
  }

  /**
   * 获取隐私预算统计
   */
  getBudgetStats() {
    if (this.metrics.privacyBudgetUsage.length === 0) {
      return { current: null, history: [] };
    }

    const latest = this.metrics.privacyBudgetUsage[this.metrics.privacyBudgetUsage.length - 1];
    const history = this.metrics.privacyBudgetUsage.slice(-100);

    return {
      current: latest,
      history,
      utilizationRate: (latest.spent / latest.total * 100).toFixed(2) + '%'
    };
  }

  /**
   * 获取合规检查统计
   */
  getComplianceStats(timeRange = null) {
    const records = this.filterByTimeRange(this.metrics.complianceChecks, timeRange);

    const compliant = records.filter(r => r.result).length;
    const violations = records.reduce((sum, r) => sum + (r.violations?.length || 0), 0);

    return {
      total: records.length,
      compliant,
      nonCompliant: records.length - compliant,
      complianceRate: records.length > 0 ? (compliant / records.length * 100).toFixed(2) + '%' : 'N/A',
      totalViolations: violations,
      timeRange
    };
  }

  /**
   * 过滤时间范围内的记录
   */
  filterByTimeRange(records, timeRange) {
    if (!timeRange) {
      return records;
    }

    const now = Date.now();
    const startTime = timeRange === 'day' ? now - 86400000 :
                      timeRange === 'week' ? now - 604800000 :
                      timeRange === 'month' ? now - 2592000000 :
                      now - 3600000;

    return records.filter(r => r.timestamp >= startTime);
  }

  /**
   * 清除旧记录
   */
  clearOldRecords(olderThan = 2592000000) {
    const cutoff = Date.now() - olderThan;

    this.metrics.dataAccess = this.metrics.dataAccess.filter(r => r.timestamp >= cutoff);
    this.metrics.privacyOperations = this.metrics.privacyOperations.filter(r => r.timestamp >= cutoff);
    this.metrics.complianceChecks = this.metrics.complianceChecks.filter(r => r.timestamp >= cutoff);
    this.metrics.privacyBudgetUsage = this.metrics.privacyBudgetUsage.filter(r => r.timestamp >= cutoff);

    return {
      cleared: true,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 获取所有指标
   */
  getAllMetrics() {
    return {
      uptime: Date.now() - this.startTime,
      ...this.metrics,
      counts: {
        dataAccess: this.metrics.dataAccess.length,
        privacyOperations: this.metrics.privacyOperations.length,
        complianceChecks: this.metrics.complianceChecks.length,
        budgetUsage: this.metrics.privacyBudgetUsage.length
      }
    };
  }
}

class PrivacyAuditService extends EventEmitter {
  constructor(config = {}) {
    super();

    this.config = {
      retentionDays: config.retentionDays || 365,
      enableRealTimeAlert: config.enableRealTimeAlert !== false,
      alertThresholds: {
        privacyBudgetUsage: config.alertThresholds?.privacyBudgetUsage || 0.8,
        violationCount: config.alertThresholds?.violationCount || 5,
        dataAccessAnomaly: config.alertThresholds?.dataAccessAnomaly || 100
      },
      ...config
    };

    this.regulationChecker = new PrivacyRegulationChecker();
    this.metricsCollector = new PrivacyMetricsCollector({
      maxMetricsHistory: config.maxMetricsHistory || 10000
    });

    this.auditLog = [];
    this.maxLogSize = config.maxLogSize || 100000;
    this.alerts = [];
    this.maxAlerts = config.maxAlerts || 1000;
  }

  /**
   * 记录审计日志
   */
  logOperation(operation) {
    const logEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      ...operation,
      sessionId: operation.sessionId || crypto.randomUUID()
    };

    this.auditLog.push(logEntry);

    if (this.auditLog.length > this.maxLogSize) {
      this.auditLog.shift();
    }

    this.metricsCollector.recordDataAccess({
      dataType: operation.dataType || 'unknown',
      userId: operation.userId,
      operation: operation.action,
      result: operation.result
    });

    if (operation.privacyOperation) {
      this.metricsCollector.recordPrivacyOperation({
        type: operation.privacyOperation,
        epsilon: operation.epsilon,
        delta: operation.delta,
        result: operation.result
      });
    }

    this.emit('audit:log', logEntry);

    return logEntry;
  }

  /**
   * 获取审计日志
   */
  getAuditLog(options = {}) {
    let logs = [...this.auditLog];

    if (options.userId) {
      logs = logs.filter(log => log.userId === options.userId);
    }

    if (options.action) {
      logs = logs.filter(log => log.action === options.action);
    }

    if (options.startDate) {
      logs = logs.filter(log => new Date(log.timestamp) >= new Date(options.startDate));
    }

    if (options.endDate) {
      logs = logs.filter(log => new Date(log.timestamp) <= new Date(options.endDate));
    }

    if (options.dataType) {
      logs = logs.filter(log => log.dataType === options.dataType);
    }

    if (options.limit) {
      logs = logs.slice(-options.limit);
    }

    return logs;
  }

  /**
   * 导出审计日志
   */
  exportAuditLog(format = 'json', options = {}) {
    const logs = this.getAuditLog(options);

    switch (format) {
      case 'json':
        return JSON.stringify(logs, null, 2);

      case 'csv':
        if (logs.length === 0) return '';

        const headers = Object.keys(logs[0]);
        const csvLines = [headers.join(',')];

        logs.forEach(log => {
          const row = headers.map(h => {
            const value = log[h];
            if (value === undefined || value === null) return '';
            if (typeof value === 'object') return JSON.stringify(value).replace(/"/g, '""');
            return String(value).replace(/"/g, '""');
          });
          csvLines.push(row.join(','));
        });

        return csvLines.join('\n');

      case 'text':
        return logs.map(log =>
          `[${log.timestamp}] ${log.userId || 'anonymous'} - ${log.action}: ${JSON.stringify(log.details || log)}`
        ).join('\n');

      default:
        throw new Error(`不支持的格式: ${format}`);
    }
  }

  /**
   * 合规检查
   */
  checkCompliance(operation, regulation = 'GDPR') {
    const result = this.regulationChecker.checkCompliance(operation, regulation);

    this.metricsCollector.recordComplianceCheck({
      operation: operation.type,
      regulation,
      result: result.compliant,
      violations: result.violations
    });

    if (!result.compliant) {
      this.generateAlert({
        type: 'compliance_violation',
        severity: 'high',
        regulation,
        violations: result.violations,
        operation
      });
    }

    result.violations.forEach(v => {
      if (v.severity === 'high') {
        this.generateAlert({
          type: 'privacy_risk',
          severity: 'critical',
          message: `高风险合规问题: ${v.check}`,
          details: v
        });
      }
    });

    return result;
  }

  /**
   * 验证隐私预算
   */
  validatePrivacyBudget(budgetInfo) {
    const utilization = budgetInfo.spent / budgetInfo.total;

    if (utilization >= this.config.alertThresholds.privacyBudgetUsage) {
      this.generateAlert({
        type: 'privacy_budget_warning',
        severity: 'warning',
        utilization: (utilization * 100).toFixed(2) + '%',
        remaining: budgetInfo.remaining
      });
    }

    this.metricsCollector.recordBudgetUsage({
      type: budgetInfo.type || 'default',
      spent: budgetInfo.spent,
      remaining: budgetInfo.remaining,
      total: budgetInfo.total
    });

    return {
      valid: utilization < 1,
      utilization: (utilization * 100).toFixed(2) + '%',
      warnings: utilization >= this.config.alertThresholds.privacyBudgetUsage
    };
  }

  /**
   * 检查数据最小化
   */
  checkDataMinimization(operation) {
    const checks = [];

    if (operation.dataCategories && operation.dataCategories.length > 10) {
      checks.push({
        passed: false,
        message: '收集的数据类别过多，建议精简'
      });
    } else {
      checks.push({
        passed: true,
        message: '数据类别符合最小化原则'
      });
    }

    if (operation.dataRetention && operation.dataRetention.maxDays > 365) {
      checks.push({
        passed: false,
        message: '数据保留期限过长，建议缩短'
      });
    } else {
      checks.push({
        passed: true,
        message: '数据保留期限符合要求'
      });
    }

    if (operation.purpose) {
      checks.push({
        passed: true,
        message: '数据处理目的明确'
      });
    }

    const allPassed = checks.every(c => c.passed);

    if (!allPassed) {
      this.generateAlert({
        type: 'data_minimization_warning',
        severity: 'medium',
        checks
      });
    }

    return {
      passed: allPassed,
      checks,
      score: (checks.filter(c => c.passed).length / checks.length * 100).toFixed(0) + '%'
    };
  }

  /**
   * 生成告警
   */
  generateAlert(alert) {
    const alertEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      acknowledged: false,
      ...alert
    };

    this.alerts.push(alertEntry);

    if (this.alerts.length > this.maxAlerts) {
      this.alerts.shift();
    }

    if (this.config.enableRealTimeAlert) {
      this.emit('alert', alertEntry);
    }

    return alertEntry;
  }

  /**
   * 获取未确认的告警
   */
  getUnacknowledgedAlerts() {
    return this.alerts.filter(a => !a.acknowledged);
  }

  /**
   * 确认告警
   */
  acknowledgeAlert(alertId) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledgedAt = new Date().toISOString();
      return true;
    }
    return false;
  }

  /**
   * 生成完整报告
   */
  generateReport(options = {}) {
    const regulation = options.regulation || 'GDPR';
    const timeRange = options.timeRange || 'month';

    const auditLogs = this.getAuditLog({ ...options, limit: 1000 });
    const complianceReport = this.regulationChecker.generateComplianceReport(
      auditLogs.filter(log => log.operation),
      regulation
    );

    const dataAccessStats = this.metricsCollector.getDataAccessStats(timeRange);
    const privacyStats = this.metricsCollector.getPrivacyOperationStats(timeRange);
    const budgetStats = this.metricsCollector.getBudgetStats();
    const complianceStats = this.metricsCollector.getComplianceStats(timeRange);

    const alerts = this.alerts.slice(-100);

    return {
      reportId: crypto.randomUUID(),
      generatedAt: new Date().toISOString(),
      period: {
        start: new Date(Date.now() - (timeRange === 'day' ? 86400000 : timeRange === 'week' ? 604800000 : 2592000000)).toISOString(),
        end: new Date().toISOString(),
        range: timeRange
      },
      regulation: {
        name: regulation,
        complianceRate: complianceReport.summary.complianceRate,
        violations: complianceReport.summary.totalViolations,
        warnings: complianceReport.summary.totalWarnings
      },
      statistics: {
        totalAuditLogs: auditLogs.length,
        dataAccess: dataAccessStats,
        privacyOperations: privacyStats,
        budget: budgetStats,
        compliance: complianceStats
      },
      alerts: {
        total: alerts.length,
        unacknowledged: alerts.filter(a => !a.acknowledged).length,
        recent: alerts.slice(-10)
      },
      recommendations: complianceReport.recommendations,
      metrics: this.metricsCollector.getAllMetrics()
    };
  }

  /**
   * 获取隐私指标
   */
  getPrivacyMetrics() {
    return {
      auditLogsCount: this.auditLog.length,
      alertsCount: this.alerts.length,
      unacknowledgedAlerts: this.getUnacknowledgedAlerts().length,
      budgetStats: this.metricsCollector.getBudgetStats(),
      complianceStats: this.metricsCollector.getComplianceStats(),
      systemMetrics: this.metricsCollector.getAllMetrics()
    };
  }

  /**
   * 获取服务状态
   */
  getStatus() {
    return {
      enabled: true,
      retentionDays: this.config.retentionDays,
      auditLogsCount: this.auditLog.length,
      alertsCount: this.alerts.length,
      unacknowledgedAlerts: this.getUnacknowledgedAlerts().length,
      supportedRegulations: Object.keys(this.regulationChecker.regulations),
      capabilities: [
        'audit_logging',
        'compliance_checking',
        'privacy_metrics',
        'alert_management',
        'report_generation',
        'data_minimization_validation'
      ]
    };
  }

  /**
   * 清理过期数据
   */
  cleanup() {
    const cutoff = Date.now() - (this.config.retentionDays * 24 * 60 * 60 * 1000);

    const originalLength = this.auditLog.length;
    this.auditLog = this.auditLog.filter(log => new Date(log.timestamp) >= cutoff);

    const alertCutoff = Date.now() - (30 * 24 * 60 * 60 * 1000);
    this.alerts = this.alerts.filter(alert =>
      new Date(alert.timestamp) >= alertCutoff || !alert.acknowledged
    );

    return {
      cleaned: true,
      auditLogsRemoved: originalLength - this.auditLog.length,
      alertsRemoved: this.alerts.length,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = {
  PrivacyAuditService,
  PrivacyRegulationChecker,
  PrivacyMetricsCollector
};

// 使用示例
if (require.main === module) {
  console.log('=== 隐私审计模块示例 ===\n');

  const auditService = new PrivacyAuditService({
    retentionDays: 365,
    enableRealTimeAlert: true,
    alertThresholds: {
      privacyBudgetUsage: 0.8,
      violationCount: 5
    }
  });

  console.log('1. 记录审计日志...');
  const log1 = auditService.logOperation({
    userId: 'user_001',
    action: 'data_access',
    dataType: 'user_profile',
    result: 'success',
    details: { fields: ['name', 'email'] }
  });
  console.log(`   日志ID: ${log1.id}`);
  console.log(`   操作: ${log1.action}`);
  console.log(`   数据类型: ${log1.dataType}\n`);

  console.log('2. 记录隐私操作...');
  auditService.logOperation({
    userId: 'system',
    action: 'privacy_calculation',
    privacyOperation: 'differential_privacy',
    epsilon: 0.5,
    delta: 1e-5,
    result: 'success'
  });
  console.log('   隐私操作记录成功\n');

  console.log('3. 合规检查...');
  const complianceResult = auditService.checkCompliance({
    type: 'data_collection',
    purpose: 'user_authentication',
    dataCategories: ['email', 'password'],
    requiresConsent: true,
    consentTimestamp: Date.now(),
    dataRetention: { maxDays: 365 },
    encrypted: true,
    accessControl: ['admin', 'user']
  }, 'GDPR');
  console.log(`   法规: ${complianceResult.regulationName}`);
  console.log(`   符合要求: ${complianceResult.compliant ? '是' : '否'}`);
  console.log(`   违规项: ${complianceResult.violations.length}`);
  console.log(`   警告项: ${complianceResult.warnings.length}\n`);

  console.log('4. 隐私预算验证...');
  const budgetValidation = auditService.validatePrivacyBudget({
    type: 'differential_privacy',
    spent: 7,
    remaining: 3,
    total: 10
  });
  console.log(`   有效: ${budgetValidation.valid}`);
  console.log(`   使用率: ${budgetValidation.utilization}`);
  console.log(`   警告: ${budgetValidation.warnings ? '是' : '否'}\n`);

  console.log('5. 数据最小化检查...');
  const minimizationCheck = auditService.checkDataMinimization({
    dataCategories: ['email', 'password', 'name', 'phone', 'address', 'age', 'gender', 'occupation', 'income', 'education', 'marital_status'],
    dataRetention: { maxDays: 730 },
    purpose: 'marketing'
  });
  console.log(`   通过: ${minimizationCheck.passed}`);
  console.log(`   评分: ${minimizationCheck.score}`);
  minimizationCheck.checks.forEach(check => {
    console.log(`     ${check.passed ? '✓' : '✗'} ${check.message}`);
  });
  console.log('');

  console.log('6. 告警管理...');
  console.log(`   未确认告警数: ${auditService.getUnacknowledgedAlerts().length}`);

  const alerts = auditService.getUnacknowledgedAlerts();
  if (alerts.length > 0) {
    console.log('   最新告警:');
    alerts.slice(0, 3).forEach(alert => {
      console.log(`     [${alert.severity}] ${alert.type}: ${alert.message || JSON.stringify(alert.details)}`);
    });
  }
  console.log('');

  console.log('7. 生成报告...');
  const report = auditService.generateReport({
    regulation: 'GDPR',
    timeRange: 'month'
  });
  console.log(`   报告ID: ${report.reportId}`);
  console.log(`   生成时间: ${report.generatedAt}`);
  console.log(`   审计日志数: ${report.statistics.totalAuditLogs}`);
  console.log(`   合规率: ${report.regulation.complianceRate}`);
  console.log(`   违规数: ${report.regulation.violations}`);
  console.log(`   告警数: ${report.alerts.total}\n`);

  console.log('8. 导出审计日志...');
  const jsonExport = auditService.exportAuditLog('json', { limit: 10 });
  console.log(`   JSON格式长度: ${jsonExport.length} 字符`);

  const csvExport = auditService.exportAuditLog('csv', { limit: 10 });
  console.log(`   CSV格式长度: ${csvExport.length} 字符\n`);

  console.log('9. 获取隐私指标...');
  const metrics = auditService.getPrivacyMetrics();
  console.log(`   审计日志总数: ${metrics.auditLogsCount}`);
  console.log(`   告警总数: ${metrics.alertsCount}`);
  console.log(`   未确认告警: ${metrics.unacknowledgedAlerts}`);
  console.log(`   隐私预算使用率: ${metrics.budgetStats.utilizationRate || 'N/A'}\n`);

  console.log('10. 服务状态...');
  const status = auditService.getStatus();
  console.log(`    启用: ${status.enabled ? '是' : '否'}`);
  console.log(`    保留天数: ${status.retentionDays}`);
  console.log(`    支持法规: ${status.supportedRegulations.join(', ')}`);
  console.log(`    审计日志数: ${status.auditLogsCount}`);
  console.log(`    告警数: ${status.alertsCount}`);
  console.log(`    未确认告警: ${status.unacknowledgedAlerts}`);
  console.log(`    支持功能: ${status.capabilities.join(', ')}\n`);

  console.log('=== 隐私审计测试完成 ===');
}
