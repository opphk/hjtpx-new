const express = require('express');
const router = express.Router();
const { logInfo, logError } = require('../utils/productionLogger');
const { deploymentService } = require('./services/ops/deployment-service');
const { logAggregationService } = require('./services/ops/log-aggregation-service');
const { opsAlertService } = require('./services/ops/alert-service');
const { serverManagementService } = require('./services/ops/server-management-service');

router.get('/metrics', (req, res) => {
  try {
    const serverStats = serverManagementService.getServerStats();
    const alertStats = opsAlertService.getAlertStats();
    const deploymentStats = deploymentService.getDeploymentStats();

    res.json({
      totalServers: serverStats.total,
      activeAlerts: alertStats.active,
      pendingDeployments: deploymentStats.pending + deploymentStats.running,
      recentLogs: logAggregationService.logs.length
    });
  } catch (error) {
    logError(error, req, { context: 'GET /api/ops/metrics' });
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

router.get('/servers', (req, res) => {
  try {
    const { status, environment, type } = req.query;
    const servers = serverManagementService.getServers({ status, environment, type });
    res.json(servers);
  } catch (error) {
    logError(error, req, { context: 'GET /api/ops/servers' });
    res.status(500).json({ error: 'Failed to fetch servers' });
  }
});

router.get('/servers/:id', (req, res) => {
  try {
    const server = serverManagementService.getServer(req.params.id);
    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }
    res.json(server);
  } catch (error) {
    logError(error, req, { context: 'GET /api/ops/servers/:id' });
    res.status(500).json({ error: 'Failed to fetch server' });
  }
});

router.post('/servers/execute', async (req, res) => {
  try {
    const { serverId, command } = req.body;
    
    if (!serverId || !command) {
      return res.status(400).json({ error: 'Server ID and command are required' });
    }

    const result = await serverManagementService.executeCommand(serverId, command);
    res.json(result);
  } catch (error) {
    logError(error, req, { context: 'POST /api/ops/servers/execute' });
    res.status(500).json({ error: error.message || 'Failed to execute command' });
  }
});

router.post('/servers/:id/health-check', async (req, res) => {
  try {
    const result = await serverManagementService.performHealthCheck(req.params.id);
    res.json(result);
  } catch (error) {
    logError(error, req, { context: 'POST /api/ops/servers/:id/health-check' });
    res.status(500).json({ error: error.message || 'Failed to perform health check' });
  }
});

router.get('/logs', async (req, res) => {
  try {
    const { level, source, search, startDate, endDate, page, limit } = req.query;
    
    const result = await logAggregationService.queryLogs({
      level,
      source,
      search,
      startDate,
      endDate,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 50
    });
    
    res.json(result);
  } catch (error) {
    logError(error, req, { context: 'GET /api/ops/logs' });
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

router.post('/logs', async (req, res) => {
  try {
    const logEntry = await logAggregationService.ingestLog(req.body);
    res.status(201).json(logEntry);
  } catch (error) {
    logError(error, req, { context: 'POST /api/ops/logs' });
    res.status(500).json({ error: 'Failed to ingest log' });
  }
});

router.get('/logs/stats', async (req, res) => {
  try {
    const { timeRange } = req.query;
    const stats = await logAggregationService.getLogStats(timeRange || '24h');
    res.json(stats);
  } catch (error) {
    logError(error, req, { context: 'GET /api/ops/logs/stats' });
    res.status(500).json({ error: 'Failed to fetch log stats' });
  }
});

router.post('/logs/export', async (req, res) => {
  try {
    const logs = logAggregationService.exportLogs(req.body);
    res.json(logs);
  } catch (error) {
    logError(error, req, { context: 'POST /api/ops/logs/export' });
    res.status(500).json({ error: 'Failed to export logs' });
  }
});

router.get('/alerts', (req, res) => {
  try {
    const { status, severity, type } = req.query;
    const alerts = opsAlertService.getAlerts({ status, severity, type });
    res.json(alerts);
  } catch (error) {
    logError(error, req, { context: 'GET /api/ops/alerts' });
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

router.post('/alerts', async (req, res) => {
  try {
    const alert = await opsAlertService.createAlert(req.body);
    res.status(201).json(alert);
  } catch (error) {
    logError(error, req, { context: 'POST /api/ops/alerts' });
    res.status(500).json({ error: 'Failed to create alert' });
  }
});

router.post('/alerts/:id/acknowledge', async (req, res) => {
  try {
    const alert = await opsAlertService.acknowledgeAlert(req.params.id, req.user?.id);
    res.json(alert);
  } catch (error) {
    logError(error, req, { context: 'POST /api/ops/alerts/:id/acknowledge' });
    res.status(500).json({ error: error.message || 'Failed to acknowledge alert' });
  }
});

router.post('/alerts/:id/resolve', async (req, res) => {
  try {
    const alert = await opsAlertService.resolveAlert(req.params.id, req.user?.id);
    res.json(alert);
  } catch (error) {
    logError(error, req, { context: 'POST /api/ops/alerts/:id/resolve' });
    res.status(500).json({ error: error.message || 'Failed to resolve alert' });
  }
});

router.delete('/alerts/:id', async (req, res) => {
  try {
    await opsAlertService.deleteAlert(req.params.id);
    res.json({ success: true });
  } catch (error) {
    logError(error, req, { context: 'DELETE /api/ops/alerts/:id' });
    res.status(500).json({ error: error.message || 'Failed to delete alert' });
  }
});

router.get('/alerts/rules', (req, res) => {
  try {
    const rules = opsAlertService.getAlertRules();
    res.json(rules);
  } catch (error) {
    logError(error, req, { context: 'GET /api/ops/alerts/rules' });
    res.status(500).json({ error: 'Failed to fetch alert rules' });
  }
});

router.post('/alerts/rules', (req, res) => {
  try {
    const rule = opsAlertService.registerAlertRule(req.body);
    res.status(201).json(rule);
  } catch (error) {
    logError(error, req, { context: 'POST /api/ops/alerts/rules' });
    res.status(500).json({ error: 'Failed to create alert rule' });
  }
});

router.put('/alerts/rules/:id', (req, res) => {
  try {
    const rule = opsAlertService.updateAlertRule(req.params.id, req.body);
    if (!rule) {
      return res.status(404).json({ error: 'Alert rule not found' });
    }
    res.json(rule);
  } catch (error) {
    logError(error, req, { context: 'PUT /api/ops/alerts/rules/:id' });
    res.status(500).json({ error: 'Failed to update alert rule' });
  }
});

router.delete('/alerts/rules/:id', (req, res) => {
  try {
    const deleted = opsAlertService.deleteAlertRule(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Alert rule not found' });
    }
    res.json({ success: true });
  } catch (error) {
    logError(error, req, { context: 'DELETE /api/ops/alerts/rules/:id' });
    res.status(500).json({ error: 'Failed to delete alert rule' });
  }
});

router.get('/deployments', (req, res) => {
  try {
    const { status, environment } = req.query;
    const deployments = deploymentService.getDeployments({ status, environment });
    res.json(deployments);
  } catch (error) {
    logError(error, req, { context: 'GET /api/ops/deployments' });
    res.status(500).json({ error: 'Failed to fetch deployments' });
  }
});

router.get('/deployments/:id', (req, res) => {
  try {
    const deployment = deploymentService.getDeployment(req.params.id);
    if (!deployment) {
      return res.status(404).json({ error: 'Deployment not found' });
    }
    res.json(deployment);
  } catch (error) {
    logError(error, req, { context: 'GET /api/ops/deployments/:id' });
    res.status(500).json({ error: 'Failed to fetch deployment' });
  }
});

router.post('/deployments', async (req, res) => {
  try {
    const deployment = await deploymentService.createDeployment(req.body);
    await deploymentService.startDeployment(deployment.id);
    res.status(201).json(deployment);
  } catch (error) {
    logError(error, req, { context: 'POST /api/ops/deployments' });
    res.status(500).json({ error: 'Failed to create deployment' });
  }
});

router.post('/deployments/:id/cancel', async (req, res) => {
  try {
    const deployment = await deploymentService.cancelDeployment(req.params.id);
    res.json(deployment);
  } catch (error) {
    logError(error, req, { context: 'POST /api/ops/deployments/:id/cancel' });
    res.status(500).json({ error: error.message || 'Failed to cancel deployment' });
  }
});

router.post('/deployments/:id/rollback', async (req, res) => {
  try {
    const deployment = await deploymentService.rollbackDeployment(req.params.id);
    res.json(deployment);
  } catch (error) {
    logError(error, req, { context: 'POST /api/ops/deployments/:id/rollback' });
    res.status(500).json({ error: error.message || 'Failed to rollback deployment' });
  }
});

router.get('/deployments/stats', (req, res) => {
  try {
    const stats = deploymentService.getDeploymentStats();
    res.json(stats);
  } catch (error) {
    logError(error, req, { context: 'GET /api/ops/deployments/stats' });
    res.status(500).json({ error: 'Failed to fetch deployment stats' });
  }
});

module.exports = router;
