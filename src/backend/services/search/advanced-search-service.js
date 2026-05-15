const { elasticsearchService } = require('./elasticsearch-service');
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
      filename: 'logs/advanced-search-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d'
    })
  ]
});

class AdvancedSearchService {
  constructor() {
    this.service = elasticsearchService;
  }

  async initialize() {
    await this.service.initialize();
  }

  async searchUsers(query, options = {}) {
    const {
      filters = {},
      page = 1,
      pageSize = 20,
      sort = [],
      includeInactive = false
    } = options;

    const searchFilters = { ...filters };

    if (!includeInactive) {
      searchFilters.isActive = true;
    }

    if (filters.roles && !Array.isArray(filters.roles)) {
      searchFilters.roles = [filters.roles];
    }

    const searchOptions = {
      index: 'users',
      query,
      fields: ['username', 'fullName', 'firstName', 'lastName', 'email', 'bio'],
      filters: searchFilters,
      page,
      pageSize,
      sort: sort.length > 0 ? sort : ['-createdAt'],
      highlight: true,
      aggregations: {
        roles: {
          terms: { field: 'roles', size: 20 }
        },
        status: {
          terms: { field: 'status', size: 10 }
        },
        isActive: {
          terms: { field: 'isActive', size: 5 }
        },
        providers: {
          terms: { field: 'provider', size: 10 }
        },
        languages: {
          terms: { field: 'language', size: 20 }
        }
      }
    };

    return await this.service.search(searchOptions);
  }

  async searchContent(query, options = {}) {
    const {
      filters = {},
      page = 1,
      pageSize = 20,
      sort = [],
      contentType = null,
      authorId = null
    } = options;

    const searchFilters = { ...filters };

    if (contentType) {
      searchFilters.type = contentType;
    }

    if (authorId) {
      searchFilters.authorId = authorId;
    }

    if (filters.status) {
      searchFilters.status = filters.status;
    } else {
      searchFilters.status = 'published';
    }

    const searchOptions = {
      index: 'content',
      query,
      fields: ['title', 'content', 'excerpt', 'summary', 'tags', 'authorName'],
      filters: searchFilters,
      page,
      pageSize,
      sort: sort.length > 0 ? sort : ['-publishedAt', '-createdAt'],
      highlight: true,
      aggregations: {
        types: {
          terms: { field: 'type', size: 20 }
        },
        categories: {
          terms: { field: 'categories', size: 50 }
        },
        tags: {
          terms: { field: 'tags', size: 50 }
        },
        authors: {
          terms: { field: 'authorId', size: 20 }
        },
        status: {
          terms: { field: 'status', size: 10 }
        },
        visibility: {
          terms: { field: 'visibility', size: 5 }
        },
        avgRating: {
          avg: { field: 'rating' }
        },
        totalViews: {
          sum: { field: 'views' }
        },
        totalLikes: {
          sum: { field: 'likes' }
        }
      }
    };

    return await this.service.search(searchOptions);
  }

  async searchLogs(query, options = {}) {
    const {
      filters = {},
      page = 1,
      pageSize = 50,
      sort = [],
      logLevel = null,
      source = null,
      startDate = null,
      endDate = null
    } = options;

    const searchFilters = { ...filters };

    if (logLevel) {
      searchFilters.level = logLevel;
    }

    if (source) {
      searchFilters.source = source;
    }

    if (startDate || endDate) {
      searchFilters.timestamp = {};
      if (startDate) {
        searchFilters.timestamp.gte = startDate;
      }
      if (endDate) {
        searchFilters.timestamp.lte = endDate;
      }
    }

    const searchOptions = {
      index: 'logs',
      query,
      fields: ['message', 'description', 'error', 'userName', 'path', 'method'],
      filters: searchFilters,
      page,
      pageSize,
      sort: sort.length > 0 ? sort : ['-timestamp'],
      highlight: true,
      aggregations: {
        levels: {
          terms: { field: 'level', size: 10 }
        },
        types: {
          terms: { field: 'type', size: 20 }
        },
        sources: {
          terms: { field: 'source', size: 20 }
        },
        actions: {
          terms: { field: 'action', size: 30 }
        },
        statusCodes: {
          terms: { field: 'statusCode', size: 20 }
        },
        errorsOverTime: {
          date_histogram: {
            field: 'timestamp',
            calendar_interval: 'hour'
          }
        }
      }
    };

    return await this.service.search(searchOptions);
  }

  async searchNotifications(query, options = {}) {
    const {
      filters = {},
      page = 1,
      pageSize = 20,
      sort = [],
      userId = null,
      unreadOnly = false,
      types = []
    } = options;

    const searchFilters = { ...filters };

    if (userId) {
      searchFilters.targetUserId = userId;
    }

    if (unreadOnly) {
      searchFilters.read = false;
    }

    if (types.length > 0) {
      searchFilters.type = types;
    }

    searchFilters.archived = false;
    searchFilters.dismissed = false;

    const searchOptions = {
      index: 'notifications',
      query,
      fields: ['title', 'message', 'content', 'senderName'],
      filters: searchFilters,
      page,
      pageSize,
      sort: sort.length > 0 ? sort : ['-createdAt'],
      highlight: true,
      aggregations: {
        types: {
          terms: { field: 'type', size: 20 }
        },
        categories: {
          terms: { field: 'category', size: 20 }
        },
        priorities: {
          terms: { field: 'priority', size: 5 }
        },
        readStatus: {
          terms: { field: 'read', size: 5 }
        }
      }
    };

    return await this.service.search(searchOptions);
  }

