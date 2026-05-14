import React, { useState } from 'react';
import SystemConfig from '../components/SystemConfig';
import FeatureFlags from '../components/FeatureFlags';
import Alert from '../components/ui/Alert';

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState('system');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleSuccess = (message) => {
    setSuccess(message);
    setError('');
  };

  const handleError = (message) => {
    setError(message);
    setSuccess('');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'system':
        return (
          <SystemConfig
            onSuccess={handleSuccess}
            onError={handleError}
          />
        );
      case 'features':
        return (
          <FeatureFlags
            onSuccess={handleSuccess}
            onError={handleError}
          />
        );
      case 'notifications':
        return (
          <NotificationsConfig
            onSuccess={handleSuccess}
            onError={handleError}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="settings-page">
      <div className="page-header">
        <div>
          <h1>系统设置</h1>
          <p>配置系统参数、功能开关和通知设置</p>
        </div>
      </div>

      {error && (
        <Alert
          type="error"
          message={error}
          closable
          onClose={() => setError('')}
        />
      )}

      {success && (
        <Alert
          type="success"
          message={success}
          closable
          onClose={() => setSuccess('')}
        />
      )}

      <div className="settings-tabs">
        <button
          className={`tab-button ${activeTab === 'system' ? 'active' : ''}`}
          onClick={() => setActiveTab('system')}
        >
          系统配置
        </button>
        <button
          className={`tab-button ${activeTab === 'features' ? 'active' : ''}`}
          onClick={() => setActiveTab('features')}
        >
          功能开关
        </button>
        <button
          className={`tab-button ${activeTab === 'notifications' ? 'active' : ''}`}
          onClick={() => setActiveTab('notifications')}
        >
          通知配置
        </button>
      </div>

      <div className="settings-content">
        {renderContent()}
      </div>
    </div>
  );
};

const NotificationsConfig = ({ onSuccess, onError }) => {
  const [config, setConfig] = useState({
    email_notifications: true,
    push_notifications: true,
    in_app_notifications: true,
    notification_frequency: 'realtime',
    email_for_important: true,
    daily_digest: false,
    weekly_report: false
  });
  const [loading, setLoading] = useState(false);

  const handleToggle = (key) => {
    setConfig(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSelectChange = (key, value) => {
    setConfig(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/v1/admin/settings/notifications', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(config)
      });

      if (response.ok) {
        onSuccess('通知配置已保存');
      } else {
        const errorData = await response.json();
        onError(errorData.error || '保存失败');
      }
    } catch (err) {
      onError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="config-section">
      <div className="config-card">
        <h3>通知渠道</h3>
        <div className="config-item">
          <div className="config-item-info">
            <span className="config-item-label">邮件通知</span>
            <span className="config-item-desc">通过邮件接收系统通知</span>
          </div>
          <button
            className={`toggle-switch ${config.email_notifications ? 'active' : ''}`}
            onClick={() => handleToggle('email_notifications')}
          >
            <span className="toggle-slider"></span>
          </button>
        </div>
        <div className="config-item">
          <div className="config-item-info">
            <span className="config-item-label">推送通知</span>
            <span className="config-item-desc">接收浏览器推送通知</span>
          </div>
          <button
            className={`toggle-switch ${config.push_notifications ? 'active' : ''}`}
            onClick={() => handleToggle('push_notifications')}
          >
            <span className="toggle-slider"></span>
          </button>
        </div>
        <div className="config-item">
          <div className="config-item-info">
            <span className="config-item-label">应用内通知</span>
            <span className="config-item-desc">在应用内显示通知</span>
          </div>
          <button
            className={`toggle-switch ${config.in_app_notifications ? 'active' : ''}`}
            onClick={() => handleToggle('in_app_notifications')}
          >
            <span className="toggle-slider"></span>
          </button>
        </div>
      </div>

      <div className="config-card">
        <h3>通知设置</h3>
        <div className="config-item">
          <div className="config-item-info">
            <span className="config-item-label">通知频率</span>
            <span className="config-item-desc">选择通知接收频率</span>
          </div>
          <select
            value={config.notification_frequency}
            onChange={(e) => handleSelectChange('notification_frequency', e.target.value)}
            className="form-select"
          >
            <option value="realtime">实时</option>
            <option value="hourly">每小时汇总</option>
            <option value="daily">每日汇总</option>
          </select>
        </div>
        <div className="config-item">
          <div className="config-item-info">
            <span className="config-item-label">重要通知邮件</span>
            <span className="config-item-desc">重要事件通过邮件通知</span>
          </div>
          <button
            className={`toggle-switch ${config.email_for_important ? 'active' : ''}`}
            onClick={() => handleToggle('email_for_important')}
          >
            <span className="toggle-slider"></span>
          </button>
        </div>
      </div>

      <div className="config-card">
        <h3>报告设置</h3>
        <div className="config-item">
          <div className="config-item-info">
            <span className="config-item-label">每日摘要</span>
            <span className="config-item-desc">每天发送系统活动摘要</span>
          </div>
          <button
            className={`toggle-switch ${config.daily_digest ? 'active' : ''}`}
            onClick={() => handleToggle('daily_digest')}
          >
            <span className="toggle-slider"></span>
          </button>
        </div>
        <div className="config-item">
          <div className="config-item-info">
            <span className="config-item-label">每周报告</span>
            <span className="config-item-desc">每周发送系统统计报告</span>
          </div>
          <button
            className={`toggle-switch ${config.weekly_report ? 'active' : ''}`}
            onClick={() => handleToggle('weekly_report')}
          >
            <span className="toggle-slider"></span>
          </button>
        </div>
      </div>

      <div className="config-actions">
        <button
          className="btn btn-primary"
          onClick={handleSave}
          disabled={loading}
        >
          {loading ? '保存中...' : '保存配置'}
        </button>
      </div>
    </div>
  );
};

export default SettingsPage;
