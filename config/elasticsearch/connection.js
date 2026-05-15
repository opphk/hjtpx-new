const { Client } = require('@elastic/elasticsearch');
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
      filename: 'logs/elasticsearch-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d'
    })
  ]
});

class ElasticsearchConnection {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.config = {
      node: process.env.ELASTICSEARCH_NODE || 'http://localhost:9200',
      auth: process.env.ELASTICSEARCH_API_KEY 
        ? { apiKey: process.env.ELASTICSEARCH_API_KEY }
        : {
            username: process.env.ELASTICSEARCH_USERNAME || 'elastic',
            password: process.env.ELASTICSEARCH_PASSWORD || 'changeme'
          },
      tls: {
        rejectUnauthorized: process.env.ELASTICSEARCH_TLS_REJECT_UNAUTHORIZED !== 'false'
      },
      maxRetries: parseInt(process.env.ELASTICSEARCH_MAX_RETRIES || '3'),
      requestTimeout: parseInt(process.env.ELASTICSEARCH_REQUEST_TIMEOUT || '30000'),
      sniffOnStart: process.env.ELASTICSEARCH_SNIFF_ON_START === 'true',
      sniffOnConnectionFault: process.env.ELASTICSEARCH_SNIFF_ON_FAULT === 'true',
      resurrectStrategy: process.env.ELASTICSEARCH_RESURRECT_STRATEGY || 'ping'
    };
  }

  async connect() {
    if (this.client && this.isConnected) {
      return this.client;
    }

    try {
      logger.info('Connecting to Elasticsearch...', { node: this.config.node });

      this.client = new Client(this.config);

      const health = await this.client.cluster.health({});
      
      this.isConnected = true;
      
      logger.info('Elasticsearch connected successfully', {
        clusterName: health.cluster_name,
        status: health.status,
        numberOfNodes: health.number_of_nodes
      });

      this.client.on('error', (error) => {
        logger.error('Elasticsearch client error:', error);
        this.isConnected = false;
      });

      this.client.on('close', () => {
        logger.warn('Elasticsearch connection closed');
        this.isConnected = false;
      });

      return this.client;
    } catch (error) {
      logger.error('Failed to connect to Elasticsearch:', error);
      this.isConnected = false;
      throw error;
    }
  }

  async disconnect() {
    if (this.client) {
      try {
        await this.client.close();
        this.client = null;
        this.isConnected = false;
        logger.info('Elasticsearch disconnected');
      } catch (error) {
        logger.error('Error disconnecting from Elasticsearch:', error);
        throw error;
      }
    }
  }

  async checkHealth() {
    if (!this.client) {
      return { status: 'disconnected', available: false };
    }

    try {
      const health = await this.client.cluster.health({});
      return {
        status: health.status,
        available: true,
        clusterName: health.cluster_name,
        numberOfNodes: health.number_of_nodes,
        activeShards: health.active_shards
      };
    } catch (error) {
      logger.error('Health check failed:', error);
      return { status: 'error', available: false, error: error.message };
    }
  }

  async checkIndex(indexName) {
    if (!this.client) {
      throw new Error('Elasticsearch client not initialized');
    }

    try {
      const exists = await this.client.indices.exists({ index: indexName });
      return exists;
    } catch (error) {
      logger.error(`Error checking index ${indexName}:`, error);
      throw error;
    }
  }

  async createIndex(indexName, mappings, settings = {}) {
    if (!this.client) {
      throw new Error('Elasticsearch client not initialized');
    }

    try {
      const exists = await this.checkIndex(indexName);
      
      if (exists) {
        logger.info(`Index ${indexName} already exists`);
        return { created: false, message: 'Index already exists' };
      }

      const defaultSettings = {
        number_of_shards: parseInt(process.env.ELASTICSEARCH_SHARDS || '1'),
        number_of_replicas: parseInt(process.env.ELASTICSEARCH_REPLICAS || '1'),
        refresh_interval: '1s',
        analysis: {
          analyzer: {
            pinyin_analyzer: {
              tokenizer: 'my_pinyin',
              filter: ['word_delimiter', 'lowercase']
            },
            autocomplete_analyzer: {
              tokenizer: 'standard',
              filter: ['lowercase', 'autocomplete_filter']
            },
            autocomplete_search_analyzer: {
              tokenizer: 'standard',
              filter: ['lowercase']
            }
          },
          tokenizer: {
            my_pinyin: {
              type: 'pinyin',
              latin_chars: true,
              keep_first_letter: true,
              keep_full_pinyin: true,
              keep_none_chinese_in_first_letter: true,
              keep_none_chinese_in_full_pinyin: true,
              keep_original: true,
              limit_first_letter_length: 50,
              remove_duplicated_term: true
            },
            autocomplete_tokenizer: {
              type: 'edge_ngram',
              min_gram: 1,
              max_gram: 20,
              token_chars: ['letter', 'digit']
            }
          },
          filter: {
            autocomplete_filter: {
              type: 'edge_ngram',
              min_gram: 1,
              max_gram: 20
            }
          }
        }
      };

      const mergedSettings = { ...defaultSettings, ...settings };

      await this.client.indices.create({
        index: indexName,
        body: {
          settings: mergedSettings,
          mappings
        }
      });

      logger.info(`Index ${indexName} created successfully`);
      return { created: true, message: 'Index created successfully' };
    } catch (error) {
      logger.error(`Error creating index ${indexName}:`, error);
      throw error;
    }
  }

  async deleteIndex(indexName) {
    if (!this.client) {
      throw new Error('Elasticsearch client not initialized');
    }

    try {
      const exists = await this.checkIndex(indexName);
      
      if (!exists) {
        logger.info(`Index ${indexName} does not exist`);
        return { deleted: false, message: 'Index does not exist' };
      }

      await this.client.indices.delete({ index: indexName });
      logger.info(`Index ${indexName} deleted successfully`);
      return { deleted: true, message: 'Index deleted successfully' };
    } catch (error) {
      logger.error(`Error deleting index ${indexName}:`, error);
      throw error;
    }
  }

  async bulkIndex(indexName, documents) {
    if (!this.client) {
      throw new Error('Elasticsearch client not initialized');
    }

    try {
      const operations = documents.flatMap(doc => [
        { index: { _index: indexName, _id: doc.id } },
        doc
      ]);

      const result = await this.client.bulk({
        refresh: true,
        operations
      });

      if (result.errors) {
        const erroredDocs = result.items.filter(item => item.index?.error);
        logger.error('Bulk indexing had errors:', erroredDocs);
        return { success: false, errors: erroredDocs };
      }

      logger.info(`Bulk indexed ${documents.length} documents to ${indexName}`);
      return { success: true, count: documents.length };
    } catch (error) {
      logger.error('Error during bulk indexing:', error);
      throw error;
    }
  }

  async search(indexName, query) {
    if (!this.client) {
      throw new Error('Elasticsearch client not initialized');
    }

    try {
      const result = await this.client.search({
        index: indexName,
        body: query
      });

      return result;
    } catch (error) {
      logger.error(`Error searching index ${indexName}:`, error);
      throw error;
    }
  }

  getClient() {
    return this.client;
  }

  isReady() {
    return this.isConnected && this.client !== null;
  }
}

const esConnection = new ElasticsearchConnection();

module.exports = {
  ElasticsearchConnection,
  esConnection
};
