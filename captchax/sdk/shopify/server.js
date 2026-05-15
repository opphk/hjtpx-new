require('isomorphic-fetch');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const cookie = require('cookie');

const PORT = process.env.PORT || 3000;
const IS_DEV = process.env.NODE_ENV !== 'production';

const {
  CaptchaType,
  CaptchaXClient,
  VerifyResult
} = require('./server/captchax-client');

class ShopifyCaptchaXApp {
  constructor() {
    this.app = express();
    this.captchaXClient = new CaptchaXClient({
      apiKey: process.env.CAPTCHAX_API_KEY,
      apiSecret: process.env.CAPTCHAX_API_SECRET,
      environment: IS_DEV ? 'development' : 'production',
      devApiUrl: 'http://localhost:3000',
      prodApiUrl: 'https://captchax.example.com'
    });
    
    this.shopConfigs = new Map();
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupWebhooks();
  }

  setupMiddleware() {
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    
    this.app.use((req, res, next) => {
      const shop = req.query.shop;
      if (shop) {
        req.shopifyShop = shop;
      }
      next();
    });

    this.app.use(express.static(path.join(__dirname, 'frontend')));
  }

  setupRoutes() {
    const authRoutes = require('./server/routes/auth');
    const captchaRoutes = require('./server/routes/captcha');
    const adminRoutes = require('./server/routes/admin');
    const apiRoutes = require('./server/routes/api');

    this.app.use('/auth', authRoutes);
    this.app.use('/captcha', captchaRoutes);
    this.app.use('/admin', adminRoutes);
    this.app.use('/api', apiRoutes);

    this.app.get('/health', (req, res) => {
      res.json({ status: 'healthy', timestamp: Date.now() });
    });

    this.app.get('*', (req, res) => {
      if (req.path.startsWith('/admin') || req.path.startsWith('/EmbeddedApp')) {
        return res.sendFile(path.join(__dirname, 'frontend/pages/admin.html'));
      }
      res.sendFile(path.join(__dirname, 'frontend/pages/index.html'));
    });
  }

  setupWebhooks() {
    this.app.post('/webhooks/app-uninstalled', async (req, res) => {
      try {
        const shop = req.body?.shop || req.query.shop;
        if (shop) {
          this.shopConfigs.delete(shop);
          console.log(`App uninstalled from shop: ${shop}`);
        }
        res.status(200).json({ received: true });
      } catch (error) {
        console.error('Webhook error:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
      }
    });

    this.app.post('/webhooks/shop-update', async (req, res) => {
      try {
        const shop = req.body?.shop;
        if (shop) {
          console.log(`Shop updated: ${shop}`);
        }
        res.status(200).json({ received: true });
      } catch (error) {
        console.error('Webhook error:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
      }
    });
  }

  getShopConfig(shop) {
    if (!this.shopConfigs.has(shop)) {
      this.shopConfigs.set(shop, {
        enabled: true,
        captchaTypes: {
          login: { enabled: true, type: CaptchaType.IMAGE },
          register: { enabled: true, type: CaptchaType.SLIDER },
          contact: { enabled: true, type: CaptchaType.IMAGE },
          comment: { enabled: true, type: CaptchaType.IMAGE },
          checkout: { enabled: false, type: CaptchaType.SLIDER },
          password: { enabled: false, type: CaptchaType.IMAGE }
        },
        theme: 'light',
        language: 'zh-CN',
        apiKey: process.env.CAPTCHAX_API_KEY,
        lastUpdated: Date.now()
      });
    }
    return this.shopConfigs.get(shop);
  }

  updateShopConfig(shop, config) {
    const currentConfig = this.getShopConfig(shop);
    const updatedConfig = {
      ...currentConfig,
      ...config,
      lastUpdated: Date.now()
    };
    this.shopConfigs.set(shop, updatedConfig);
    return updatedConfig;
  }

  start() {
    this.app.listen(PORT, () => {
      console.log(`CaptchaX Shopify App running on port ${PORT}`);
      console.log(`Environment: ${IS_DEV ? 'development' : 'production'}`);
      console.log(`CaptchaX API: ${IS_DEV ? 'http://localhost:3000' : 'https://captchax.example.com'}`);
    });
  }
}

if (require.main === module) {
  const app = new ShopifyCaptchaXApp();
  app.start();
}

module.exports = { ShopifyCaptchaXApp };
