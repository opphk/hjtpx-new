require('dotenv').config();

const http = require('http');

const compression = require('compression');
const express = require('express');

const app = express();

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

const { corsMiddleware } = require('./backend/middleware/cors');
const errorHandler = require('./backend/middleware/errorHandler');
const { logger, logError } = require('./backend/middleware/logger');
const { performanceMiddleware } = require('./backend/middleware/performanceMonitor');
const { ipRateLimiter } = require('./backend/middleware/rateLimiter');
const responseFormatter = require('./backend/middleware/responseFormatter');
const v1Routes = require('./backend/routes/v1');
const websocketService = require('./backend/services/websocketService');

app.use((req, res, next) => {
  req.requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  res.setHeader('X-Request-ID', req.requestId);
  next();
});

app.use(
  compression({
    level: 6,
    threshold: 1024,
    filter: (req, res) => {
      if (req.headers['x-no-compression']) {
        return false;
      }
      return compression.filter(req, res);
    }
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(corsMiddleware);
app.use(performanceMiddleware);
app.use(logger);
app.use(responseFormatter);

app.use(ipRateLimiter);

app.get('/', (req, res) => {
  res.json({
    success: true,
    data: {
      message: 'Welcome to HJTPX API',
      version: '1.0.0',
      status: 'running',
      timestamp: new Date().toISOString(),
      documentation: '/api/v1',
      healthCheck: '/api/v1/health'
    }
  });
});

app.use('/api/v1', v1Routes);

app.use((req, res) => {
  res.notFound(`Route ${req.method} ${req.path} not found`);
});

app.use((err, req, res, next) => {
  logError(err, req, {
    context: 'Global error handler',
    environment: NODE_ENV
  });

  if (err.type === 'entity.parse.failed') {
    return res.badRequest('Invalid JSON payload');
  }

  if (err.name === 'ValidationError') {
    return res.badRequest(err.message);
  }

  res.error(
    NODE_ENV === 'production' ? 'Internal server error' : err.message,
    err.statusCode || 500,
    err.code || 'INTERNAL_ERROR',
    NODE_ENV === 'production' ? undefined : { stack: err.stack }
  );
});

app.use(errorHandler);

const server = app.listen(PORT, () => {
  console.log('🚀 HJTPX API Server');
  console.log('========================================');
  console.log(`Environment: ${NODE_ENV}`);
  console.log(`Port: ${PORT}`);
  console.log(`API Version: v1`);
  console.log(`Health Check: http://localhost:${PORT}/api/v1/health`);
  console.log(`Detailed Health: http://localhost:${PORT}/api/v1/health/detailed`);
  console.log('========================================\n');
});

websocketService.initialize(server);
console.log('✅ WebSocket service initialized');

const gracefulShutdown = signal => {
  console.log(`${signal} signal received: closing HTTP server`);
  websocketService.close();
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason, promise) => {
  logError(new Error(reason), null, { context: 'Unhandled Rejection' });
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', error => {
  logError(error, null, { context: 'Uncaught Exception' });
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

module.exports = app;
