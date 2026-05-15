import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const DeploymentPanel = () => {
  const { t } = useTranslation();
  const [deployments, setDeployments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState({
    status: 'all',
    environment: 'all'
  });
  const [selectedDeployment, setSelectedDeployment] = useState(null);
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [deployForm, setDeployForm] = useState({
    environment: 'production',
    version: '',
    branch: 'main',
    servers: [],
    strategy: 'rolling'
  });

  useEffect(() => {
    fetchDeployments();
    const interval = setInterval(fetchDeployments, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchDeployments = async () => {
    try {
      const response = await fetch('/api/ops/deployments', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setDeployments(data);
      }
    } catch (error) {
      console.error('Failed to fetch deployments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const initiateDeployment = async () => {
    try {
      const response = await fetch('/api/ops/deployments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(deployForm)
      });
      
      if (response.ok) {
        setShowDeployModal(false);
        setDeployForm({
          environment: 'production',
          version: '',
          branch: 'main',
          servers: [],
          strategy: 'rolling'
        });
        fetchDeployments();
      }
    } catch (error) {
      console.error('Failed to initiate deployment:', error);
    }
  };

  const rollbackDeployment = async (deploymentId) => {
    if (!window.confirm(t('ops.confirmRollback'))) return;
    
    try {
      const response = await fetch(`/api/ops/deployments/${deploymentId}/rollback`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        fetchDeployments();
      }
    } catch (error) {
      console.error('Failed to rollback deployment:', error);
    }
  };

  const cancelDeployment = async (deploymentId) => {
    if (!window.confirm(t('ops.confirmCancel'))) return;
    
    try {
      const response = await fetch(`/api/ops/deployments/${deploymentId}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        fetchDeployments();
      }
    } catch (error) {
      console.error('Failed to cancel deployment:', error);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: '#6b7280',
      running: '#3b82f6',
      success: '#10b981',
      failed: '#ef4444',
      cancelled: '#f59e0b',
      rolled_back: '#8b5cf6'
    };
    return colors[status] || '#6b7280';
  };

  const getStatusIcon = (status) => {
    const icons = {
      pending: '⏳',
      running: '🔄',
      success: '✅',
      failed: '❌',
      cancelled: '🚫',
      rolled_back: '↩️'
    };
    return icons[status] || '❓';
  };

  const getEnvironmentColor = (env) => {
    const colors = {
      production: '#ef4444',
      staging: '#f59e0b',
      development: '#3b82f6',
      testing: '#10b981'
    };
    return colors[env] || '#6b7280';
  };

  const filteredDeployments = deployments.filter(deployment => {
    if (filter.status !== 'all' && deployment.status !== filter.status) return false;
    if (filter.environment !== 'all' && deployment.environment !== filter.environment) return false;
    return true;
  });

  const deploymentStats = {
    total: deployments.length,
    pending: deployments.filter(d => d.status === 'pending').length,
    running: deployments.filter(d => d.status === 'running').length,
    success: deployments.filter(d => d.status === 'success').length,
    failed: deployments.filter(d => d.status === 'failed').length
  };

  return (
    <div className="deployment-panel-container">
      <div className="deployment-header">
        <h2>{t('ops.deploymentPanel')}</h2>
        <button onClick={() => setShowDeployModal(true)} className="deploy-btn">
          {t('ops.newDeployment')}
        </button>
      </div>

      <div className="deployment-stats">
        <div className="stat-card">
          <h3>{deploymentStats.total}</h3>
          <p>{t('ops.totalDeployments')}</p>
        </div>
        <div className="stat-card">
          <h3>{deploymentStats.pending}</h3>
          <p>{t('ops.pending')}</p>
        </div>
        <div className="stat-card running">
          <h3>{deploymentStats.running}</h3>
          <p>{t('ops.running')}</p>
        </div>
        <div className="stat-card success">
          <h3>{deploymentStats.success}</h3>
          <p>{t('ops.successful')}</p>
        </div>
        <div className="stat-card failed">
          <h3>{deploymentStats.failed}</h3>
          <p>{t('ops.failed')}</p>
        </div>
      </div>

      <div className="deployment-filters">
        <div className="filter-group">
          <label>{t('ops.status')}</label>
          <select
            value={filter.status}
            onChange={(e) => setFilter({ ...filter, status: e.target.value })}
          >
            <option value="all">{t('ops.all')}</option>
            <option value="pending">{t('ops.pending')}</option>
            <option value="running">{t('ops.running')}</option>
            <option value="success">{t('ops.success')}</option>
            <option value="failed">{t('ops.failed')}</option>
            <option value="cancelled">{t('ops.cancelled')}</option>
            <option value="rolled_back">{t('ops.rolledBack')}</option>
          </select>
        </div>

        <div className="filter-group">
          <label>{t('ops.environment')}</label>
          <select
            value={filter.environment}
            onChange={(e) => setFilter({ ...filter, environment: e.target.value })}
          >
            <option value="all">{t('ops.all')}</option>
            <option value="production">{t('ops.production')}</option>
            <option value="staging">{t('ops.staging')}</option>
            <option value="development">{t('ops.development')}</option>
            <option value="testing">{t('ops.testing')}</option>
          </select>
        </div>
      </div>

      <div className="deployment-list">
        {isLoading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>{t('common.loading')}</p>
          </div>
        ) : (
          <>
            <div className="deployment-count">
              {t('ops.showing')} {filteredDeployments.length} {t('ops.of')} {deployments.length} {t('ops.deployments')}
            </div>

            <div className="deployment-entries">
              {filteredDeployments.map(deployment => (
                <div
                  key={deployment.id}
                  className={`deployment-entry ${deployment.status}`}
                  onClick={() => setSelectedDeployment(deployment)}
                >
                  <div className="deployment-entry-header">
                    <div className="deployment-info">
                      <span className="deployment-version">{deployment.version}</span>
                      <span
                        className="deployment-env"
                        style={{ color: getEnvironmentColor(deployment.environment) }}
                      >
                        {deployment.environment.toUpperCase()}
                      </span>
                      <span
                        className="deployment-status"
                        style={{ color: getStatusColor(deployment.status) }}
                      >
                        {getStatusIcon(deployment.status)} {deployment.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="deployment-meta">
                      <span className="deployment-branch">{deployment.branch}</span>
                      <span className="deployment-timestamp">
                        {new Date(deployment.timestamp).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="deployment-progress">
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{
                          width: `${deployment.progress || 0}%`,
                          backgroundColor: getStatusColor(deployment.status)
                        }}
                      />
                    </div>
                    <span>{deployment.progress || 0}%</span>
                  </div>

                  <div className="deployment-actions">
                    {deployment.status === 'running' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); cancelDeployment(deployment.id); }}
                        className="cancel-btn"
                      >
                        {t('ops.cancel')}
                      </button>
                    )}
                    {(deployment.status === 'success' || deployment.status === 'failed') && (
                      <button
                        onClick={(e) => { e.stopPropagation(); rollbackDeployment(deployment.id); }}
                        className="rollback-btn"
                      >
                        {t('ops.rollback')}
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedDeployment(deployment); }}
                      className="view-btn"
                    >
                      {t('ops.viewDetails')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {showDeployModal && (
        <div className="deploy-modal">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{t('ops.newDeployment')}</h3>
              <button className="close-btn" onClick={() => setShowDeployModal(false)}>×</button>
            </div>
            
            <div className="modal-body">
              <div className="form-group">
                <label>{t('ops.environment')}</label>
                <select
                  value={deployForm.environment}
                  onChange={(e) => setDeployForm({ ...deployForm, environment: e.target.value })}
                >
                  <option value="production">{t('ops.production')}</option>
                  <option value="staging">{t('ops.staging')}</option>
                  <option value="development">{t('ops.development')}</option>
                  <option value="testing">{t('ops.testing')}</option>
                </select>
              </div>

              <div className="form-group">
                <label>{t('ops.version')}</label>
                <input
                  type="text"
                  value={deployForm.version}
                  onChange={(e) => setDeployForm({ ...deployForm, version: e.target.value })}
                  placeholder={t('ops.versionPlaceholder')}
                />
              </div>

              <div className="form-group">
                <label>{t('ops.branch')}</label>
                <input
                  type="text"
                  value={deployForm.branch}
                  onChange={(e) => setDeployForm({ ...deployForm, branch: e.target.value })}
                  placeholder="main"
                />
              </div>

              <div className="form-group">
                <label>{t('ops.deploymentStrategy')}</label>
                <select
                  value={deployForm.strategy}
                  onChange={(e) => setDeployForm({ ...deployForm, strategy: e.target.value })}
                >
                  <option value="rolling">{t('ops.rollingUpdate')}</option>
                  <option value="blue_green">{t('ops.blueGreen')}</option>
                  <option value="canary">{t('ops.canary')}</option>
                </select>
              </div>

              <div className="modal-actions">
                <button onClick={() => setShowDeployModal(false)} className="cancel-btn">
                  {t('ops.cancel')}
                </button>
                <button onClick={initiateDeployment} className="deploy-btn">
                  {t('ops.deploy')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedDeployment && (
        <div className="deployment-detail-modal">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{t('ops.deploymentDetails')}</h3>
              <button className="close-btn" onClick={() => setSelectedDeployment(null)}>×</button>
            </div>
            
            <div className="modal-body">
              <div className="detail-row">
                <strong>{t('ops.deploymentId')}:</strong>
                <span>{selectedDeployment.id}</span>
              </div>
              <div className="detail-row">
                <strong>{t('ops.version')}:</strong>
                <span>{selectedDeployment.version}</span>
              </div>
              <div className="detail-row">
                <strong>{t('ops.environment')}:</strong>
                <span style={{ color: getEnvironmentColor(selectedDeployment.environment) }}>
                  {selectedDeployment.environment.toUpperCase()}
                </span>
              </div>
              <div className="detail-row">
                <strong>{t('ops.status')}:</strong>
                <span style={{ color: getStatusColor(selectedDeployment.status) }}>
                  {getStatusIcon(selectedDeployment.status)} {selectedDeployment.status.toUpperCase()}
                </span>
              </div>
              <div className="detail-row">
                <strong>{t('ops.branch')}:</strong>
                <span>{selectedDeployment.branch}</span>
              </div>
              <div className="detail-row">
                <strong>{t('ops.strategy')}:</strong>
                <span>{selectedDeployment.strategy}</span>
              </div>
              <div className="detail-row">
                <strong>{t('ops.progress')}:</strong>
                <span>{selectedDeployment.progress || 0}%</span>
              </div>
              <div className="detail-row">
                <strong>{t('ops.timestamp')}:</strong>
                <span>{new Date(selectedDeployment.timestamp).toLocaleString()}</span>
              </div>
              {selectedDeployment.deployedBy && (
                <div className="detail-row">
                  <strong>{t('ops.deployedBy')}:</strong>
                  <span>{selectedDeployment.deployedBy}</span>
                </div>
              )}
              {selectedDeployment.logs && (
                <div className="detail-row">
                  <strong>{t('ops.deploymentLogs')}:</strong>
                  <pre className="deployment-logs">{selectedDeployment.logs}</pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeploymentPanel;
