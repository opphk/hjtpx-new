import React, { useState, useEffect } from 'react';
import Button from './ui/Button';
import Loading from './ui/Loading';

const FeatureFlags = ({ onSuccess, onError }) => {
  const [features, setFeatures] = useState({
    dark_mode: { enabled: true, description: '深色模式主题' },
    social_login: { enabled: false, description: '社交媒体登录' },
    two_factor_auth: { enabled: true, description: '两步验证' },
    api_access: { enabled: true, description: '开放API访问' },
    file_sharing: { enabled: true, description: '文件分享功能' },
    comments: { enabled: true, description: '评论功能' },
    notifications: { enabled: true, description: '通知系统' },
    analytics: { enabled: false, description: '数据分析功能' },
    export_csv: { enabled: true, description: 'CSV导出功能' },
    export_json: { enabled: true, description: 'JSON导出功能' },
    export_excel: { enabled: false, description: 'Excel导出功能' },
    import_csv: { enabled: true, description: 'CSV导入功能' },
    import_json: { enabled: true, description: 'JSON导入功能' },
    webhooks: { enabled: false, description: 'Webhook集成' },
    api_docs: { enabled: true, description: 'API文档访问' },
    realtime_updates: { enabled: true, description: '实时数据更新' }
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchFeatures();
  }, []);

  const fetchFeatures = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/v1/admin/settings/features', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.features) {
          setFeatures(data.features);
        }
      }
    } catch (err) {
      console.error('Failed to fetch features:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (key) => {
    setFeatures(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        enabled: !prev[key].enabled
      }
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/v1/admin/settings/features', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ features })
      });

      if (response.ok) {
        onSuccess('功能开关配置已保存');
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

  const getCategoryIcon = (category) => {
    const icons = {
      appearance: '🎨',
      auth: '🔐',
      api: '🔌',
      features: '⚡',
      export: '📤',
      import: '📥',
      integration: '🔗'
    };
    return icons[category] || '⚙️';
  };

  const categorizedFeatures = {
    appearance: ['dark_mode'],
    auth: ['social_login', 'two_factor_auth'],
    api: ['api_access', 'api_docs', 'webhooks'],
    features: ['file_sharing', 'comments', 'notifications', 'analytics', 'realtime_updates'],
    export: ['export_csv', 'export_json', 'export_excel'],
    import: ['import_csv', 'import_json']
  };

  const categoryNames = {
    appearance: '外观',
    auth: '认证',
    api: 'API',
    features: '功能',
    export: '导出',
    import: '导入'
  };

  if (loading) {
    return <Loading text="加载功能开关..." />;
  }

  return (
    <div className="config-section">
      {Object.entries(categorizedFeatures).map(([category, featureKeys]) => (
        <div key={category} className="config-card">
          <h3>
            {getCategoryIcon(category)} {categoryNames[category]}
          </h3>
          <div className="feature-list">
            {featureKeys.map(key => {
              const feature = features[key];
              if (!feature) return null;
              return (
                <div key={key} className="config-item">
                  <div className="config-item-info">
                    <span className="config-item-label">
                      {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                    <span className="config-item-desc">{feature.description}</span>
                  </div>
                  <button
                    className={`toggle-switch ${feature.enabled ? 'active' : ''}`}
                    onClick={() => handleToggle(key)}
                  >
                    <span className="toggle-slider"></span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ))}

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

export default FeatureFlags;
