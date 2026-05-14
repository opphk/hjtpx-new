import React, { useState, useEffect } from 'react';
import Button from './ui/Button';
import Loading from './ui/Loading';

const SystemConfig = ({ onSuccess, onError }) => {
  const [config, setConfig] = useState({
    site_name: 'HJTPX',
    site_url: 'http://localhost:3000',
    maintenance_mode: false,
    max_users: 1000,
    session_timeout: 3600,
    api_rate_limit: 100,
    log_level: 'info',
    log_retention_days: 30,
    cache_enabled: true,
    cache_ttl: 300,
    upload_max_size: 10485760,
    allowed_file_types: '.jpg,.png,.pdf,.doc,.docx',
    email_verification_required: true,
    password_min_length: 6
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/v1/admin/settings/system', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setConfig(data.config || config);
      }
    } catch (err) {
      console.error('Failed to fetch config:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (key, value) => {
    setConfig(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/v1/admin/settings/system', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(config)
      });

      if (response.ok) {
        onSuccess('系统配置已保存');
      } else {
        const errorData = await response.json();
        onError(errorData.error || '保存失败');
      }
    } catch (err) {
      onError('网络错误，请稍后重试');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Loading text="加载配置..." />;
  }

  return (
    <div className="config-section">
      <div className="config-card">
        <h3>基本信息</h3>
        <div className="config-form">
          <div className="form-group">
            <label className="form-label">网站名称</label>
            <input
              type="text"
              value={config.site_name}
              onChange={(e) => handleChange('site_name', e.target.value)}
              className="form-input"
            />
          </div>
          <div className="form-group">
            <label className="form-label">网站URL</label>
            <input
              type="url"
              value={config.site_url}
              onChange={(e) => handleChange('site_url', e.target.value)}
              className="form-input"
            />
          </div>
          <div className="config-item">
            <div className="config-item-info">
              <span className="config-item-label">维护模式</span>
              <span className="config-item-desc">启用后普通用户无法访问</span>
            </div>
            <button
              className={`toggle-switch ${config.maintenance_mode ? 'active' : ''}`}
              onClick={() => handleChange('maintenance_mode', !config.maintenance_mode)}
            >
              <span className="toggle-slider"></span>
            </button>
          </div>
        </div>
      </div>

      <div className="config-card">
        <h3>用户设置</h3>
        <div className="config-form">
          <div className="form-group">
            <label className="form-label">最大用户数</label>
            <input
              type="number"
              value={config.max_users}
              onChange={(e) => handleChange('max_users', parseInt(e.target.value))}
              className="form-input"
              min="1"
            />
          </div>
          <div className="form-group">
            <label className="form-label">会话超时 (秒)</label>
            <input
              type="number"
              value={config.session_timeout}
              onChange={(e) => handleChange('session_timeout', parseInt(e.target.value))}
              className="form-input"
              min="60"
            />
          </div>
          <div className="form-group">
            <label className="form-label">密码最小长度</label>
            <input
              type="number"
              value={config.password_min_length}
              onChange={(e) => handleChange('password_min_length', parseInt(e.target.value))}
              className="form-input"
              min="6"
            />
          </div>
          <div className="config-item">
            <div className="config-item-info">
              <span className="config-item-label">邮箱验证</span>
              <span className="config-item-desc">注册时需要邮箱验证</span>
            </div>
            <button
              className={`toggle-switch ${config.email_verification_required ? 'active' : ''}`}
              onClick={() => handleChange('email_verification_required', !config.email_verification_required)}
            >
              <span className="toggle-slider"></span>
            </button>
          </div>
        </div>
      </div>

      <div className="config-card">
        <h3>API 设置</h3>
        <div className="config-form">
          <div className="form-group">
            <label className="form-label">API 速率限制 (请求/分钟)</label>
            <input
              type="number"
              value={config.api_rate_limit}
              onChange={(e) => handleChange('api_rate_limit', parseInt(e.target.value))}
              className="form-input"
              min="1"
            />
          </div>
        </div>
      </div>

      <div className="config-card">
        <h3>日志设置</h3>
        <div className="config-form">
          <div className="form-group">
            <label className="form-label">日志级别</label>
            <select
              value={config.log_level}
              onChange={(e) => handleChange('log_level', e.target.value)}
              className="form-select"
            >
              <option value="error">Error</option>
              <option value="warn">Warn</option>
              <option value="info">Info</option>
              <option value="debug">Debug</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">日志保留天数</label>
            <input
              type="number"
              value={config.log_retention_days}
              onChange={(e) => handleChange('log_retention_days', parseInt(e.target.value))}
              className="form-input"
              min="1"
            />
          </div>
        </div>
      </div>

      <div className="config-card">
        <h3>缓存设置</h3>
        <div className="config-form">
          <div className="config-item">
            <div className="config-item-info">
              <span className="config-item-label">启用缓存</span>
              <span className="config-item-desc">启用系统缓存提高性能</span>
            </div>
            <button
              className={`toggle-switch ${config.cache_enabled ? 'active' : ''}`}
              onClick={() => handleChange('cache_enabled', !config.cache_enabled)}
            >
              <span className="toggle-slider"></span>
            </button>
          </div>
          <div className="form-group">
            <label className="form-label">缓存 TTL (秒)</label>
            <input
              type="number"
              value={config.cache_ttl}
              onChange={(e) => handleChange('cache_ttl', parseInt(e.target.value))}
              className="form-input"
              min="60"
              disabled={!config.cache_enabled}
            />
          </div>
        </div>
      </div>

      <div className="config-card">
        <h3>文件上传设置</h3>
        <div className="config-form">
          <div className="form-group">
            <label className="form-label">最大文件大小 (字节)</label>
            <input
              type="number"
              value={config.upload_max_size}
              onChange={(e) => handleChange('upload_max_size', parseInt(e.target.value))}
              className="form-input"
              min="1024"
            />
          </div>
          <div className="form-group">
            <label className="form-label">允许的文件类型</label>
            <input
              type="text"
              value={config.allowed_file_types}
              onChange={(e) => handleChange('allowed_file_types', e.target.value)}
              className="form-input"
              placeholder=".jpg,.png,.pdf"
            />
          </div>
        </div>
      </div>

      <div className="config-actions">
        <Button
          variant="primary"
          onClick={handleSave}
          loading={saving}
        >
          保存配置
        </Button>
      </div>
    </div>
  );
};

export default SystemConfig;
