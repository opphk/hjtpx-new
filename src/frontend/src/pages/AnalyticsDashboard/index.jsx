import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dashboard } from '../../components/charts';
import ReportBuilder from './ReportBuilder';
import ExportPanel from './ExportPanel';

const AnalyticsDashboardPage = () => {
  const { t } = useTranslation();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState('7d');
  const [showReportBuilder, setShowReportBuilder] = useState(false);
  const [showExportPanel, setShowExportPanel] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchDashboardData();
  }, [timeRange]);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/v1/analytics/dashboard?period=${timeRange}`);
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const data = await response.json();
      setDashboardData(data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchDashboardData();
  };

  const handleExport = async (format) => {
    try {
      const response = await fetch('/api/v1/analytics/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          template: 'detailed',
          format,
          period: { days: parseInt(timeRange) || 7 },
          sections: ['summary', 'activityByDay', 'topEvents', 'userEngagement'],
          title: 'Analytics Report',
          includeCharts: false
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate report');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics_report_${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setShowExportPanel(false);
    } catch (error) {
      console.error('Error exporting report:', error);
      alert('Failed to export report');
    }
  };

  const tabs = [
    { id: 'overview', label: t('analytics.tabs.overview', 'Overview') },
    { id: 'reports', label: t('analytics.tabs.reports', 'Reports') },
    { id: 'export', label: t('analytics.tabs.export', 'Export') }
  ];

  return (
    <div className="analytics-dashboard-page">
      <div className="page-header">
        <div className="header-content">
          <h1>{t('analytics.page.title', 'Advanced Analytics Dashboard')}</h1>
          <p className="page-description">
            {t('analytics.page.description', 'Comprehensive analytics and reporting platform')}
          </p>
        </div>
        <div className="header-actions">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="time-range-select"
          >
            <option value="24h">{t('analytics.timeRange.24h', 'Last 24 Hours')}</option>
            <option value="7d">{t('analytics.timeRange.7d', 'Last 7 Days')}</option>
            <option value="30d">{t('analytics.timeRange.30d', 'Last 30 Days')}</option>
            <option value="90d">{t('analytics.timeRange.90d', 'Last 90 Days')}</option>
          </select>
          <button onClick={handleRefresh} className="refresh-button" disabled={loading}>
            {loading ? t('analytics.actions.refreshing', 'Refreshing...') : t('analytics.actions.refresh', 'Refresh')}
          </button>
        </div>
      </div>

      <div className="tabs-container">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="error-message">
          <span>⚠️ {error}</span>
          <button onClick={handleRefresh}>{t('analytics.actions.retry', 'Retry')}</button>
        </div>
      )}

      {activeTab === 'overview' && (
        <Dashboard
          data={dashboardData || {}}
          loading={loading}
          showRealtimeUpdates={true}
          timeRange={timeRange}
        />
      )}

      {activeTab === 'reports' && (
        <ReportBuilder
          onGenerateReport={async (config) => {
            try {
              const response = await fetch('/api/v1/analytics/report', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify(config)
              });

              if (!response.ok) {
                throw new Error('Failed to generate report');
              }

              const report = await response.json();
              alert(t('analytics.messages.reportGenerated', 'Report generated successfully!'));
              return report;
            } catch (error) {
              console.error('Error generating report:', error);
              throw error;
            }
          }}
        />
      )}

      {activeTab === 'export' && (
        <ExportPanel
          onExport={handleExport}
          loading={loading}
        />
      )}

      <style jsx>{`
        .analytics-dashboard-page {
          width: 100%;
          min-height: 100vh;
          background: #f5f5f5;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 30px 40px;
          background: white;
          border-bottom: 1px solid #e0e0e0;
        }

        .header-content h1 {
          margin: 0 0 8px 0;
          font-size: 32px;
          font-weight: bold;
          color: #333;
        }

        .page-description {
          margin: 0;
          color: #666;
          font-size: 14px;
        }

        .header-actions {
          display: flex;
          gap: 12px;
        }

        .time-range-select {
          padding: 10px 16px;
          border: 1px solid #d0d0d0;
          border-radius: 6px;
          font-size: 14px;
          background: white;
          cursor: pointer;
          transition: border-color 0.2s;
        }

        .time-range-select:hover {
          border-color: #8884d8;
        }

        .refresh-button {
          padding: 10px 20px;
          background: #8884d8;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
        }

        .refresh-button:hover:not(:disabled) {
          background: #7b75c6;
        }

        .refresh-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .tabs-container {
          display: flex;
          gap: 0;
          padding: 0 40px;
          background: white;
          border-bottom: 1px solid #e0e0e0;
        }

        .tab-button {
          padding: 16px 24px;
          background: none;
          border: none;
          border-bottom: 3px solid transparent;
          font-size: 14px;
          font-weight: 500;
          color: #666;
          cursor: pointer;
          transition: all 0.2s;
        }

        .tab-button:hover {
          color: #8884d8;
        }

        .tab-button.active {
          color: #8884d8;
          border-bottom-color: #8884d8;
        }

        .error-message {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin: 20px 40px;
          padding: 16px 20px;
          background: #fee;
          border: 1px solid #fcc;
          border-radius: 6px;
          color: #c33;
        }

        .error-message button {
          padding: 8px 16px;
          background: #c33;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 14px;
          cursor: pointer;
        }

        @media (max-width: 768px) {
          .page-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 20px;
          }

          .header-actions {
            width: 100%;
            justify-content: flex-end;
          }

          .tabs-container {
            padding: 0 20px;
            overflow-x: auto;
          }
        }
      `}</style>
    </div>
  );
};

export default AnalyticsDashboardPage;
