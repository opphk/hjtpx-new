const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const serviceDiscovery = require('./serviceDiscovery');
const loadBalancer = require('./loadBalancer');

class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.successThreshold = options.successThreshold || 2;
    this.timeout = options.timeout || 60000;
    this.state = 'CLOSED';
    this.failures = 0;
    this.successes = 0;
    this.nextAttempt = Date.now();
    this.halfOpenRequests = 0;
    this.halfOpenMaxRequests = options.halfOpenMaxRequests || 3;
  }

  async execute(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is OPEN');
      }
      this.state = 'HALF_OPEN';
      this.halfOpenRequests = 0;
    }

    if (this.state === 'HALF_OPEN') {
      if (this.halfOpenRequests >= this.halfOpenMaxRequests) {
        throw new Error('Circuit breaker is testing, please wait');
      }
      this.halfOpenRequests++;
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    this.failures = 0;

    if (this.state === 'HALF_OPEN') {
      this.successes++;
      if (this.successes >= this.successThreshold) {
        this.state = 'CLOSED';
        this.successes = 0;
      }
    }
  }

  onFailure() {
    this.failures++;
    this.successes = 0;

    if (this.state === 'HALF_OPEN') {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.timeout;
    } else if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.timeout;
    }
  }

  getState() {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      nextAttempt: this.nextAttempt,
      halfOpenRequests: this.halfOpenRequests
    };
  }

  reset() {
    this.state = 'CLOSED';
    this.failures = 0;
    this.successes = 0;
    this.nextAttempt = Date.now();
    this.halfOpenRequests = 0;
  }
}

class ApiGateway {
  constructor(options = {}) {
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = new Server(this.server, {
      cors: {
        origin: options.corsOrigin || '*',
        methods: ['GET', 'POST']
      }
    });

    this.port = options.port || 3000;
    this.services = new Map();
    this.routes = new Map();
    this.middleware = [];
    this.rateLimits = new Map();
    this.circuitBreakers = new Map();
    this.serviceDiscovery = serviceDiscovery;
    this.loadBalancer = loadBalancer;

    this.setupDefaultMiddleware();
    this.setupHealthCheck();
    this.setupWebSocket();
    this.setupServiceDiscovery();
  }

