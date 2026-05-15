const { Pool } = require('pg');
const { createClient } = require('redis');
const logger = require('../../backend/utils/logger');

const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/hjtpx',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => {
  logger.error('Redis Client Error', err);
});

pgPool.on('error', (err) => {
  logger.error('Unexpected error on idle client', err);
});

const query = async (text, params) => {
  const start = Date.now();
  try {
    const result = await pgPool.query(text, params);
    const duration = Date.now() - start;
    logger.debug('Executed query', { text, duration, rows: result.rowCount });
    return result;
  } catch (error) {
    logger.error('Query error', { text, error: error.message });
    throw error;
  }
};

const getClient = async () => {
  const client = await pgPool.connect();
  const originalQuery = client.query.bind(client);
  const originalRelease = client.release.bind(client);

  const timeout = setTimeout(() => {
    logger.error('Client has been checked out for more than 30 seconds!');
  }, 30000);

  client.query = (...args) => {
    return originalQuery(...args);
  };

  client.release = () => {
    clearTimeout(timeout);
    return originalRelease();
  };

  return client;
};

const transaction = async (callback) => {
  const client = await getClient();
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
};

const healthCheck = async () => {
  try {
    await query('SELECT 1');
    return { status: 'healthy', timestamp: new Date().toISOString() };
  } catch (error) {
    return { status: 'unhealthy', error: error.message, timestamp: new Date().toISOString() };
  }
};

const getPoolStats = () => {
  return {
    total: pgPool.totalCount,
    idle: pgPool.idleCount,
    waiting: pgPool.waitingCount,
    capacityUsage: pgPool.totalCount > 0 ? (pgPool.idleCount / pgPool.totalCount) * 100 : 0,
    config: {
      min: 0,
      max: pgPool.options.max
    }
  };
};

const close = async () => {
  try {
    await pgPool.end();
    await redisClient.quit();
    logger.info('Database connections closed');
  } catch (error) {
    logger.error('Error closing database connections', error);
    throw error;
  }
};

module.exports = {
  query,
  getClient,
  transaction,
  healthCheck,
  getPoolStats,
  close,
  pool: pgPool,
  redis: redisClient
};
