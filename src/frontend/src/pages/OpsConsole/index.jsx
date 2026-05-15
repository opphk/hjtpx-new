import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import SEO from '../../components/SEO';
import DashboardLayout from '../../components/DashboardLayout';
import Alert from '../../components/Alert';
import ServerList from './ServerList';
import LogViewer from './LogViewer';
import AlertManager from './AlertManager';
import DeploymentPanel from './DeploymentPanel';

const OpsConsole = () => {
  const { t } = useTranslation();
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState('servers');
  const [isLoading, setIsLoading] = useState(true);
  const [systemMetrics, setSystemMetrics] = useState({
    totalServers: 0,
    activeAlerts: 0,
    pendingDeployments: 0,
    recentLogs: 0
  });

  useEffect(() => {
    fetchDashboardMetrics();
  }, []);

  const fetchDashboardMetrics = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/ops/metrics', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSystemMetrics(data);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard metrics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <>
        <SEO title={t('ops.console')} />
        <Alert 
          type="warning" 
          message={t('common.error')} 
        />
      </>
    );
  }

  const tabs = [
    { id: 'servers', label: t('ops.serverList'), icon: '🖥️' },
    { id: 'logs', label: t('ops.logViewer'), icon: '📋' },
    { id: 'alerts', label: t('ops.alertManager'), icon: '🚨' },
    { id: 'deployments', label: t('ops.deploymentPanel'), icon: '🚀' }
  ];

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'servers':
        return <ServerList />;
      case 'logs':
        return <LogViewer />;
      case 'alerts':
        return <AlertManager />;
      case 'deployments':
        return <DeploymentPanel />;
      default:
        return <ServerList />;
    }
  };

  return (
    <>
      <SEO title={t('ops.console')} />
      <DashboardLayout>
        <div className="ops-console">
          <div className="ops-console-header">
            <h1>{t('ops.console')}</h1>
            <p>{t('ops.subtitle')}</p>
          </div>

          <div className="ops-console-metrics">
            <div className="metric-card">
              <div className="metric-icon">🖥️</div>
              <div className="metric-content">
                <h3>{systemMetrics.totalServers}</h3>
                <p>{t('ops.totalServers')}</p>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon">🚨</div>
              <div className="metric-content">
                <h3>{systemMetrics.activeAlerts}</h3>
                <p>{t('ops.activeAlerts')}</p>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon">🚀</div>
              <div className="metric-content">
                <h3>{systemMetrics.pendingDeployments}</h3>
                <p>{t('ops.pendingDeployments')}</p>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon">📋</div>
              <div className="metric-content">
                <h3>{systemMetrics.recentLogs}</h3>
                <p>{t('ops.recentLogs')}</p>
              </div>
            </div>
          </div>

          <div className="ops-console-tabs">
            {tabs.map(tab => (
              <button
                key={tab.id}
                className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span className="tab-icon">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          <div className="ops-console-content">
            {isLoading ? (
              <div className="loading-container">
                <div className="spinner"></div>
                <p>{t('common.loading')}</p>
              </div>
            ) : (
              renderActiveTab()
            )}
          </div>
        </div>
      </DashboardLayout>
    </>
  );
};

export default OpsConsole;