  setupDefaultMiddleware() {
    this.app.use(helmet({
      contentSecurityPolicy: false
    }));

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
        console.log(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
      });
      next();
    });

    this.app.use((req, res, next) => {
      req.requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      res.setHeader('X-Request-ID', req.requestId);
      next();
    });
  }

  setupServiceDiscovery() {
    this.serviceDiscovery.on('service:registered', (service) => {
      console.log(`Service discovered: ${service.name}`);
      this.registerCircuitBreaker(service.name);
    });

    this.serviceDiscovery.on('service:unhealthy', ({ service }) => {
      console.warn(`Service unhealthy: ${service.name}`);
      const cb = this.circuitBreakers.get(service.name);
      if (cb) {
        cb.onFailure();
      }
    });

    this.serviceDiscovery.on('service:failed', ({ service }) => {
      console.error(`Service failed: ${service.name}`);
    });
  }

  registerCircuitBreaker(serviceName) {
    if (!this.circuitBreakers.has(serviceName)) {
      this.circuitBreakers.set(serviceName, new CircuitBreaker({
        failureThreshold: 5,
        successThreshold: 2,
        timeout: 30000
      }));
    }
  }

  getCircuitBreaker(serviceName) {
    return this.circuitBreakers.get(serviceName);
  }

  setupHealthCheck() {
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: this.getServiceStatus(),
        uptime: process.uptime()
      });
    });

    this.app.get('/ready', (req, res) => {
      const healthyServices = Array.from(this.services.values())
        .filter(s => s.status === 'healthy');

      if (healthyServices.length === 0) {
        return res.status(503).json({
          status: 'not ready',
          message: 'No services available'
        });
      }

      res.json({
        status: 'ready',
        services: healthyServices.length
      });
    });

    this.app.get('/circuit-breakers', (req, res) => {
      const breakers = {};
      for (const [name, breaker] of this.circuitBreakers) {
        breakers[name] = breaker.getState();
      }
      res.json(breakers);
    });

    this.app.get('/discovery/stats', (req, res) => {
      res.json(this.serviceDiscovery.getDiscoveryStats());
    });
  }

  setupWebSocket() {
    this.io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);

      socket.on('service:register', (data) => {
        this.registerService(data);
        socket.emit('service:registered', { success: true });
      });

      socket.on('service:heartbeat', (data) => {
        this.updateServiceHealth(data.serviceId, 'healthy');
      });

      socket.on('discover', async (data) => {
        const service = this.serviceDiscovery.discoverService(data.name, data.options);
        socket.emit('discovery:result', { service });
      });

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
      });
    });
  }

  registerService(serviceConfig) {
    const { name, url, healthCheck } = serviceConfig;

    const service = {
      id: serviceConfig.serviceId || name,
      name,
      url,
      healthCheck,
      status: 'unknown',
      lastCheck: null,
      requestCount: 0,
      avgResponseTime: 0,
      consecutiveFailures: 0
    };

    this.services.set(name, service);
    console.log(`Service registered: ${name} at ${url}`);

    this.registerCircuitBreaker(name);

    const registeredId = this.serviceDiscovery.registerService({
      name,
      version: serviceConfig.version || '1.0.0',
      url,
      metadata: { gateway: true }
    });

    this.loadBalancer.addService(registeredId, {
      name,
      url,
      status: 'healthy'
    }, serviceConfig.weight || 1);

    if (healthCheck) {
      this.startHealthCheck(name);
    }

    return service;
  }

  startHealthCheck(serviceName) {
    const checkInterval = setInterval(async () => {
      const service = this.services.get(serviceName);
      if (!service) {
        clearInterval(checkInterval);
        return;
      }

      try {
        const start = Date.now();
        const response = await fetch(`${service.url}${service.healthCheck}`);
        const duration = Date.now() - start;

        if (response.ok) {
          service.status = 'healthy';
          service.lastCheck = new Date().toISOString();
          service.consecutiveFailures = 0;
          service.avgResponseTime = (service.avgResponseTime + duration) / 2;

          const cb = this.circuitBreakers.get(serviceName);
          if (cb && cb.state === 'HALF_OPEN') {
            cb.onSuccess();
          }
        } else {
          service.status = 'unhealthy';
          service.consecutiveFailures++;
          this.handleFailure(serviceName);
        }
      } catch (error) {
        service.status = 'down';
        service.consecutiveFailures++;
        console.error(`Health check failed for ${serviceName}:`, error.message);
        this.handleFailure(serviceName);
      }

      if (service.consecutiveFailures >= 3) {
        this.notifyServiceFailure(service);
      }
    }, 30000);
  }

  handleFailure(serviceName) {
    const cb = this.circuitBreakers.get(serviceName);
    if (cb) {
      cb.onFailure();
    }
  }

  handleSuccess(serviceName) {
    const cb = this.circuitBreakers.get(serviceName);
    if (cb) {
      cb.onSuccess();
    }
  }

  updateServiceHealth(serviceId, status) {
    const service = this.services.get(serviceId);
    if (service) {
      service.status = status;
      service.lastCheck = new Date().toISOString();
    }
  }

  notifyServiceFailure(service) {
    console.error(`Service ${service.name} is failing!`);

    this.io.emit('service:failure', {
      service: service.name,
      failures: service.consecutiveFailures,
      timestamp: new Date().toISOString()
    });
  }

  getServiceStatus() {
    const status = {};
    for (const [name, service] of this.services) {
      const cb = this.circuitBreakers.get(name);
      status[name] = {
        status: service.status,
        url: service.url,
        lastCheck: service.lastCheck,
        avgResponseTime: service.avgResponseTime,
        circuitBreaker: cb ? cb.getState().state : 'N/A'
      };
    }
    return status;
  }

  route(method, path, serviceName, servicePath) {
    const key = `${method}:${path}`;
    this.routes.set(key, { serviceName, servicePath });
    return this;
  }

  proxyRequest(req, res, serviceName, servicePath) {
    const service = this.services.get(serviceName);
    const cb = this.circuitBreakers.get(serviceName);

    if (!service || service.status === 'down') {
      return res.status(503).json({
        success: false,
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: `Service ${serviceName} is not available`
        }
      });
    }

    if (cb && cb.state === 'OPEN') {
      return res.status(503).json({
        success: false,
        error: {
          code: 'CIRCUIT_OPEN',
          message: `Circuit breaker is open for ${serviceName}`
        }
      });
    }

    const targetPath = servicePath || req.path;
    const targetUrl = `${service.url}${targetPath}${req.url.includes('?') ? req.url.substring(req.path.length) : ''}`;

    service.requestCount++;

    const proxyReq = http.request(targetUrl, {
      method: req.method,
      headers: {
        ...req.headers,
        host: new URL(service.url).host
      }
    }, (proxyRes) => {
      res.status(proxyRes.statusCode);
      proxyRes.headers['x-gateway-service'] = serviceName;
      Object.entries(proxyRes.headers).forEach(([key, value]) => {
        res.setHeader(key, value);
      });
      proxyRes.pipe(res);
      this.handleSuccess(serviceName);
    });

    proxyReq.on('error', (error) => {
      console.error(`Proxy error for ${serviceName}:`, error.message);
      service.consecutiveFailures++;
      this.handleFailure(serviceName);
      res.status(502).json({
        success: false,
        error: {
          code: 'BAD_GATEWAY',
          message: `Error connecting to ${serviceName}`
        }
      });
    });

    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      req.pipe(proxyReq);
    } else {
      proxyReq.end();
    }
  }

  use(middleware) {
    this.middleware.push(middleware);
    return this;
  }

  applyMiddleware() {
    for (const mw of this.middleware) {
      this.app.use(mw);
    }
  }

  createRouteHandler(method, path, serviceName, servicePath) {
    return (req, res) => {
      this.proxyRequest(req, res, serviceName, servicePath);
    };
  }

  async start() {
    this.applyMiddleware();

    for (const [key, route] of this.routes) {
      const [method, path] = key.split(':');
      this.app[method.toLowerCase()](path, this.createRouteHandler(method, path, route.serviceName, route.servicePath));
    }

    this.app.use((req, res) => {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Route ${req.method} ${req.path} not found`
        }
      });
    });

    return new Promise((resolve) => {
      this.server.listen(this.port, () => {
        console.log(`API Gateway running on port ${this.port}`);
        resolve(this);
      });
    });
  }

  stop() {
    this.server.close();
    this.io.close();
  }
}

module.exports = ApiGateway;
module.exports.CircuitBreaker = CircuitBreaker;
