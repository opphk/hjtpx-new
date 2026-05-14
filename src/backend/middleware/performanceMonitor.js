const performanceMonitor = {
  metrics: {
    requests: [],
    slowRequests: [],
    errors: [],
    endpoints: new Map()
  },
  
  maxMetricsHistory: 1000,
  slowRequestThreshold: parseInt(process.env.SLOW_REQUEST_THRESHOLD) || 3000,

  startTimer() {
    return process.hrtime.bigint();
  },

  endTimer(startTime) {
    const endTime = process.hrtime.bigint();
    return Number(endTime - startTime) / 1000000;
  },

  recordRequest(req, res, duration) {
    const metric = {
      method: req.method,
      path: req.route?.path || req.path,
      statusCode: res.statusCode,
      duration,
      timestamp: new Date().toISOString(),
      requestId: req.requestId
    };

    this.metrics.requests.push(metric);

    if (this.metrics.requests.length > this.maxMetricsHistory) {
      this.metrics.requests.shift();
    }

    if (duration > this.slowRequestThreshold) {
      this.metrics.slowRequests.push(metric);
      if (this.metrics.slowRequests.length > 100) {
        this.metrics.slowRequests.shift();
      }
    }

    const endpointKey = `${req.method}:${req.route?.path || req.path}`;
    if (!this.metrics.endpoints.has(endpointKey)) {
      this.metrics.endpoints.set(endpointKey, {
        count: 0,
        totalDuration: 0,
        avgDuration: 0,
        minDuration: Infinity,
        maxDuration: 0,
        errors: 0
      });
    }

    const endpoint = this.metrics.endpoints.get(endpointKey);
    endpoint.count++;
    endpoint.totalDuration += duration;
    endpoint.avgDuration = endpoint.totalDuration / endpoint.count;
    endpoint.minDuration = Math.min(endpoint.minDuration, duration);
    endpoint.maxDuration = Math.max(endpoint.maxDuration, duration);
    if (res.statusCode >= 400) {
      endpoint.errors++;
    }
  },

  recordError(error, req) {
    const errorMetric = {
      name: error.name,
      message: error.message,
      stack: error.stack,
      method: req.method,
      path: req.path,
      timestamp: new Date().toISOString(),
      requestId: req.requestId
    };

    this.metrics.errors.push(errorMetric);

    if (this.metrics.errors.length > 100) {
      this.metrics.errors.shift();
    }
  },

  getMetrics() {
    const now = Date.now();
    const last24h = new Date(now - 24 * 60 * 60 * 1000);

    const recentRequests = this.metrics.requests.filter(
      r => new Date(r.timestamp) > last24h
    );

    const responseTimes = recentRequests.map(r => r.duration);
    const avgResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 0;

    const statusCodes = recentRequests.reduce((acc, r) => {
      acc[r.statusCode] = (acc[r.statusCode] || 0) + 1;
      return acc;
    }, {});

    const endpointsArray = Array.from(this.metrics.endpoints.entries()).map(
      ([key, value]) => ({ endpoint: key, ...value })
    );

    return {
      summary: {
        totalRequests: this.metrics.requests.length,
        totalSlowRequests: this.metrics.slowRequests.length,
        totalErrors: this.metrics.errors.length,
        requestsLast24h: recentRequests.length,
        avgResponseTime: Math.round(avgResponseTime * 100) / 100,
        p95ResponseTime: this.calculatePercentile(responseTimes, 95),
        p99ResponseTime: this.calculatePercentile(responseTimes, 99)
      },
      statusCodes,
      topSlowEndpoints: endpointsArray
        .filter(e => e.avgDuration > 0)
        .sort((a, b) => b.avgDuration - a.avgDuration)
        .slice(0, 10),
      topErrorEndpoints: endpointsArray
        .filter(e => e.errors > 0)
        .sort((a, b) => b.errors - a.errors)
        .slice(0, 10),
      recentErrors: this.metrics.errors.slice(-10)
    };
  },

  calculatePercentile(values, percentile) {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return Math.round(sorted[index] * 100) / 100;
  },

  getEndpointStats(endpoint) {
    return this.metrics.endpoints.get(endpoint) || null;
  },

  resetMetrics() {
    this.metrics.requests = [];
    this.metrics.slowRequests = [];
    this.metrics.errors = [];
    this.metrics.endpoints.clear();
  },

  healthCheck() {
    return {
      status: 'healthy',
      metricsCount: this.metrics.requests.length,
      slowRequestsCount: this.metrics.slowRequests.length,
      errorsCount: this.metrics.errors.length,
      endpointsCount: this.metrics.endpoints.size,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage()
    };
  }
};

function performanceMiddleware(req, res, next) {
  const startTime = performanceMonitor.startTimer();

  res.on('finish', () => {
    const duration = performanceMonitor.endTimer(startTime);
    performanceMonitor.recordRequest(req, res, duration);

    if (duration > performanceMonitor.slowRequestThreshold) {
      console.warn(`[PERFORMANCE] Slow request: ${req.method} ${req.path} took ${duration.toFixed(2)}ms`);
    }
  });

  req.getPerformanceMetrics = () => {
    return performanceMonitor.getMetrics();
  };

  next();
}

module.exports = {
  performanceMonitor,
  performanceMiddleware
};
