const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');

const db = require('../../config/database/db');
const redisClient = require('../../config/redis/client');
const userRoutes = require('./routes/userRoutes');
const UserService = require('./services/UserService');

class UserServiceApp {
  constructor(options = {}) {
    this.app = express();
    this.port = options.port || 3001;
    this.serviceName = 'user-service';
    this.pool = db;
    this.redis = redisClient;
    this.userService = new UserService(this.pool, this.redis);

    this.setupMiddleware();
    this.setupRoutes();
    this.setupHealthCheck();
  }

  setupMiddleware() {
    this.app.use(helmet({ contentSecurityPolicy: false }));
    this.app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] }));
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
      max: 1000,
      message: { success: false, error: { code: 'RATE_LIMIT', message: 'Too many requests' } }
    });
    this.app.use(limiter);
  }

  setupRoutes() {
    this.app.use('/api/users', (req, res, next) => {
      req.userService = this.userService;
      next();
    }, userRoutes);
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
        console.log(`User Service running on port ${this.port}`);
        resolve(this);
      });
    });
  }

  async stop() {
    await this.pool.end();
    await this.redis.quit();
    console.log('User Service stopped');
  }
}

const service = new UserServiceApp();
service.start().catch(console.error);

module.exports = UserServiceApp;