  async searchWithPinyin(query, index, options = {}) {
    const {
      pinyinFields = [],
      fallbackToFuzzy = true
    } = options;

    try {
      await this.service.ensureConnected();

      const queryBody = {
        bool: {
          should: [
            {
              multi_match: {
                query,
                fields: pinyinFields.map(f => `${f}.pinyin`),
                type: 'best_fields',
                boost: 2
              }
            }
          ],
          minimum_should_match: 1
        }
      };

      if (fallbackToFuzzy) {
        queryBody.bool.should.push({
          multi_match: {
            query,
            fields: pinyinFields,
            type: 'best_fields',
            fuzziness: 'AUTO',
            boost: 1
          }
        });
      }

      const searchOptions = {
        index,
        query,
        fields: pinyinFields,
        page: options.page || 1,
        pageSize: options.pageSize || 20,
        highlight: true
      };

      return await this.service.search(searchOptions);
    } catch (error) {
      logger.error('Search with pinyin error:', error);
      throw error;
    }
  }

  async getAutocomplete(prefix, index, field = 'autocomplete', size = 10) {
    try {
      await this.service.ensureConnected();

      const { esConnection } = require('../../config/elasticsearch/connection');
      const client = esConnection.getClient();

      const result = await client.search({
        index,
        body: {
          suggest: {
            text: prefix,
            autocomplete: {
              prefix,
              completion: {
                field,
                size,
                skip_duplicates: true,
                fuzzy: {
                  fuzziness: 'AUTO',
                  prefix_length: 1
                }
              }
            }
          },
          _source: true
        }
      });

      const suggestions = result.suggest?.autocomplete?.[0]?.options || [];

      return suggestions.map(option => ({
        text: option.text,
        score: option._score,
        source: option._source
      }));
    } catch (error) {
      logger.error('Autocomplete error:', error);
      throw error;
    }
  }

  async searchWithFilters(options = {}) {
    const {
      index = 'content',
      query = '',
      filters = [],
      mustNot = [],
      should = [],
      aggregations = null,
      postFilter = null,
      page = 1,
      pageSize = 20,
      sort = []
    } = options;

    const boolQuery = { bool: {} };

    if (query) {
      boolQuery.bool.must = [
        {
          multi_match: {
            query,
            fields: ['*'],
            type: 'best_fields',
            fuzziness: 'AUTO'
          }
        }
      ];
    }

    if (filters.length > 0) {
      boolQuery.bool.filter = filters;
    }

    if (mustNot.length > 0) {
      boolQuery.bool.must_not = mustNot;
    }

    if (should.length > 0) {
      boolQuery.bool.should = should;
      boolQuery.bool.minimum_should_match = 1;
    }

    try {
      await this.service.ensureConnected();

      const { esConnection } = require('../../config/elasticsearch/connection');
      const client = esConnection.getClient();

      const searchParams = {
        index,
        body: {
          query: boolQuery,
          from: (page - 1) * pageSize,
          size: pageSize,
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

      return this.service.formatSearchResult(result, page, pageSize);
    } catch (error) {
      logger.error('Search with filters error:', error);
      throw error;
    }
  }

  async getFacetCounts(index, filterField, query = '') {
    try {
      await this.service.ensureConnected();

      const { esConnection } = require('../../config/elasticsearch/connection');
      const client = esConnection.getClient();

      const queryBody = query
        ? {
            bool: {
              must: [
                {
                  multi_match: {
                    query,
                    fields: ['*'],
                    fuzziness: 'AUTO'
                  }
                }
              ]
            }
          }
        : { match_all: {} };

      const result = await client.search({
        index,
        body: {
          query: queryBody,
          size: 0,
          aggs: {
            facets: {
              terms: {
                field: filterField,
                size: 100
              }
            }
          }
        }
      });

      return {
        total: result.hits.total.value,
        facets: result.aggregations?.facets?.buckets || []
      };
    } catch (error) {
      logger.error('Get facet counts error:', error);
      throw error;
    }
  }

  async searchSimilar(documentId, index, options = {}) {
    const {
      fields = ['title', 'content'],
      minTermFreq = 1,
      minDocFreq = 1,
      maxQueryTerms = 25,
      size = 10
    } = options;

    return await this.service.moreLikeThis(index, documentId, fields, {
      minTermFreq,
      minDocFreq,
      maxQueryTerms,
      size
    });
  }

  async healthCheck() {
    return await this.service.healthCheck();
  }
}

const advancedSearchService = new AdvancedSearchService();

module.exports = {
  AdvancedSearchService,
  advancedSearchService
};
