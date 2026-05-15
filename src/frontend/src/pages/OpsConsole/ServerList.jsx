import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const ServerList = () => {
  const { t } = useTranslation();
  const [servers, setServers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedServer, setSelectedServer] = useState(null);
  const [commandOutput, setCommandOutput] = useState('');
  const [commandInput, setCommandInput] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchServers();
    const interval = setInterval(fetchServers, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchServers = async () => {
    try {
      const response = await fetch('/api/ops/servers', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setServers(data);
      }
    } catch (error) {
      console.error('Failed to fetch servers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const executeCommand = async (serverId, command) => {
    try {
      const response = await fetch('/api/ops/servers/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ serverId, command })
      });
      
      if (response.ok) {
        const data = await response.json();
        setCommandOutput(data.output);
      } else {
        setCommandOutput('Error executing command');
      }
    } catch (error) {
      console.error('Failed to execute command:', error);
      setCommandOutput('Failed to execute command');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      online: '#10b981',
      offline: '#ef4444',
      warning: '#f59e0b',
      maintenance: '#6366f1'
    };
    return colors[status] || '#6b7280';
  };

  const getStatusIcon = (status) => {
    const icons = {
      online: '✅',
      offline: '❌',
      warning: '⚠️',
      maintenance: '🔧'
    };
    return icons[status] || '❓';
  };

  const filteredServers = servers.filter(server => {
    if (filter === 'all') return true;
    return server.status === filter;
  });

  const handleServerSelect = (server) => {
    setSelectedServer(server);
    setCommandOutput('');
  };

  const handleCommandSubmit = (e) => {
    e.preventDefault();
    if (selectedServer && commandInput.trim()) {
      executeCommand(selectedServer.id, commandInput);
      setCommandInput('');
    }
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="server-list-container">
      <div className="server-list-header">
        <h2>{t('ops.serverList')}</h2>
        <div className="server-filters">
          <button
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            {t('ops.all')} ({servers.length})
          </button>
          <button
            className={`filter-btn ${filter === 'online' ? 'active' : ''}`}
            onClick={() => setFilter('online')}
          >
            {t('ops.online')} ({servers.filter(s => s.status === 'online').length})
          </button>
          <button
            className={`filter-btn ${filter === 'offline' ? 'active' : ''}`}
            onClick={() => setFilter('offline')}
          >
            {t('ops.offline')} ({servers.filter(s => s.status === 'offline').length})
          </button>
          <button
            className={`filter-btn ${filter === 'warning' ? 'active' : ''}`}
            onClick={() => setFilter('warning')}
          >
            {t('ops.warning')} ({servers.filter(s => s.status === 'warning').length})
          </button>
        </div>
      </div>

      <div className="server-list-content">
        <div className="server-list-table">
          <table>
            <thead>
              <tr>
                <th>{t('ops.status')}</th>
                <th>{t('ops.serverName')}</th>
                <th>{t('ops.ipAddress')}</th>
                <th>{t('ops.cpu')}</th>
                <th>{t('ops.memory')}</th>
                <th>{t('ops.disk')}</th>
                <th>{t('ops.lastCheck')}</th>
                <th>{t('ops.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredServers.map(server => (
                <tr
                  key={server.id}
                  className={selectedServer?.id === server.id ? 'selected' : ''}
                  onClick={() => handleServerSelect(server)}
                >
                  <td>
                    <span className="status-indicator" style={{ color: getStatusColor(server.status) }}>
                      {getStatusIcon(server.status)}
                    </span>
                  </td>
                  <td>{server.name}</td>
                  <td>{server.ip}</td>
                  <td>
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{ width: `${server.cpu}%`, backgroundColor: server.cpu > 80 ? '#ef4444' : '#10b981' }}
                      />
                    </div>
                    <span>{server.cpu}%</span>
                  </td>
                  <td>
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{ width: `${server.memory}%`, backgroundColor: server.memory > 85 ? '#ef4444' : '#10b981' }}
                      />
                    </div>
                    <span>{server.memory}%</span>
                  </td>
                  <td>
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{ width: `${server.disk}%`, backgroundColor: server.disk > 90 ? '#ef4444' : '#10b981' }}
                      />
                    </div>
                    <span>{server.disk}%</span>
                  </td>
                  <td>{new Date(server.lastCheck).toLocaleString()}</td>
                  <td>
                    <button className="action-btn" onClick={(e) => { e.stopPropagation(); handleServerSelect(server); }}>
                      {t('ops.manage')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {selectedServer && (
          <div className="server-command-panel">
            <div className="command-panel-header">
              <h3>{t('ops.remoteCommand')}: {selectedServer.name}</h3>
              <button className="close-btn" onClick={() => setSelectedServer(null)}>×</button>
            </div>
            
            <div className="command-info">
              <p><strong>{t('ops.ipAddress')}:</strong> {selectedServer.ip}</p>
              <p><strong>{t('ops.status')}:</strong> {getStatusIcon(selectedServer.status)} {selectedServer.status}</p>
              <p><strong>{t('ops.uptime')}:</strong> {selectedServer.uptime || 'N/A'}</p>
            </div>

            <form onSubmit={handleCommandSubmit} className="command-form">
              <input
                type="text"
                value={commandInput}
                onChange={(e) => setCommandInput(e.target.value)}
                placeholder={t('ops.commandPlaceholder')}
                className="command-input"
              />
              <button type="submit" className="execute-btn">
                {t('ops.execute')}
              </button>
            </form>

            <div className="command-output">
              <h4>{t('ops.output')}</h4>
              <pre>{commandOutput || t('ops.noOutput')}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ServerList;
