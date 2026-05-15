const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const AuthService = require('./services/AuthService');
const authRoutes = require('./routes/authRoutes');
const db = require('../../config/database/db');
const redisClient = require('../../config/redis/client');

class AuthServiceApp {
  constructor(options = {}) {
    this.app = express();
    this.port = options.port || 3002;
    this.serviceName = 'auth-service';
    this.pool = db;
    this.redis = redisClient;
    this.authService = new AuthService(this.pool, this.redis, {
      jwtSecret: process.env.JWT_SECRET || 'auth-service-secret-key',
      jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
      refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
      oauth: {
        google: {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: process.env.GOOGLE_CALLBACK_URL
        },
        github: {
          clientID: process.env.GITHUB_CLIENT_ID,
          clientSecret: process.env.GITHUB_CLIENT_SECRET,
          callbackURL: process.env.GITHUB_CALLBACK_URL
        }
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
      max: 100,
      message: { success: false, error: { code: 'RATE_LIMIT', message: 'Too many requests' } }
    });
    this.app.use('/api/auth/login', limiter);
    this.app.use('/api/auth/register', limiter);
  }

  setupRoutes() {
    this.app.use('/api/auth', (req, res, next) => {
      req.authService = this.authService;
      next();
    }, authRoutes);
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
        console.log(`Auth Service running on port ${this.port}`);
        resolve(this);
      });
    });
  }

  async stop() {
    await this.pool.end();
    await this.redis.quit();
    console.log('Auth Service stopped');
  }
}

const service = new AuthServiceApp();
service.start().catch(console.error);

module.exports = AuthServiceApp;
