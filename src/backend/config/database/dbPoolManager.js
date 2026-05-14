const { Pool } = require('pg');
const EventEmitter = require('events');

class DatabasePoolManager extends EventEmitter {
  constructor() {
    super();
    this.pool = null;
    this.isProduction = process.env.NODE_ENV === 'production';
    this.config = this._getOptimizedConfig();
    this.stats = {
      queries: 0,
      slowQueries: 0,
      errors: 0,
      avgQueryTime: 0,
      totalQueryTime: 0,
      connectionLeaks: 0,
      connectionLeakEvents: []
    };
    this.queryTimes = [];
    this.slowQueryThreshold = parseInt(process.env.SLOW_QUERY_THRESHOLD) || 100;
    this.checkedOutClients = new Map();
    this.healthCheckInterval = null;
    this.leakCheckInterval = null;
    this.initialized = false;
  }

  _getOptimizedConfig() {
    const baseConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME || 'hjtpx',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      allowExitOnIdle: false
    };

    if (this.isProduction) {
      return {
        ...baseConfig,
        min: parseInt(process.env.DB_POOL_MIN) || 10,
        max: parseInt(process.env.DB_POOL_MAX) || 50,
        idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT) || 60000,
        connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 10000,
        statement_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT) || 60000,
        keepAlive: true,
        keepAliveInitialDelayMillis: 30000
      };
    } else {
      return {
        ...baseConfig,
        min: parseInt(process.env.DB_POOL_MIN) || 2,
        max: parseInt(process.env.DB_POOL_MAX) || 10,
        idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT) || 30000,
        connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 5000,
        statement_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT) || 30000
      };
    }
  }

  initialize() {
    if (this.pool) {
      return this.pool;
    }

    this.pool = new Pool(this.config);

    if (this.isProduction) {
      this.pool.ssl = {
        rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false'
      };
    }

    this._setupEventListeners();
    this._startHealthCheck();
    this._startLeakDetection();
    this.initialized = true;

    console.log('Database pool initialized with optimized configuration');
    return this.pool;
  }

  _setupEventListeners() {
    this.pool.on('error', (err, client) => {
      console.error('Unexpected database pool error:', err);
      this.stats.errors++;
      this.emit('poolError', { error: err, timestamp: new Date().toISOString() });
    });

    this.pool.on('connect', (client) => {
      console.log('New client connected to database pool');
      this.emit('clientConnected', { timestamp: new Date().toISOString() });
    });

    this.pool.on('acquire', (client) => {
      this.emit('clientAcquired', { timestamp: new Date().toISOString() });
    });

    this.pool.on('remove', (client) => {
      console.log('Client removed from pool');
      this.emit('clientRemoved', { timestamp: new Date().toISOString() });
    });
  }

  _startHealthCheck() {
    const interval = parseInt(process.env.DB_HEALTH_CHECK_INTERVAL) || 30000;
    
    this.healthCheckInterval = setInterval(async () => {
      const health = await this.healthCheck();
      this.emit('healthCheck', health);
      
      if (!health.healthy) {
        console.error('Database health check failed:', health.error);
      }
    }, interval);

    this.healthCheckInterval.unref();
  }

  _startLeakDetection() {
    const leakThreshold = parseInt(process.env.DB_LEAK_THRESHOLD) || 30000;
    
    this.leakCheckInterval = setInterval(() => {
      const now = Date.now();
      
      for (const [clientId, { client, checkedOutAt, stackTrace }] of this.checkedOutClients) {
        const duration = now - checkedOutAt;
        
        if (duration > leakThreshold) {
          this.stats.connectionLeaks++;
          const leakEvent = {
            clientId,
            duration,
            stackTrace,
            timestamp: new Date().toISOString()
          };
          this.stats.connectionLeakEvents.push(leakEvent);
          
          if (this.stats.connectionLeakEvents.length > 100) {
            this.stats.connectionLeakEvents.shift();
          }
          
          console.warn(`Potential connection leak detected: client checked out for ${duration}ms`, stackTrace);
          this.emit('connectionLeak', leakEvent);
        }
      }
    }, 10000);

    this.leakCheckInterval.unref();
  }

  async query(text, params, options = {}) {
    const start = Date.now();
    const trackStats = options.trackStats !== false;

    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;

      if (trackStats) {
        this.stats.queries++;
        this.stats.totalQueryTime += duration;
        this.queryTimes.push(duration);

        if (this.queryTimes.length > 1000) {
          this.queryTimes.shift();
        }

        this.stats.avgQueryTime =
          this.queryTimes.reduce((a, b) => a + b, 0) / this.queryTimes.length;

        if (duration > this.slowQueryThreshold) {
          this.stats.slowQueries++;
          console.warn(`Slow query (${duration}ms): ${text.substring(0, 200)}`);
          this.emit('slowQuery', { query: text.substring(0, 500), duration, timestamp: new Date().toISOString() });
        }
      }

      return result;
    } catch (error) {
      this.stats.errors++;
      this.emit('queryError', { error: error.message, query: text.substring(0, 200), timestamp: new Date().toISOString() });
      throw error;
    }
  }

  async getClient() {
    const client = await this.pool.connect();
    const clientId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    const stackTrace = new Error().stack;
    const originalRelease = client.release.bind(client);
    const checkedOutAt = Date.now();

    this.checkedOutClients.set(clientId, { client, checkedOutAt, stackTrace });

    client.release = () => {
      this.checkedOutClients.delete(clientId);
      return originalRelease();
    };

    return client;
  }

  async transaction(callback) {
    const client = await this.getClient();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async batchQuery(queries) {
    const client = await this.getClient();
    try {
      await client.query('BEGIN');
      const results = await Promise.all(
        queries.map(async ({ query, params }) => {
          const result = await client.query(query, params);
          return result.rows;
        })
      );
      await client.query('COMMIT');
      return results;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async healthCheck() {
    const start = Date.now();
    try {
      const [pingResult, statsResult] = await Promise.all([
        this.pool.query('SELECT 1 as health, NOW() as timestamp'),
        this.pool.query('SELECT pg_database_size($1) as db_size', [this.config.database])
      ]);
      
      const duration = Date.now() - start;
      return {
        healthy: true,
        responseTime: duration,
        timestamp: new Date().toISOString(),
        dbTime: pingResult.rows[0].timestamp,
        dbSize: statsResult.rows[0].db_size
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  getPoolStats() {
    if (!this.pool) {
      return { error: 'Pool not initialized' };
    }
    
    return {
      total: this.pool.totalCount,
      idle: this.pool.idleCount,
      busy: this.pool.totalCount - this.pool.idleCount,
      waiting: this.pool.waitingCount,
      checkedOut: this.checkedOutClients.size,
      config: {
        min: this.config.min,
        max: this.config.max
      }
    };
  }

  getQueryStats() {
    const hitRate = this.stats.queries > 0
      ? ((1 - this.stats.slowQueries / this.stats.queries) * 100).toFixed(2) + '%'
      : '100%';
    
    const p95 = this._calculatePercentile(95);
    const p99 = this._calculatePercentile(99);
    
    return {
      ...this.stats,
      avgQueryTime: Math.round(this.stats.avgQueryTime * 100) / 100,
      p95QueryTime: p95,
      p99QueryTime: p99,
      hitRate,
      recentLeakCount: this.stats.connectionLeakEvents.length
    };
  }

  _calculatePercentile(percentile) {
    if (this.queryTimes.length === 0) return 0;
    
    const sorted = [...this.queryTimes].sort((a, b) => a - b);
    const index = Math.ceil(percentile / 100 * sorted.length) - 1;
    return sorted[index] || 0;
  }

  resetStats() {
    this.stats = {
      queries: 0,
      slowQueries: 0,
      errors: 0,
      avgQueryTime: 0,
      totalQueryTime: 0,
      connectionLeaks: 0,
      connectionLeakEvents: []
    };
    this.queryTimes = [];
  }

  async close() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    if (this.leakCheckInterval) {
      clearInterval(this.leakCheckInterval);
    }
    
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.initialized = false;
      console.log('Database pool closed');
    }
  }
}

const dbPoolManager = new DatabasePoolManager();

if (process.env.NODE_ENV !== 'test') {
  dbPoolManager.initialize();
}

module.exports = dbPoolManager;
