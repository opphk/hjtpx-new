import React from 'react';
import Loading from './ui/Loading';

const LogList = ({ logs, loading, onViewDetails, selectedLog }) => {
  const getLevelBadge = (level) => {
    const levelMap = {
      error: { label: '错误', className: 'level-error' },
      warn: { label: '警告', className: 'level-warn' },
      info: { label: '信息', className: 'level-info' },
      debug: { label: '调试', className: 'level-debug' }
    };
    const levelInfo = levelMap[level] || levelMap.info;
    return <span className={`log-level-badge ${levelInfo.className}`}>{levelInfo.label}</span>;
  };

  const getTypeBadge = (type) => {
    const typeMap = {
      operation: { label: '操作', className: 'type-operation' },
      error: { label: '错误', className: 'type-error' },
      security: { label: '安全', className: 'type-security' },
      system: { label: '系统', className: 'type-system' }
    };
    const typeInfo = typeMap[type] || typeMap.operation;
    return <span className={`log-type-badge ${typeInfo.className}`}>{typeInfo.label}</span>;
  };

  if (loading && logs.length === 0) {
    return <Loading text="加载日志..." />;
  }

  if (!loading && logs.length === 0) {
    return (
      <div className="empty-state">
        <p>暂无日志数据</p>
      </div>
    );
  }

  return (
    <div className="log-list-container">
      <table className="log-table">
        <thead>
          <tr>
            <th>时间</th>
            <th>级别</th>
            <th>类型</th>
            <th>用户</th>
            <th>操作</th>
            <th>IP地址</th>
            <th>详情</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log, index) => (
            <tr
              key={log.id || index}
              className={selectedLog?.id === log.id ? 'selected' : ''}
              onClick={() => onViewDetails(log)}
            >
              <td className="log-time">
                {new Date(log.timestamp).toLocaleString('zh-CN', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </td>
              <td>{getLevelBadge(log.level)}</td>
              <td>{getTypeBadge(log.type)}</td>
              <td className="log-user">
                {log.user_id ? (
                  <span className="user-badge">{log.user_id}</span>
                ) : (
                  <span className="system-badge">系统</span>
                )}
              </td>
              <td className="log-action">{log.action}</td>
              <td className="log-ip">{log.ip || '-'}</td>
              <td className="log-details-btn">
                <button className="btn btn-small btn-secondary" onClick={(e) => {
                  e.stopPropagation();
                  onViewDetails(log);
                }}>
                  查看
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default LogList;
