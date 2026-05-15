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
      filename: 'logs/elasticsearch-service-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d'
    })
  ]
});

class ElasticsearchService {
  constructor() {
    this.defaultPageSize = 20;
    this.maxPageSize = 100;
  }

  async initialize() {
    try {
      await esConnection.connect();
      logger.info('ElasticsearchService initialized');
    } catch (error) {
      logger.error('Failed to initialize ElasticsearchService:', error);
      throw error;
    }
  }

  async search(options = {}) {
    const {
      index = 'users',
      query = '',
      fields = ['*'],
      filters = {},
      sort = [],
      page = 1,
      pageSize = this.defaultPageSize,
      highlight = true,
      aggregations = null,
      suggest = false
    } = options;

    try {
      await this.ensureConnected();

      const from = (page - 1) * Math.min(pageSize, this.maxPageSize);
      const size = Math.min(pageSize, this.maxPageSize);

      const esQuery = this.buildQuery(query, fields, filters);
      const esSort = this.buildSort(sort);
      const esHighlight = highlight ? this.buildHighlight(fields) : undefined;
      const esAggregations = aggregations || undefined;

      const searchParams = {
        index,
        body: {
          query: esQuery,
          from,
          size,
          sort: esSort.length > 0 ? esSort : undefined
        }
      };

      if (esHighlight) {
        searchParams.body.highlight = esHighlight;
      }

      if (esAggregations) {
        searchParams.body.aggs = esAggregations;
      }

      if (suggest && query) {
        searchParams.body.suggest = this.buildSuggest(query, fields);
      }

      const client = esConnection.getClient();
      const result = await client.search(searchParams);

      return this.formatSearchResult(result, page, pageSize);
    } catch (error) {
      logger.error('Search error:', error);
      throw error;
    }
  }

  buildQuery(query, fields, filters) {
    if (!query && Object.keys(filters).length === 0) {
      return { match_all: {} };
    }

    const must = [];
    const filter = [];

    if (query) {
      if (fields.includes('*')) {
        must.push({
          multi_match: {
            query,
            type: 'best_fields',
            fuzziness: 'AUTO',
            prefix_length: 2
          }
        });
      } else {
        must.push({
          multi_match: {
            query,
            fields,
            type: 'best_fields',
            fuzziness: 'AUTO',
            prefix_length: 2
          }
        });
      }
    }

    for (const [field, value] of Object.entries(filters)) {
      if (value === null || value === undefined) continue;

      if (Array.isArray(value)) {
        filter.push({ terms: { [field]: value } });
      } else if (typeof value === 'object') {
        if (value.gte !== undefined || value.lte !== undefined || 
            value.gt !== undefined || value.lt !== undefined) {
          filter.push({ range: { [field]: value } });
        }
      } else {
        filter.push({ term: { [field]: value } });
      }
    }

    if (must.length === 0 && filter.length === 0) {
      return { match_all: {} };
    }

    return {
      bool: {
        must: must.length > 0 ? must : [{ match_all: {} }],
        filter
      }
    };
  }

  buildSort(sort) {
    if (!sort || sort.length === 0) {
      return [{ createdAt: { order: 'desc' } }];
    }

    return sort.map(s => {
      if (typeof s === 'string') {
        const field = s.startsWith('-') ? s.slice(1) : s;
        const order = s.startsWith('-') ? 'desc' : 'asc';
        return { [field]: { order } };
      }
      return s;
    });
  }

  buildHighlight(fields) {
    const highlightFields = {};
    
    const fieldsToHighlight = fields.includes('*') 
      ? ['username', 'fullName', 'email', 'bio', 'title', 'content', 'message']
      : fields;

    for (const field of fieldsToHighlight) {
      if (typeof field === 'string' && !field.includes('.')) {
        highlightFields[field] = {
          pre_tags: ['<em>'],
          post_tags: ['</em>'],
          fragment_size: 150,
          number_of_fragments: 3
        };
      }
    }

    return {
      pre_tags: ['<em>'],
      post_tags: ['</em>'],
      fields: highlightFields
    };
  }

  buildSuggest(query, fields) {
    const suggestions = {
      text: query,
      completions: {
        term: {
          suggestion: {
            term: {
              field: fields[0] || 'autocomplete',
              size: 5,
              min_word_length: 2,
              fuzzy: {
                fuzziness: 'AUTO'
              }
            }
          }
        }
      }
    };

    if (fields.includes('username') || fields.includes('*')) {
      suggestions.username_suggest = {
        completion: {
          field: 'username.autocomplete',
          size: 5,
          skip_duplicates: true,
          fuzzy: {
            fuzziness: 'AUTO'
          }
        }
      };
    }

    if (fields.includes('title') || fields.includes('*')) {
      suggestions.title_suggest = {
        completion: {
          field: 'title.autocomplete',
          size: 5,
          skip_duplicates: true
        }
      };
    }

    return suggestions;
  }

  formatSearchResult(result, page, pageSize) {
    const hits = result.hits.hits.map(hit => ({
      _id: hit._id,
      _score: hit._score,
      _source: hit._source,
      _highlight: hit.highlight || {}
    }));

    const total = typeof result.hits.total === 'object' 
      ? result.hits.total.value 
      : result.hits.total;

    return {
      hits,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      took: result.took,
      aggregations: result.aggregations || null,
      suggestions: result.suggest || null
    };
  }

