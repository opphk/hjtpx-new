const express = require('express');
const router = express.Router();
const { CaptchaType, CaptchaXClient } = require('../captchax-client');

const captchaXClient = new CaptchaXClient({
  apiKey: process.env.CAPTCHAX_API_KEY,
  apiSecret: process.env.CAPTCHAX_API_SECRET,
  environment: process.env.NODE_ENV !== 'production' ? 'development' : 'production',
  devApiUrl: 'http://localhost:3000',
  prodApiUrl: 'https://captchax.example.com'
});

router.post('/create', async (req, res) => {
  try {
    const { shop, type, options } = req.body;
    
    if (!shop) {
      return res.status(400).json({ error: 'Shop parameter is required' });
    }

    const validTypes = Object.values(CaptchaType);
    if (type && !validTypes.includes(type)) {
      return res.status(400).json({ 
        error: 'Invalid captcha type',
        validTypes 
      });
    }

    const captchaType = type || CaptchaType.IMAGE;
    const result = await captchaXClient.createCaptcha(shop, captchaType, options);

    res.json(result);
  } catch (error) {
    console.error('Create captcha error:', error);
    res.status(500).json({ error: 'Failed to create captcha' });
  }
});

router.post('/verify', async (req, res) => {
  try {
    const { token, response } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    const result = await captchaXClient.verify(token, response);
    
    res.json(result);
  } catch (error) {
    console.error('Verify captcha error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

router.get('/types', (req, res) => {
  res.json({
    types: [
      { 
        type: CaptchaType.IMAGE, 
        name: '图像验证码',
        description: '选择包含指定内容的图像',
        icon: 'image'
      },
      { 
        type: CaptchaType.SLIDER, 
        name: '滑块验证码',
        description: '拖动滑块完成拼图',
        icon: 'slider'
      },
      { 
        type: CaptchaType.CONCAT, 
        name: '九宫格验证码',
        description: '按顺序点击图像',
        icon: 'grid'
      },
      { 
        type: CaptchaType.GRID, 
        name: '网格验证码',
        description: '选择符合条件的多个图像',
        icon: 'select'
      },
      { 
        type: CaptchaType.ICON, 
        name: '图标验证码',
        description: '点击所有包含指定图标的图像',
        icon: 'icon'
      },
      { 
        type: CaptchaType.ROTATE, 
        name: '旋转验证码',
        description: '将图像旋转到正确方向',
        icon: 'rotate'
      }
    ]
  });
});

router.post('/verify/batch', async (req, res) => {
  try {
    const { verifications } = req.body;
    
    if (!Array.isArray(verifications)) {
      return res.status(400).json({ error: 'Verifications must be an array' });
    }

    const results = await Promise.all(
      verifications.map(async (v) => {
        const result = await captchaXClient.verify(v.token, v.response);
        return { ...result, id: v.id };
      })
    );

    res.json({ results });
  } catch (error) {
    console.error('Batch verify error:', error);
    res.status(500).json({ error: 'Batch verification failed' });
  }
});

router.get('/stats/:shop', async (req, res) => {
  try {
    const { shop } = req.params;
    const { startDate, endDate } = req.query;

    const stats = await captchaXClient.getStatistics(
      shop,
      startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate ? new Date(endDate) : new Date()
    );

    res.json(stats);
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

module.exports = router;
