const { elasticsearchService } = require('./elasticsearch-service');
const { syncService } = require('./sync-service');
const { advancedSearchService } = require('./advanced-search-service');
const { esConnection, ElasticsearchConnection } = require('../../config/elasticsearch/connection');
const { indexManager, IndexManager } = require('../../config/elasticsearch/index-manager');

module.exports = {
  elasticsearchService,
  ElasticsearchService: require('./elasticsearch-service').ElasticsearchService,
  
  syncService,
  SyncService: require('./sync-service').SyncService,
  
  advancedSearchService,
  AdvancedSearchService: require('./advanced-search-service').AdvancedSearchService,
  
  esConnection,
  ElasticsearchConnection,
  
  indexManager,
  IndexManager
};
