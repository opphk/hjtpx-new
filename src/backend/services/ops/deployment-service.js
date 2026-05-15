const { logError, logWarn, logInfo } = require('../../utils/productionLogger');

class DeploymentService {
  constructor() {
    this.deployments = new Map();
    this.activeProcesses = new Map();
    this.deploymentHistory = [];
    this.maxHistorySize = 100;
  }

  async createDeployment(config) {
    const deploymentId = `deploy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const deployment = {
      id: deploymentId,
      version: config.version,
      environment: config.environment,
      branch: config.branch,
      servers: config.servers || [],
      strategy: config.strategy || 'rolling',
      status: 'pending',
      progress: 0,
      createdAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null,
      logs: [],
      error: null,
      rollbackFrom: null
    };

    this.deployments.set(deploymentId, deployment);
    logInfo('Deployment created', { deploymentId, version: config.version, environment: config.environment });

    return deployment;
  }

  async startDeployment(deploymentId) {
    const deployment = this.deployments.get(deploymentId);
    if (!deployment) {
      throw new Error('Deployment not found');
    }

    if (deployment.status !== 'pending') {
      throw new Error('Deployment can only be started from pending status');
    }

    deployment.status = 'running';
    deployment.startedAt = new Date().toISOString();
    this.deployments.set(deploymentId, deployment);

    logInfo('Deployment started', { deploymentId, version: deployment.version });

    this.executeDeployment(deploymentId).catch(error => {
      logError(error, null, { context: `Deployment ${deploymentId}` });
    });

    return deployment;
  }

  async executeDeployment(deploymentId) {
    const deployment = this.deployments.get(deploymentId);
    if (!deployment) return;

    try {
      const steps = this.getDeploymentSteps(deployment);
      
      for (let i = 0; i < steps.length; i++) {
        if (deployment.status === 'cancelled') {
          logInfo('Deployment cancelled', { deploymentId });
          return;
        }

        const step = steps[i];
        deployment.logs.push(`Starting step: ${step.name}`);
        
        await this.executeStep(deploymentId, step);
        
        deployment.progress = Math.round(((i + 1) / steps.length) * 100);
        this.deployments.set(deploymentId, deployment);
      }

      deployment.status = 'success';
      deployment.completedAt = new Date().toISOString();
      deployment.logs.push('Deployment completed successfully');
      
      this.addToHistory(deployment);
      logInfo('Deployment completed', { deploymentId, version: deployment.version });

    } catch (error) {
      deployment.status = 'failed';
      deployment.error = error.message;
      deployment.completedAt = new Date().toISOString();
      deployment.logs.push(`Deployment failed: ${error.message}`);
      
      logError(error, null, { context: `Deployment ${deploymentId}` });
    }

    this.deployments.set(deploymentId, deployment);
  }

  getDeploymentSteps(deployment) {
    const baseSteps = [
      { name: 'pre-deployment-checks', duration: 2000 },
      { name: 'backup-current-version', duration: 3000 },
      { name: 'pull-artifacts', duration: 5000 },
      { name: 'run-migrations', duration: 3000 },
      { name: 'update-configuration', duration: 2000 },
      { name: 'deploy-to-servers', duration: 10000 },
      { name: 'health-checks', duration: 5000 },
      { name: 'post-deployment-tasks', duration: 2000 }
    ];

    if (deployment.strategy === 'blue_green') {
      baseSteps.splice(6, 0, { name: 'switch-traffic', duration: 3000 });
      baseSteps.push({ name: 'cleanup-old-version', duration: 2000 });
    } else if (deployment.strategy === 'canary') {
      baseSteps.splice(6, 0, { name: 'gradual-traffic-shift', duration: 10000 });
      baseSteps.push({ name: 'finalize-canary', duration: 2000 });
    }

    return baseSteps;
  }

  async executeStep(deploymentId, step) {
    logInfo(`Executing deployment step: ${step.name}`, { deploymentId });
    
    await new Promise(resolve => setTimeout(resolve, step.duration));
    
    const deployment = this.deployments.get(deploymentId);
    if (deployment) {
      deployment.logs.push(`Completed step: ${step.name}`);
    }
  }

  async cancelDeployment(deploymentId) {
    const deployment = this.deployments.get(deploymentId);
    if (!deployment) {
      throw new Error('Deployment not found');
    }

    if (deployment.status !== 'running' && deployment.status !== 'pending') {
      throw new Error('Only running or pending deployments can be cancelled');
    }

    deployment.status = 'cancelled';
    deployment.completedAt = new Date().toISOString();
    deployment.logs.push('Deployment cancelled by user');
    
    this.deployments.set(deploymentId, deployment);
    this.addToHistory(deployment);
    
    logInfo('Deployment cancelled', { deploymentId });
    
    return deployment;
  }

  async rollbackDeployment(deploymentId) {
    const deployment = this.deployments.get(deploymentId);
    if (!deployment) {
      throw new Error('Deployment not found');
    }

    if (deployment.status !== 'success' && deployment.status !== 'failed') {
      throw new Error('Only completed or failed deployments can be rolled back');
    }

    const rollbackDeployment = await this.createDeployment({
      version: deployment.rollbackFrom || 'previous',
      environment: deployment.environment,
      branch: deployment.branch,
      servers: deployment.servers,
      strategy: deployment.strategy
    });

    rollbackDeployment.rollbackFrom = deployment.id;
    
    logInfo('Rollback initiated', { 
      originalDeployment: deploymentId, 
      rollbackDeployment: rollbackDeployment.id 
    });

    await this.startDeployment(rollbackDeployment.id);

    deployment.status = 'rolled_back';
    this.deployments.set(deploymentId, deployment);
    this.addToHistory(deployment);

    return rollbackDeployment;
  }

  getDeployment(deploymentId) {
    return this.deployments.get(deploymentId);
  }

  getDeployments(filters = {}) {
    let deployments = Array.from(this.deployments.values());

    if (filters.status) {
      deployments = deployments.filter(d => d.status === filters.status);
    }

    if (filters.environment) {
      deployments = deployments.filter(d => d.environment === filters.environment);
    }

    deployments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return deployments;
  }

  getDeploymentStats() {
    const deployments = Array.from(this.deployments.values());
    
    return {
      total: deployments.length,
      pending: deployments.filter(d => d.status === 'pending').length,
      running: deployments.filter(d => d.status === 'running').length,
      success: deployments.filter(d => d.status === 'success').length,
      failed: deployments.filter(d => d.status === 'failed').length,
      cancelled: deployments.filter(d => d.status === 'cancelled').length,
      rolledBack: deployments.filter(d => d.status === 'rolled_back').length
    };
  }

  addToHistory(deployment) {
    this.deploymentHistory.unshift({
      id: deployment.id,
      version: deployment.version,
      environment: deployment.environment,
      status: deployment.status,
      completedAt: deployment.completedAt,
      duration: deployment.startedAt && deployment.completedAt
        ? new Date(deployment.completedAt) - new Date(deployment.startedAt)
        : null
    });

    if (this.deploymentHistory.length > this.maxHistorySize) {
      this.deploymentHistory.pop();
    }
  }

  getDeploymentHistory(limit = 20) {
    return this.deploymentHistory.slice(0, limit);
  }

  getActiveDeployments() {
    return Array.from(this.deployments.values()).filter(
      d => d.status === 'running' || d.status === 'pending'
    );
  }
}

const deploymentService = new DeploymentService();

module.exports = {
  DeploymentService,
  deploymentService
};
