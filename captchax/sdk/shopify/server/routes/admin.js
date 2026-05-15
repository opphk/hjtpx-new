const express = require('express');
const router = express.Router();

router.get('/config/:shop', async (req, res) => {
  try {
    const { shop } = req.params;
    
    const config = {
      enabled: true,
      captchaTypes: {
        login: { enabled: true, type: 'image', label: '登录页面' },
        register: { enabled: true, type: 'slider', label: '注册页面' },
        contact: { enabled: true, type: 'image', label: '联系表单' },
        comment: { enabled: true, type: 'image', label: '评论表单' },
        checkout: { enabled: false, type: 'slider', label: '结账页面' },
        password: { enabled: false, type: 'image', label: '密码重置' }
      },
      theme: 'light',
      language: 'zh-CN',
      apiKey: process.env.CAPTCHAX_API_KEY,
      statistics: {
        totalVerifications: 12580,
        successRate: 0.95,
        lastUpdated: new Date().toISOString()
      }
    };

    res.json(config);
  } catch (error) {
    console.error('Get config error:', error);
    res.status(500).json({ error: 'Failed to get configuration' });
  }
});

router.post('/config/:shop', async (req, res) => {
  try {
    const { shop } = req.params;
    const newConfig = req.body;

    const updatedConfig = {
      ...newConfig,
      lastUpdated: new Date().toISOString()
    };

    res.json({ 
      success: true, 
      config: updatedConfig 
    });
  } catch (error) {
    console.error('Update config error:', error);
    res.status(500).json({ error: 'Failed to update configuration' });
  }
});

router.post('/enable/:shop', async (req, res) => {
  try {
    const { shop } = req.params;
    const { page, enabled } = req.body;

    res.json({ 
      success: true,
      message: `${page} 验证码已${enabled ? '启用' : '禁用'}`
    });
  } catch (error) {
    console.error('Toggle enable error:', error);
    res.status(500).json({ error: 'Failed to toggle captcha' });
  }
});

router.get('/dashboard/:shop', async (req, res) => {
  try {
    const { shop } = req.params;

    const dashboard = {
      overview: {
        totalCaptchas: 15847,
        verifiedCaptchas: 15054,
        failedCaptchas: 793,
        successRate: 0.95
      },
      byPage: {
        login: { total: 8000, verified: 7600, failed: 400 },
        register: { total: 3500, verified: 3325, failed: 175 },
        contact: { total: 2000, verified: 1900, failed: 100 },
        comment: { total: 2347, verified: 2229, failed: 118 }
      },
      byType: {
        image: { total: 8000, verified: 7600 },
        slider: { total: 4000, verified: 3800 },
        concat: { total: 3000, verified: 2850 },
        grid: { total: 500, verified: 475 },
        icon: { total: 247, verified: 234 },
        rotate: { total: 100, verified: 95 }
      },
      trends: [
        { date: '2024-01-01', verifications: 500, successRate: 0.94 },
        { date: '2024-01-02', verifications: 520, successRate: 0.95 },
        { date: '2024-01-03', verifications: 480, successRate: 0.93 },
        { date: '2024-01-04', verifications: 550, successRate: 0.96 },
        { date: '2024-01-05', verifications: 510, successRate: 0.95 }
      ]
    };

    res.json(dashboard);
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({ error: 'Failed to get dashboard data' });
  }
});

router.get('/settings/:shop', async (req, res) => {
  try {
    const { shop } = req.params;

    const settings = {
      general: {
        enabled: true,
        apiKey: process.env.CAPTCHAX_API_KEY || '',
        environment: process.env.NODE_ENV !== 'production' ? 'development' : 'production'
      },
      appearance: {
        theme: 'light',
        language: 'zh-CN',
        position: 'bottom-right',
        customCSS: ''
      },
      advanced: {
        timeout: 300000,
        retryAttempts: 3,
        autoVerify: false,
        logLevel: 'info'
      }
    };

    res.json(settings);
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Failed to get settings' });
  }
});

router.post('/settings/:shop', async (req, res) => {
  try {
    const { shop } = req.params;
    const settings = req.body;

    res.json({ 
      success: true, 
      settings 
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

module.exports = router;
