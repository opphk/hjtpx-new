import React, { useState, useEffect } from 'react';
import LineChartComponent from './LineChart';
import BarChartComponent from './BarChart';
import PieChartComponent from './PieChart';
import { useTranslation } from 'react-i18next';

const Dashboard = ({ 
  data = {}, 
  loading = false, 
  refreshInterval = 30000,
  showRealtimeUpdates = true,
  timeRange = '7d'
}) => {
  const { t } = useTranslation();
  const [realtimeMetrics, setRealtimeMetrics] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    if (!showRealtimeUpdates) return;

    const fetchRealtimeMetrics = async () => {
      try {
        const response = await fetch('/api/v1/analytics/realtime');
        if (response.ok) {
          const result = await response.json();
          setRealtimeMetrics(result);
          setLastUpdate(new Date());
        }
      } catch (error) {
        console.error('Error fetching real-time metrics:', error);
      }
    };

    fetchRealtimeMetrics();
    const interval = setInterval(fetchRealtimeMetrics, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval, showRealtimeUpdates]);

  const formatNumber = (num) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const MetricCard = ({ title, value, change, icon, color }) => (
    <div className="metric-card" style={{ borderLeft: `4px solid ${color}` }}>
      <div className="metric-header">
        <span className="metric-title">{title}</span>
        {icon && <span className="metric-icon">{icon}</span>}
      </div>
      <div className="metric-value">{loading ? '...' : formatNumber(value)}</div>
      {change !== undefined && (
        <div className={`metric-change ${change >= 0 ? 'positive' : 'negative'}`}>
          {change >= 0 ? '↑' : '↓'} {Math.abs(change).toFixed(1)}%
        </div>
      )}
    </div>
  );

  return (
    <div className="analytics-dashboard">
      <div className="dashboard-header">
        <h2>{t('analytics.dashboard.title', 'Analytics Dashboard')}</h2>
        <div className="dashboard-meta">
          <span>{t('analytics.dashboard.timeRange', 'Time Range')}: {timeRange}</span>
          <span className="last-update">
            {t('analytics.dashboard.lastUpdate', 'Last Update')}: {lastUpdate.toLocaleTimeString()}
          </span>
          {showRealtimeUpdates && realtimeMetrics && (
            <span className="realtime-indicator">
              ● {t('analytics.dashboard.live', 'Live')}
            </span>
          )}
        </div>
      </div>

      {realtimeMetrics && (
        <div className="realtime-metrics">
          <MetricCard
            title={t('analytics.metrics.activeUsers', 'Active Users')}
            value={realtimeMetrics.metrics?.activeUsers || 0}
            icon="👥"
            color="#8884d8"
          />
          <MetricCard
            title={t('analytics.metrics.eventsLastMinute', 'Events/Min')}
            value={realtimeMetrics.metrics?.eventsLastMinute || 0}
            icon="⚡"
            color="#82ca9d"
          />
          <MetricCard
            title={t('analytics.metrics.eventsLast5Min', 'Events/5Min')}
            value={realtimeMetrics.metrics?.eventsLastFiveMinutes || 0}
            icon="📊"
            color="#ffc658"
          />
        </div>
      )}

      <div className="dashboard-summary">
        <MetricCard
          title={t('analytics.metrics.totalEvents', 'Total Events')}
          value={data.summary?.totalEvents || 0}
          change={data.summary?.comparison?.changePercent}
          icon="📈"
          color="#8884d8"
        />
        <MetricCard
          title={t('analytics.metrics.uniqueUsers', 'Unique Users')}
          value={data.summary?.uniqueUsers || 0}
          icon="👤"
          color="#82ca9d"
        />
        <MetricCard
          title={t('analytics.metrics.totalSessions', 'Total Sessions')}
          value={data.summary?.totalSessions || 0}
          icon="🔄"
          color="#ffc658"
        />
        <MetricCard
          title={t('analytics.metrics.avgEventsPerUser', 'Avg Events/User')}
          value={data.summary?.avgEventsPerUser || 0}
          icon="📊"
          color="#ff7300"
        />
      </div>

      <div className="dashboard-charts">
        <div className="chart-section full-width">
          <h3>{t('analytics.charts.activityOverTime', 'Activity Over Time')}</h3>
          {loading ? (
            <div className="chart-loading">Loading...</div>
          ) : (
            <LineChartComponent
              data={data.activityByDay || []}
              xKey="date"
              yKeys={['events', 'users']}
              title=""
              height={350}
              showGrid={true}
              colors={['#8884d8', '#82ca9d']}
              fill={true}
              smooth={true}
            />
          )}
        </div>

        <div className="chart-section">
          <h3>{t('analytics.charts.topEvents', 'Top Events')}</h3>
          {loading ? (
            <div className="chart-loading">Loading...</div>
          ) : (
            <BarChartComponent
              data={(data.topEvents || []).map(event => ({
                name: event.eventType,
                value: event.count
              }))}
              xKey="name"
              yKeys={['value']}
              title=""
              height={300}
              horizontal={true}
              colors={['#8884d8']}
            />
          )}
        </div>

        <div className="chart-section">
          <h3>{t('analytics.charts.userDistribution', 'User Distribution')}</h3>
          {loading ? (
            <div className="chart-loading">Loading...</div>
          ) : (
            <PieChartComponent
              data={(data.userEngagement?.userTypes || []).map(type => ({
                name: type.user_type,
                value: type.count
              }))}
              nameKey="name"
              valueKey="value"
              title=""
              height={300}
              showPercentage={true}
              colors={['#8884d8', '#82ca9d', '#ffc658', '#ff7300']}
            />
          )}
        </div>

        <div className="chart-section">
          <h3>{t('analytics.charts.deviceBreakdown', 'Device Breakdown')}</h3>
          {loading ? (
            <div className="chart-loading">Loading...</div>
          ) : (
            <BarChartComponent
              data={(data.deviceBreakdown || []).map(device => ({
                name: device.deviceType,
                value: device.count
              }))}
              xKey="name"
              yKeys={['value']}
              title=""
              height={300}
              colors={['#00C49F']}
            />
          )}
        </div>

        <div className="chart-section">
          <h3>{t('analytics.charts.geographicDistribution', 'Geographic Distribution')}</h3>
          {loading ? (
            <div className="chart-loading">Loading...</div>
          ) : (
            <PieChartComponent
              data={(data.geographicData || []).map(geo => ({
                name: geo.location,
                value: geo.events
              }))}
              nameKey="name"
              valueKey="value"
              title=""
              height={300}
              showPercentage={true}
              legendPosition="right"
              colors={['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00C49F', '#FFBB28']}
            />
          )}
        </div>
      </div>

      <style jsx>{`
        .analytics-dashboard {
          padding: 20px;
          background: #f5f5f5;
          min-height: 100vh;
        }

        .dashboard-header {
          margin-bottom: 30px;
        }

        .dashboard-header h2 {
          margin: 0 0 10px 0;
          color: #333;
          font-size: 28px;
        }

        .dashboard-meta {
          display: flex;
          gap: 20px;
          font-size: 14px;
          color: #666;
        }

        .last-update {
          color: #888;
        }

        .realtime-indicator {
          color: #22c55e;
          font-weight: bold;
        }

        .realtime-metrics,
        .dashboard-summary {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }

        .metric-card {
          background: white;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .metric-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }

        .metric-title {
          font-size: 14px;
          color: #666;
          font-weight: 500;
        }

        .metric-icon {
          font-size: 20px;
        }

        .metric-value {
          font-size: 32px;
          font-weight: bold;
          color: #333;
          margin-bottom: 5px;
        }

        .metric-change {
          font-size: 14px;
          font-weight: 500;
        }

        .metric-change.positive {
          color: #22c55e;
        }

        .metric-change.negative {
          color: #ef4444;
        }

        .dashboard-charts {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
        }

        .chart-section {
          background: white;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .chart-section.full-width {
          grid-column: 1 / -1;
        }

        .chart-section h3 {
          margin: 0 0 20px 0;
          color: #333;
          font-size: 18px;
        }

        .chart-loading {
          height: 300px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #888;
        }

        @media (max-width: 1024px) {
          .dashboard-charts {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