  async advancedSearch(options = {}) {
    const {
      index = 'users',
      queries = [],
      filters = [],
      sort = [],
      page = 1,
      pageSize = this.defaultPageSize,
      aggregations = null,
      postFilter = null
    } = options;

    try {
      await this.ensureConnected();

      const from = (page - 1) * Math.min(pageSize, this.maxPageSize);
      const size = Math.min(pageSize, this.maxPageSize);

      const must = queries.map(q => ({
        multi_match: {
          query: q.text,
          fields: q.fields || ['*'],
          type: q.type || 'best_fields',
          fuzziness: q.fuzziness || 'AUTO'
        }
      }));

      const filterClauses = filters.map(f => {
        if (f.terms) {
          return { terms: f };
        }
        if (f.range) {
          return { range: f };
        }
        if (f.term) {
          return { term: f };
        }
        return f;
      });

      const query = {
        bool: {
          must: must.length > 0 ? must : [{ match_all: {} }],
          filter: filterClauses
        }
      };

      const client = esConnection.getClient();
      const searchParams = {
        index,
        body: {
          query,
          from,
          size,
          sort: sort.length > 0 ? sort : [{ createdAt: { order: 'desc' } }]
        }
      };

      if (aggregations) {
        searchParams.body.aggs = aggregations;
      }

      if (postFilter) {
        searchParams.body.post_filter = postFilter;
      }

      const result = await client.search(searchParams);

      return this.formatSearchResult(result, page, pageSize);
    } catch (error) {
      logger.error('Advanced search error:', error);
      throw error;
    }
  }

  async aggregate(index, aggregationConfig) {
    try {
      await this.ensureConnected();

      const client = esConnection.getClient();
      const result = await client.search({
        index,
        body: {
          size: 0,
          aggs: aggregationConfig
        }
      });

      return {
        aggregations: result.aggregations,
        total: result.hits.total.value
      };
    } catch (error) {
      logger.error('Aggregation error:', error);
      throw error;
    }
  }

  async getSuggestions(index, field, prefix, size = 5) {
    try {
      await this.ensureConnected();

      const client = esConnection.getClient();
      const result = await client.search({
        index,
        body: {
          suggest: {
            text: prefix,
            completion_suggest: {
              term: {
                [field]: {
                  prefix,
                  size,
                  fuzzy: {
                    fuzziness: 'AUTO'
                  }
                }
              }
            }
          },
          _source: false
        }
      });

      const suggestions = result.suggest?.completion_suggest?.[0]?.options || [];
      
      return suggestions.map(s => ({
        text: s.text,
        score: s._score
      }));
    } catch (error) {
      logger.error('Get suggestions error:', error);
      throw error;
    }
  }

  async moreLikeThis(index, documentId, fields, options = {}) {
    try {
      await this.ensureConnected();

      const {
        minTermFreq = 1,
        minDocFreq = 1,
        maxQueryTerms = 25,
        size = 10
      } = options;

      const client = esConnection.getClient();
      const result = await client.search({
        index,
        body: {
          query: {
            more_like_this: {
              fields,
              like: [
                {
                  _index: index,
                  _id: documentId
                }
              ],
              min_term_freq: minTermFreq,
              min_doc_freq: minDocFreq,
              max_query_terms: maxQueryTerms
            }
          },
          size
        }
      });

      return this.formatSearchResult(result, 1, size);
    } catch (error) {
      logger.error('More like this error:', error);
      throw error;
    }
  }

  async indexDocument(index, document, id = null) {
    try {
      await this.ensureConnected();

      const client = esConnection.getClient();
      const params = {
        index,
        body: document
      };

      if (id) {
        params.id = id;
      }

      const result = await client.index(params);

      logger.info(`Indexed document ${result._id} to ${index}`);
      return {
        id: result._id,
        result: result.result,
        version: result._version
      };
    } catch (error) {
      logger.error('Index document error:', error);
      throw error;
    }
  }

  async updateDocument(index, id, updates) {
    try {
      await this.ensureConnected();

      const client = esConnection.getClient();
      const result = await client.update({
        index,
        id,
        body: {
          doc: updates
        }
      });

      logger.info(`Updated document ${id} in ${index}`);
      return {
        id: result._id,
        result: result.result,
        version: result._version
      };
    } catch (error) {
      logger.error('Update document error:', error);
      throw error;
    }
  }

  async deleteDocument(index, id) {
    try {
      await this.ensureConnected();

      const client = esConnection.getClient();
      const result = await client.delete({
        index,
        id
      });

      logger.info(`Deleted document ${id} from ${index}`);
      return {
        id: result._id,
        result: result.result
      };
    } catch (error) {
      logger.error('Delete document error:', error);
      throw error;
    }
  }

  async bulkOperation(operations) {
    try {
      await this.ensureConnected();

      const client = esConnection.getClient();
      const result = await client.bulk({
        refresh: true,
        body: operations
      });

      if (result.errors) {
        const errors = result.items
          .filter(item => item.index?.error)
          .map(item => ({
            id: item.index?._id,
            error: item.index?.error
          }));
        
        logger.warn('Bulk operation had errors', { errors });
        return { success: false, errors, items: result.items };
      }

      logger.info(`Bulk operation completed successfully`);
      return { success: true, items: result.items };
    } catch (error) {
      logger.error('Bulk operation error:', error);
      throw error;
    }
  }

  async ensureConnected() {
    if (!esConnection.isReady()) {
      await esConnection.connect();
    }
  }

  async healthCheck() {
    try {
      const health = await esConnection.checkHealth();
      return health;
    } catch (error) {
      return {
        status: 'error',
        available: false,
        error: error.message
      };
    }
  }
}

const elasticsearchService = new ElasticsearchService();

module.exports = {
  ElasticsearchService,
  elasticsearchService
};
