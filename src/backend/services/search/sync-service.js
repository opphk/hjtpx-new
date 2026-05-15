const { Pool } = require('pg');
const { esConnection } = require('../../config/elasticsearch/connection');
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.DailyRotateFile({
      filename: 'logs/sync-service-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d'
    })
  ]
});

class SyncService {
  constructor() {
    this.pool = null;
    this.batchSize = parseInt(process.env.SYNC_BATCH_SIZE || '1000');
    this.syncInterval = parseInt(process.env.SYNC_INTERVAL || '60000');
    this.running = false;
    this.syncTimers = {};
  }

  async initialize() {
    try {
      this.pool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || 'hjtpx',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD,
        max: parseInt(process.env.DB_POOL_SIZE || '20'),
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000
      });

      await this.pool.query('SELECT 1');
      logger.info('PostgreSQL connection initialized for sync service');

      await esConnection.connect();
      logger.info('Elasticsearch connection initialized for sync service');
    } catch (error) {
      logger.error('Failed to initialize sync service:', error);
      throw error;
    }
  }

  async syncUsers(options = {}) {
    const { fullSync = false, since = null, batchSize = this.batchSize } = options;
    
    try {
      logger.info('Starting users sync...', { fullSync, since });

      let query = `
        SELECT 
          id::text,
          email,
          username,
          full_name as "fullName",
          first_name as "firstName",
          last_name as "lastName",
          bio,
          status,
          role,
          roles,
          permissions,
          is_active as "isActive",
          is_verified as "isVerified",
          provider,
          language,
          timezone,
          avatar,
          last_login_at as "lastLoginAt",
          created_at as "createdAt",
          updated_at as "updatedAt",
          deleted_at as "deletedAt"
        FROM users
        WHERE 1=1
      `;

      const params = [];

      if (!fullSync && since) {
        query += ` AND updated_at > $1`;
        params.push(since);
      } else if (!fullSync) {
        const lastSync = await this.getLastSyncTime('users');
        if (lastSync) {
          query += ` AND updated_at > $1`;
          params.push(lastSync);
        }
      }

      query += ` ORDER BY updated_at ASC LIMIT $${params.length + 1}`;
      params.push(batchSize);

      const result = await this.pool.query(query, params);
      const users = result.rows;

      if (users.length === 0) {
        logger.info('No users to sync');
        return { synced: 0, status: 'no_data' };
      }

      const client = esConnection.getClient();
      const operations = users.flatMap(user => [
        { index: { _index: 'users', _id: user.id } },
        user
      ]);

      const bulkResult = await client.bulk({ refresh: true, operations });

      if (bulkResult.errors) {
        const errors = bulkResult.items.filter(item => item.index?.error);
        logger.error('Bulk sync errors for users:', errors);
        return { synced: users.length - errors.length, errors: errors.length, status: 'partial' };
      }

      await this.updateLastSyncTime('users', new Date());

      logger.info(`Synced ${users.length} users to Elasticsearch`);
      return { synced: users.length, status: 'success' };
    } catch (error) {
      logger.error('Failed to sync users:', error);
      throw error;
    }
  }

  async syncContent(options = {}) {
    const { fullSync = false, since = null, batchSize = this.batchSize, contentType = null } = options;

    try {
      logger.info('Starting content sync...', { fullSync, since, contentType });

      let query = `
        SELECT 
          id::text,
          type,
          title,
          content,
          excerpt,
          summary,
          author_id as "authorId",
          author_name as "authorName",
          tags,
          categories,
          status,
          visibility,
          views,
          likes,
          comments,
          shares,
          rating,
          featured,
          pinned,
          metadata,
          language,
          created_at as "createdAt",
          updated_at as "updatedAt",
          published_at as "publishedAt",
          deleted_at as "deletedAt"
        FROM content
        WHERE 1=1
      `;

      const params = [];

      if (contentType) {
        query += ` AND type = $${params.length + 1}`;
        params.push(contentType);
      }

      if (!fullSync && since) {
        query += ` AND updated_at > $${params.length + 1}`;
        params.push(since);
      } else if (!fullSync) {
        const lastSync = await this.getLastSyncTime('content');
        if (lastSync) {
          query += ` AND updated_at > $${params.length + 1}`;
          params.push(lastSync);
        }
      }

      query += ` ORDER BY updated_at ASC LIMIT $${params.length + 1}`;
      params.push(batchSize);

      const result = await this.pool.query(query, params);
      const contents = result.rows;

      if (contents.length === 0) {
        logger.info('No content to sync');
        return { synced: 0, status: 'no_data' };
      }

      const client = esConnection.getClient();
      const operations = contents.flatMap(item => [
        { index: { _index: 'content', _id: item.id } },
        item
      ]);

      const bulkResult = await client.bulk({ refresh: true, operations });

      if (bulkResult.errors) {
        const errors = bulkResult.items.filter(item => item.index?.error);
        logger.error('Bulk sync errors for content:', errors);
        return { synced: contents.length - errors.length, errors: errors.length, status: 'partial' };
      }

      await this.updateLastSyncTime('content', new Date());

      logger.info(`Synced ${contents.length} content items to Elasticsearch`);
      return { synced: contents.length, status: 'success' };
    } catch (error) {
      logger.error('Failed to sync content:', error);
      throw error;
    }
  }

  async syncLogs(options = {}) {
    const { fullSync = false, since = null, batchSize = this.batchSize, logType = null } = options;

    try {
      logger.info('Starting logs sync...', { fullSync, since, logType });

      let query = `
        SELECT 
          id::text,
          type,
          level,
          message,
          description,
          user_id as "userId",
          user_name as "userName",
          ip,
          user_agent as "userAgent",
          method,
          path,
          status_code as "statusCode",
          duration,
          error,
          stack,
          metadata,
          request_id as "requestId",
          session_id as "sessionId",
          action,
          resource,
          source,
          environment,
          timestamp,
          created_at as "createdAt"
        FROM logs
        WHERE 1=1
      `;

      const params = [];

      if (logType) {
        query += ` AND type = $${params.length + 1}`;
        params.push(logType);
      }

      if (!fullSync && since) {
        query += ` AND created_at > $${params.length + 1}`;
        params.push(since);
      } else if (!fullSync) {
        const lastSync = await this.getLastSyncTime('logs');
        if (lastSync) {
          query += ` AND created_at > $${params.length + 1}`;
          params.push(lastSync);
        }
      }

      query += ` ORDER BY created_at ASC LIMIT $${params.length + 1}`;
      params.push(batchSize);

      const result = await this.pool.query(query, params);
      const logs = result.rows;

      if (logs.length === 0) {
        logger.info('No logs to sync');
        return { synced: 0, status: 'no_data' };
      }

      const client = esConnection.getClient();
      const operations = logs.flatMap(log => [
        { index: { _index: 'logs', _id: log.id } },
        log
      ]);

      const bulkResult = await client.bulk({ refresh: true, operations });

      if (bulkResult.errors) {
        const errors = bulkResult.items.filter(item => item.index?.error);
        logger.error('Bulk sync errors for logs:', errors);
        return { synced: logs.length - errors.length, errors: errors.length, status: 'partial' };
      }

      await this.updateLastSyncTime('logs', new Date());

      logger.info(`Synced ${logs.length} logs to Elasticsearch`);
      return { synced: logs.length, status: 'success' };
    } catch (error) {
      logger.error('Failed to sync logs:', error);
      throw error;
    }
  }

  async syncNotifications(options = {}) {
    const { fullSync = false, since = null, batchSize = this.batchSize } = options;

    try {
      logger.info('Starting notifications sync...', { fullSync, since });

      let query = `
        SELECT 
          id::text,
          type,
          category,
          priority,
          title,
          message,
          content,
          user_id as "userId",
          target_user_id as "targetUserId",
          sender_id as "senderId",
          sender_name as "senderName",
          read,
          archived,
          dismissed,
          link,
          action_url as "actionUrl",
          image_url as "imageUrl",
          data,
          channels,
          expires_at as "expiresAt",
          created_at as "createdAt",
          read_at as "readAt"
        FROM notifications
        WHERE 1=1
      `;

      const params = [];

      if (!fullSync && since) {
        query += ` AND created_at > $1`;
        params.push(since);
      } else if (!fullSync) {
        const lastSync = await this.getLastSyncTime('notifications');
        if (lastSync) {
          query += ` AND created_at > $1`;
          params.push(lastSync);
        }
      }

      query += ` ORDER BY created_at ASC LIMIT $${params.length + 1}`;
      params.push(batchSize);

      const result = await this.pool.query(query, params);
      const notifications = result.rows;

      if (notifications.length === 0) {
        logger.info('No notifications to sync');
        return { synced: 0, status: 'no_data' };
      }

      const client = esConnection.getClient();
      const operations = notifications.flatMap(notification => [
        { index: { _index: 'notifications', _id: notification.id } },
        notification
      ]);

      const bulkResult = await client.bulk({ refresh: true, operations });

      if (bulkResult.errors) {
        const errors = bulkResult.items.filter(item => item.index?.error);
        logger.error('Bulk sync errors for notifications:', errors);
        return { synced: notifications.length - errors.length, errors: errors.length, status: 'partial' };
      }

      await this.updateLastSyncTime('notifications', new Date());

      logger.info(`Synced ${notifications.length} notifications to Elasticsearch`);
      return { synced: notifications.length, status: 'success' };
    } catch (error) {
      logger.error('Failed to sync notifications:', error);
      throw error;
    }
  }

  async syncAll(options = {}) {
    const { fullSync = false, indices = ['users', 'content', 'logs', 'notifications'] } = options;

    try {
      logger.info('Starting full sync...', { fullSync, indices });

      const results = {};

      for (const index of indices) {
        try {
          switch (index) {
            case 'users':
              results[index] = await this.syncUsers({ fullSync });
              break;
            case 'content':
              results[index] = await this.syncContent({ fullSync });
              break;
            case 'logs':
              results[index] = await this.syncLogs({ fullSync });
              break;
            case 'notifications':
              results[index] = await this.syncNotifications({ fullSync });
              break;
            default:
              logger.warn(`Unknown index: ${index}`);
          }
        } catch (error) {
          logger.error(`Failed to sync ${index}:`, error);
          results[index] = { status: 'error', error: error.message };
        }
      }

      const summary = {
        total: indices.length,
        success: Object.values(results).filter(r => r.status === 'success').length,
        failed: Object.values(results).filter(r => r.status === 'error').length,
        partial: Object.values(results).filter(r => r.status === 'partial').length,
        results
      };

      logger.info('Full sync completed', summary);
      return summary;
    } catch (error) {
      logger.error('Failed to sync all indices:', error);
      throw error;
    }
  }

  async startIncrementalSync(indices = ['users', 'content', 'logs', 'notifications']) {
    if (this.running) {
      logger.warn('Incremental sync already running');
      return;
    }

    this.running = true;
    logger.info('Starting incremental sync service...');

    for (const index of indices) {
      this.scheduleSync(index);
    }
  }

  scheduleSync(index) {
    const interval = this.getSyncInterval(index);

    this.syncTimers[index] = setInterval(async () => {
      try {
        logger.debug(`Running scheduled sync for ${index}`);

        switch (index) {
          case 'users':
            await this.syncUsers();
            break;
          case 'content':
            await this.syncContent();
            break;
          case 'logs':
            await this.syncLogs();
            break;
          case 'notifications':
            await this.syncNotifications();
            break;
        }
      } catch (error) {
        logger.error(`Scheduled sync failed for ${index}:`, error);
      }
    }, interval);

    logger.info(`Scheduled sync for ${index} every ${interval}ms`);
  }

  getSyncInterval(index) {
    switch (index) {
      case 'logs':
        return 30000;
      case 'notifications':
        return 60000;
      case 'content':
        return 120000;
      case 'users':
        return 300000;
      default:
        return this.syncInterval;
    }
  }

  stopIncrementalSync() {
    logger.info('Stopping incremental sync service...');

    for (const [index, timer] of Object.entries(this.syncTimers)) {
      clearInterval(timer);
      logger.info(`Stopped sync for ${index}`);
    }

    this.syncTimers = {};
    this.running = false;
  }

  async getSyncStatus() {
    try {
      const status = {
        running: this.running,
        indices: {}
      };

      for (const index of ['users', 'content', 'logs', 'notifications']) {
        status.indices[index] = {
          lastSync: await this.getLastSyncTime(index),
          nextSync: this.syncTimers[index] ? new Date(Date.now() + this.getSyncInterval(index)) : null
        };
      }

      return status;
    } catch (error) {
      logger.error('Failed to get sync status:', error);
      throw error;
    }
  }

  async getLastSyncTime(index) {
    try {
      const key = `es_sync_last_${index}`;
      const client = esConnection.getClient();
      
      if (!client) return null;

      const result = await client.get({
        index: '_sync_metadata',
        id: key
      });

      return result._source?.timestamp || null;
    } catch (error) {
      return null;
    }
  }

  async updateLastSyncTime(index, timestamp) {
    try {
      const key = `es_sync_last_${index}`;
      const client = esConnection.getClient();
      
      if (!client) return;

      await client.index({
        index: '_sync_metadata',
        id: key,
        body: {
          index,
          timestamp: timestamp.toISOString()
        }
      });
    } catch (error) {
      logger.warn(`Failed to update last sync time for ${index}:`, error);
    }
  }

  async cleanup() {
    this.stopIncrementalSync();

    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }

    await esConnection.disconnect();
    logger.info('SyncService cleanup completed');
  }
}

const syncService = new SyncService();

module.exports = {
  SyncService,
  syncService
};
