const { createClient } = require('redis');

const isProduction = process.env.NODE_ENV === 'production';

let redisClient;

if (isProduction) {
  redisClient = createClient({
    socket: {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      reconnectStrategy: (retries) => {
        if (retries > 20) {
          return new Error('Max retries reached');
        }
        return Math.min(retries * 100, 3000);
      },
      connectTimeout: 10000,
      keepAlive: 30000
    },
    legacyMode: false,
    cache: {
      ttl: 300
    }
  });

  redisClient.on('error', (err) => console.error('Redis Client Error:', err));
  redisClient.on('connect', () => console.log('Redis Client Connected'));
  redisClient.on('ready', () => console.log('Redis Client Ready'));
  redisClient.on('reconnecting', () => console.log('Redis Client Reconnecting'));
  redisClient.on('end', () => console.log('Redis Client Disconnected'));
}

module.exports = redisClient;
