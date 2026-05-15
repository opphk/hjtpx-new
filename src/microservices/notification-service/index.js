const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const NotificationService = require('./services/NotificationService');
const notificationRoutes = require('./routes/notificationRoutes');
const db = require('../../config/database/db');
const redisClient = require('../../config/redis/client');

class NotificationServiceApp {
  constructor(options = {}) {
    this.app = express();
    this.port = options.port || 3003;
    this.serviceName = 'notification-service';
    this.pool = db;
    this.redis = redisClient;
    this.notificationService = new NotificationService(this.pool, this.redis, {
      email: {
        host: process.env.SMTP_HOST || 'smtp.example.com',
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      },
      push: {
        firebaseKey: process.env.FIREBASE_SERVER_KEY
      }
    });

    this.setupMiddleware();
    this.setupRoutes();
    this.setupHealthCheck();
  }

  setupMiddleware() {
    this.app.use(helmet({ contentSecurityPolicy: false }));
    this.app.use(cors({
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID']
    }));
    this.app.use(compression({ level: 6 }));
    this.app.use(express.json({ limit: '10mb' }));

    this.app.use((req, res, next) => {
      req.startTime = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - req.startTime;
        console.log(`[${this.serviceName}] ${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
      });
      next();
    });

    this.app.use((req, res, next) => {
      req.requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      res.setHeader('X-Request-ID', req.requestId);
      res.setHeader('X-Service', this.serviceName);
      next();
    });

    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 500,
      message: { success: false, error: { code: 'RATE_LIMIT', message: 'Too many requests' } }
    });
    this.app.use(limiter);
  }

  setupRoutes() {
    this.app.use('/api/notifications', (req, res, next) => {
      req.notificationService = this.notificationService;
      next();
    }, notificationRoutes);
  }

  setupHealthCheck() {
    this.app.get('/health', async (req, res) => {
      try {
        await this.pool.query('SELECT 1');
        const redisStatus = this.redis.status === 'ready' ? 'healthy' : 'unhealthy';

        res.json({
          status: 'healthy',
          service: this.serviceName,
          timestamp: new Date().toISOString(),
          checks: {
            database: 'healthy',
            redis: redisStatus
          }
        });
      } catch (error) {
        res.status(503).json({
          status: 'unhealthy',
          service: this.serviceName,
          timestamp: new Date().toISOString(),
          error: error.message
        });
      }
    });
  }

  async start() {
    return new Promise((resolve) => {
      this.app.listen(this.port, () => {
        console.log(`Notification Service running on port ${this.port}`);
        resolve(this);
      });
    });
  }

  async stop() {
    await this.pool.end();
    await this.redis.quit();
    console.log('Notification Service stopped');
  }
}

const service = new NotificationServiceApp();
service.start().catch(console.error);

module.exports = NotificationServiceApp;
