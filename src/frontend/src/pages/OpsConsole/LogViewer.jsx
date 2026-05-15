import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const LogViewer = () => {
  const { t } = useTranslation();
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState({
    level: 'all',
    search: '',
    source: 'all',
    dateRange: 'all'
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0
  });
  const [selectedLog, setSelectedLog] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    fetchLogs();
    
    let interval;
    if (autoRefresh) {
      interval = setInterval(fetchLogs, 10000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [filter, pagination.page, autoRefresh]);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        level: filter.level,
        source: filter.source,
        search: filter.search,
        dateRange: filter.dateRange
      });

      const response = await fetch(`/api/ops/logs?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs);
        setPagination(prev => ({
          ...prev,
          total: data.total
        }));
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const searchLogs = async () => {
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchLogs();
  };

  const exportLogs = async () => {
    try {
      const response = await fetch('/api/ops/logs/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(filter)
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `logs-${new Date().toISOString()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Failed to export logs:', error);
    }
  };

  const getLogLevelColor = (level) => {
    const colors = {
      error: '#ef4444',
      warn: '#f59e0b',
      info: '#3b82f6',
      debug: '#6b7280',
      trace: '#9ca3af'
    };
    return colors[level] || '#6b7280';
  };

  const getLogLevelIcon = (level) => {
    const icons = {
      error: '❌',
      warn: '⚠️',
      info: 'ℹ️',
      debug: '🔍',
      trace: '📝'
    };
    return icons[level] || '📋';
  };

  const filteredLogs = logs.filter(log => {
    if (filter.level !== 'all' && log.level !== filter.level) return false;
    if (filter.search && !log.message.toLowerCase().includes(filter.search.toLowerCase())) return false;
    return true;
  });

  const totalPages = Math.ceil(pagination.total / pagination.limit);

  return (
    <div className="log-viewer-container">
      <div className="log-viewer-header">
        <h2>{t('ops.logViewer')}</h2>
        <div className="log-viewer-actions">
          <label className="auto-refresh-toggle">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            {t('ops.autoRefresh')}
          </label>
          <button onClick={exportLogs} className="export-btn">
            {t('ops.exportLogs')}
          </button>
        </div>
      </div>

      <div className="log-filters">
        <div className="filter-group">
          <label>{t('ops.logLevel')}</label>
          <select
            value={filter.level}
            onChange={(e) => setFilter({ ...filter, level: e.target.value })}
          >
            <option value="all">{t('ops.all')}</option>
            <option value="error">Error</option>
            <option value="warn">Warning</option>
            <option value="info">Info</option>
            <option value="debug">Debug</option>
          </select>
        </div>

        <div className="filter-group">
          <label>{t('ops.source')}</label>
          <select
            value={filter.source}
            onChange={(e) => setFilter({ ...filter, source: e.target.value })}
          >
            <option value="all">{t('ops.all')}</option>
            <option value="frontend">Frontend</option>
            <option value="backend">Backend</option>
            <option value="database">Database</option>
            <option value="api">API</option>
          </select>
        </div>

        <div className="filter-group">
          <label>{t('ops.search')}</label>
          <input
            type="text"
            value={filter.search}
            onChange={(e) => setFilter({ ...filter, search: e.target.value })}
            placeholder={t('ops.searchPlaceholder')}
          />
        </div>

        <button onClick={searchLogs} className="search-btn">
          {t('ops.search')}
        </button>
      </div>

      <div className="log-list">
        {isLoading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>{t('common.loading')}</p>
          </div>
        ) : (
          <>
            <div className="log-count">
              {t('ops.showing')} {filteredLogs.length} {t('ops.of')} {pagination.total} {t('ops.logs')}
            </div>

            <div className="log-entries">
              {filteredLogs.map(log => (
                <div
                  key={log.id}
                  className={`log-entry ${selectedLog?.id === log.id ? 'selected' : ''}`}
                  onClick={() => setSelectedLog(log)}
                >
                  <div className="log-entry-header">
                    <span className="log-level" style={{ color: getLogLevelColor(log.level) }}>
                      {getLogLevelIcon(log.level)} {log.level.toUpperCase()}
                    </span>
                    <span className="log-timestamp">{new Date(log.timestamp).toLocaleString()}</span>
                    <span className="log-source">{log.source}</span>
                  </div>
                  <div className="log-message">{log.message}</div>
                </div>
              ))}
            </div>

            {selectedLog && (
              <div className="log-detail-panel">
                <div className="detail-panel-header">
                  <h3>{t('ops.logDetails')}</h3>
                  <button className="close-btn" onClick={() => setSelectedLog(null)}>×</button>
                </div>
                
                <div className="detail-content">
                  <div className="detail-row">
                    <strong>{t('ops.timestamp')}:</strong>
                    <span>{new Date(selectedLog.timestamp).toLocaleString()}</span>
                  </div>
                  <div className="detail-row">
                    <strong>{t('ops.level')}:</strong>
                    <span style={{ color: getLogLevelColor(selectedLog.level) }}>
                      {getLogLevelIcon(selectedLog.level)} {selectedLog.level.toUpperCase()}
                    </span>
                  </div>
                  <div className="detail-row">
                    <strong>{t('ops.source')}:</strong>
                    <span>{selectedLog.source}</span>
                  </div>
                  <div className="detail-row">
                    <strong>{t('ops.message')}:</strong>
                    <span>{selectedLog.message}</span>
                  </div>
                  {selectedLog.stack && (
                    <div className="detail-row">
                      <strong>{t('ops.stackTrace')}:</strong>
                      <pre className="stack-trace">{selectedLog.stack}</pre>
                    </div>
                  )}
                  {selectedLog.metadata && (
                    <div className="detail-row">
                      <strong>{t('ops.metadata')}:</strong>
                      <pre className="metadata">{JSON.stringify(selectedLog.metadata, null, 2)}</pre>
                    </div>
                  )}
                </div>
              </div>
            )}

            {pagination.total > pagination.limit && (
              <div className="pagination">
                <button
                  onClick={() => setPagination({ ...pagination, page: 1 })}
                  disabled={pagination.page === 1}
                >
                  {t('ops.first')}
                </button>
                <button
                  onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                  disabled={pagination.page === 1}
                >
                  {t('ops.previous')}
                </button>
                <span>
                  {t('ops.page')} {pagination.page} {t('ops.of')} {totalPages}
                </span>
                <button
                  onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                  disabled={pagination.page >= totalPages}
                >
                  {t('ops.next')}
                </button>
                <button
                  onClick={() => setPagination({ ...pagination, page: totalPages })}
                  disabled={pagination.page >= totalPages}
                >
                  {t('ops.last')}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default LogViewer;
