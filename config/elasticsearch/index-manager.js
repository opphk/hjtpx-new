const { esConnection } = require('./connection');
const { INDEX_DEFINITIONS, INDEX_SETTINGS } = require('./indices/mappings');
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
      filename: 'logs/elasticsearch-index-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d'
    })
  ]
});

class IndexManager {
  constructor() {
    this.indices = INDEX_DEFINITIONS;
    this.settings = INDEX_SETTINGS;
  }

  async initializeAllIndices() {
    try {
      await esConnection.connect();
      
      logger.info('Initializing all Elasticsearch indices...');
      
      const results = {};
      
      for (const [indexName, mappings] of Object.entries(this.indices)) {
        try {
          const settings = this.settings[indexName] || {};
          const result = await esConnection.createIndex(indexName, mappings, settings);
          results[indexName] = result;
        } catch (error) {
          logger.error(`Failed to create index ${indexName}:`, error);
          results[indexName] = { success: false, error: error.message };
        }
      }

      logger.info('Index initialization complete', { results });
      return results;
    } catch (error) {
      logger.error('Failed to initialize indices:', error);
      throw error;
    }
  }

  async createIndex(indexName) {
    try {
      await esConnection.connect();
      
      if (!this.indices[indexName]) {
        throw new Error(`Index ${indexName} not found in definitions`);
      }

      const mappings = this.indices[indexName];
      const settings = this.settings[indexName] || {};
      
      return await esConnection.createIndex(indexName, mappings, settings);
    } catch (error) {
      logger.error(`Failed to create index ${indexName}:`, error);
      throw error;
    }
  }

  async deleteIndex(indexName) {
    try {
      await esConnection.connect();
      return await esConnection.deleteIndex(indexName);
    } catch (error) {
      logger.error(`Failed to delete index ${indexName}:`, error);
      throw error;
    }
  }

  async recreateIndex(indexName) {
    try {
      logger.info(`Recreating index ${indexName}...`);
      
      await this.deleteIndex(indexName);
      return await this.createIndex(indexName);
    } catch (error) {
      logger.error(`Failed to recreate index ${indexName}:`, error);
      throw error;
    }
  }

  async updateMapping(indexName, newMappings) {
    try {
      await esConnection.connect();
      
      const client = esConnection.getClient();
      if (!client) {
        throw new Error('Elasticsearch client not available');
      }

      const exists = await esConnection.checkIndex(indexName);
      if (!exists) {
        throw new Error(`Index ${indexName} does not exist`);
      }

      await client.indices.putMapping({
        index: indexName,
        body: newMappings
      });

      logger.info(`Updated mapping for index ${indexName}`);
      return { success: true, message: 'Mapping updated successfully' };
    } catch (error) {
      logger.error(`Failed to update mapping for ${indexName}:`, error);
      throw error;
    }
  }

  async getIndexStats() {
    try {
      await esConnection.connect();
      
      const client = esConnection.getClient();
      if (!client) {
        throw new Error('Elasticsearch client not available');
      }

      const stats = {};
      
      for (const indexName of Object.keys(this.indices)) {
        try {
          const exists = await esConnection.checkIndex(indexName);
          if (exists) {
            const indexStats = await client.indices.stats({ index: indexName });
            const index = indexStats.indices[indexName];
            stats[indexName] = {
              exists: true,
              docsCount: index.primaries.docs.count,
              docsDeleted: index.primaries.docs.deleted,
              storeSize: index.primaries.store.size_in_bytes,
              indexing: index.primaries.indexing,
              search: index.primaries.search
            };
          } else {
            stats[indexName] = { exists: false };
          }
        } catch (error) {
          stats[indexName] = { exists: false, error: error.message };
        }
      }

      return stats;
    } catch (error) {
      logger.error('Failed to get index stats:', error);
      throw error;
    }
  }

  async refreshIndex(indexName) {
    try {
      await esConnection.connect();
      
      const client = esConnection.getClient();
      if (!client) {
        throw new Error('Elasticsearch client not available');
      }

      await client.indices.refresh({ index: indexName });
      logger.info(`Index ${indexName} refreshed`);
      return { success: true };
    } catch (error) {
      logger.error(`Failed to refresh index ${indexName}:`, error);
      throw error;
    }
  }

  async flushIndex(indexName) {
    try {
      await esConnection.connect();
      
      const client = esConnection.getClient();
      if (!client) {
        throw new Error('Elasticsearch client not available');
      }

      await client.indices.flush({ index: indexName });
      logger.info(`Index ${indexName} flushed`);
      return { success: true };
    } catch (error) {
      logger.error(`Failed to flush index ${indexName}:`, error);
      throw error;
    }
  }

  async getIndexAliases() {
    try {
      await esConnection.connect();
      
      const client = esConnection.getClient();
      if (!client) {
        throw new Error('Elasticsearch client not available');
      }

      return await client.indices.getAlias();
    } catch (error) {
      logger.error('Failed to get index aliases:', error);
      throw error;
    }
  }

  async createAlias(indexName, aliasName) {
    try {
      await esConnection.connect();
      
      const client = esConnection.getClient();
      if (!client) {
        throw new Error('Elasticsearch client not available');
      }

      await client.indices.putAlias({
        index: indexName,
        name: aliasName
      });

      logger.info(`Created alias ${aliasName} for index ${indexName}`);
      return { success: true };
    } catch (error) {
      logger.error(`Failed to create alias ${aliasName}:`, error);
      throw error;
    }
  }
}

const indexManager = new IndexManager();

module.exports = {
  IndexManager,
  indexManager
};
