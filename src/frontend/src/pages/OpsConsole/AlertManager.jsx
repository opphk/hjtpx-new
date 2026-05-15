import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const AlertManager = () => {
  const { t } = useTranslation();
  const [alerts, setAlerts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState({
    status: 'all',
    severity: 'all',
    type: 'all'
  });
  const [rules, setRules] = useState([]);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState(null);

  useEffect(() => {
    fetchAlerts();
    fetchRules();
    const interval = setInterval(fetchAlerts, 15000);
    return () => clearInterval(interval);
  }, []);

  const fetchAlerts = async () => {
    try {
      const response = await fetch('/api/ops/alerts', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAlerts(data);
      }
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRules = async () => {
    try {
      const response = await fetch('/api/ops/alerts/rules', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setRules(data);
      }
    } catch (error) {
      console.error('Failed to fetch rules:', error);
    }
  };

  const acknowledgeAlert = async (alertId) => {
    try {
      const response = await fetch(`/api/ops/alerts/${alertId}/acknowledge`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        fetchAlerts();
      }
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
    }
  };

  const resolveAlert = async (alertId) => {
    try {
      const response = await fetch(`/api/ops/alerts/${alertId}/resolve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        fetchAlerts();
      }
    } catch (error) {
      console.error('Failed to resolve alert:', error);
    }
  };

  const deleteAlert = async (alertId) => {
    if (!window.confirm(t('ops.confirmDeleteAlert'))) return;
    
    try {
      const response = await fetch(`/api/ops/alerts/${alertId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        fetchAlerts();
      }
    } catch (error) {
      console.error('Failed to delete alert:', error);
    }
  };

  const getSeverityColor = (severity) => {
    const colors = {
      critical: '#ef4444',
      high: '#f97316',
      medium: '#f59e0b',
      low: '#3b82f6'
    };
    return colors[severity] || '#6b7280';
  };

  const getSeverityIcon = (severity) => {
    const icons = {
      critical: '🔴',
      high: '🟠',
      medium: '🟡',
      low: '🔵'
    };
    return icons[severity] || '⚪';
  };

  const getStatusColor = (status) => {
    const colors = {
      active: '#ef4444',
      acknowledged: '#f59e0b',
      resolved: '#10b981'
    };
    return colors[status] || '#6b7280';
  };

  const filteredAlerts = alerts.filter(alert => {
    if (filter.status !== 'all' && alert.status !== filter.status) return false;
    if (filter.severity !== 'all' && alert.severity !== filter.severity) return false;
    if (filter.type !== 'all' && alert.type !== filter.type) return false;
    return true;
  });

  const alertStats = {
    total: alerts.length,
    active: alerts.filter(a => a.status === 'active').length,
    acknowledged: alerts.filter(a => a.status === 'acknowledged').length,
    resolved: alerts.filter(a => a.status === 'resolved').length
  };

  return (
    <div className="alert-manager-container">
      <div className="alert-manager-header">
        <h2>{t('ops.alertManager')}</h2>
        <div className="alert-actions">
          <button onClick={() => setShowRuleModal(true)} className="rule-btn">
            {t('ops.manageRules')}
          </button>
        </div>
      </div>

      <div className="alert-stats">
        <div className="stat-card">
          <h3>{alertStats.total}</h3>
          <p>{t('ops.totalAlerts')}</p>
        </div>
        <div className="stat-card critical">
          <h3>{alertStats.active}</h3>
          <p>{t('ops.activeAlerts')}</p>
        </div>
        <div className="stat-card warning">
          <h3>{alertStats.acknowledged}</h3>
          <p>{t('ops.acknowledged')}</p>
        </div>
        <div className="stat-card success">
          <h3>{alertStats.resolved}</h3>
          <p>{t('ops.resolved')}</p>
        </div>
      </div>

      <div className="alert-filters">
        <div className="filter-group">
          <label>{t('ops.status')}</label>
          <select
            value={filter.status}
            onChange={(e) => setFilter({ ...filter, status: e.target.value })}
          >
            <option value="all">{t('ops.all')}</option>
            <option value="active">{t('ops.active')}</option>
            <option value="acknowledged">{t('ops.acknowledged')}</option>
            <option value="resolved">{t('ops.resolved')}</option>
          </select>
        </div>

        <div className="filter-group">
          <label>{t('ops.severity')}</label>
          <select
            value={filter.severity}
            onChange={(e) => setFilter({ ...filter, severity: e.target.value })}
          >
            <option value="all">{t('ops.all')}</option>
            <option value="critical">{t('ops.critical')}</option>
            <option value="high">{t('ops.high')}</option>
            <option value="medium">{t('ops.medium')}</option>
            <option value="low">{t('ops.low')}</option>
          </select>
        </div>

        <div className="filter-group">
          <label>{t('ops.type')}</label>
          <select
            value={filter.type}
            onChange={(e) => setFilter({ ...filter, type: e.target.value })}
          >
            <option value="all">{t('ops.all')}</option>
            <option value="system">{t('ops.system')}</option>
            <option value="performance">{t('ops.performance')}</option>
            <option value="security">{t('ops.security')}</option>
            <option value="deployment">{t('ops.deployment')}</option>
          </select>
        </div>
      </div>

      <div className="alert-list">
        {isLoading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>{t('common.loading')}</p>
          </div>
        ) : (
          <>
            <div className="alert-count">
              {t('ops.showing')} {filteredAlerts.length} {t('ops.of')} {alerts.length} {t('ops.alerts')}
            </div>

            <div className="alert-entries">
              {filteredAlerts.map(alert => (
                <div
                  key={alert.id}
                  className={`alert-entry ${alert.status}`}
                  onClick={() => setSelectedAlert(alert)}
                >
                  <div className="alert-entry-header">
                    <span className="alert-severity" style={{ color: getSeverityColor(alert.severity) }}>
                      {getSeverityIcon(alert.severity)} {alert.severity.toUpperCase()}
                    </span>
                    <span className="alert-status" style={{ color: getStatusColor(alert.status) }}>
                      {alert.status.toUpperCase()}
                    </span>
                    <span className="alert-timestamp">
                      {new Date(alert.timestamp).toLocaleString()}
                    </span>
                    <span className="alert-type">{alert.type}</span>
                  </div>
                  <div className="alert-message">{alert.message}</div>
                  <div className="alert-actions">
                    {alert.status === 'active' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); acknowledgeAlert(alert.id); }}
                        className="acknowledge-btn"
                      >
                        {t('ops.acknowledge')}
                      </button>
                    )}
                    {alert.status !== 'resolved' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); resolveAlert(alert.id); }}
                        className="resolve-btn"
                      >
                        {t('ops.resolve')}
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteAlert(alert.id); }}
                      className="delete-btn"
                    >
                      {t('ops.delete')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {selectedAlert && (
        <div className="alert-detail-modal">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{t('ops.alertDetails')}</h3>
              <button className="close-btn" onClick={() => setSelectedAlert(null)}>×</button>
            </div>
            
            <div className="modal-body">
              <div className="detail-row">
                <strong>{t('ops.alertId')}:</strong>
                <span>{selectedAlert.id}</span>
              </div>
              <div className="detail-row">
                <strong>{t('ops.severity')}:</strong>
                <span style={{ color: getSeverityColor(selectedAlert.severity) }}>
                  {getSeverityIcon(selectedAlert.severity)} {selectedAlert.severity.toUpperCase()}
                </span>
              </div>
              <div className="detail-row">
                <strong>{t('ops.status')}:</strong>
                <span style={{ color: getStatusColor(selectedAlert.status) }}>
                  {selectedAlert.status.toUpperCase()}
                </span>
              </div>
              <div className="detail-row">
                <strong>{t('ops.type')}:</strong>
                <span>{selectedAlert.type}</span>
              </div>
              <div className="detail-row">
                <strong>{t('ops.timestamp')}:</strong>
                <span>{new Date(selectedAlert.timestamp).toLocaleString()}</span>
              </div>
              <div className="detail-row">
                <strong>{t('ops.message')}:</strong>
                <span>{selectedAlert.message}</span>
              </div>
              {selectedAlert.details && (
                <div className="detail-row">
                  <strong>{t('ops.details')}:</strong>
                  <pre>{JSON.stringify(selectedAlert.details, null, 2)}</pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showRuleModal && (
        <div className="rule-modal">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{t('ops.alertRules')}</h3>
              <button className="close-btn" onClick={() => setShowRuleModal(false)}>×</button>
            </div>
            
            <div className="modal-body">
              <div className="rules-list">
                {rules.map(rule => (
                  <div key={rule.id} className="rule-item">
                    <div className="rule-info">
                      <h4>{rule.name}</h4>
                      <p>{rule.description}</p>
                    </div>
                    <div className="rule-toggle">
                      <label className="switch">
                        <input type="checkbox" checked={rule.enabled} />
                        <span className="slider"></span>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AlertManager;
