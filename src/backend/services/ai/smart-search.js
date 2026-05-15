const { aiManager } = require('./ai-service');
const redisClient = require('../../../config/redis/client');

let pool = null;
try {
  pool = require('../../../config/database/db');
} catch (error) {
  console.warn('Database module not available, some features will be disabled');
}

class SmartSearch {
  constructor(options = {}) {
    this.enableIntentRecognition = options.enableIntentRecognition !== false;
    this.enableSemanticSearch = options.enableSemanticSearch !== false;
    this.maxResults = options.maxResults || 20;
    this.cacheResults = options.cacheResults !== false;
    this.cacheTTL = options.cacheTTL || 3600;
    this.minConfidenceScore = options.minConfidenceScore || 0.6;
    this.initRedis();
  }

  async initRedis() {
    try {
      if (redisClient && typeof redisClient.connect === 'function') {
        if (!redisClient.isOpen) {
          await redisClient.connect();
        }
      }
      this.redisConnected = true;
    } catch (error) {
      console.error('Redis connection failed for smart search:', error.message);
      this.redisConnected = false;
    }
  }

  async search(query, options = {}) {
    const {
      userId,
      category,
      filters = {},
      limit = this.maxResults,
      includeContext = true,
      provider
    } = options;

    const cacheKey = this.getCacheKey(query, options);

    if (this.cacheResults) {
      const cached = await this.getFromCache(cacheKey);
      if (cached) {
        return { ...cached, cached: true };
      }
    }

    const startTime = Date.now();

    try {
      let searchResults = [];
      let intent = null;

      if (this.enableIntentRecognition) {
        intent = await this.recognizeIntent(query, options);
      }

      if (this.enableSemanticSearch && intent?.type !== 'keyword') {
        searchResults = await this.semanticSearch(query, {
          ...options,
          intent,
          limit
        });
      }

      if (searchResults.length === 0 || intent?.type === 'keyword') {
        searchResults = await this.keywordSearch(query, {
          ...options,
          category,
          filters,
          limit
        });
      }

      if (this.enableIntentRecognition && intent && includeContext) {
        searchResults = await this.enhanceResultsWithContext(searchResults, query, intent, {
          ...options,
          provider
        });
      }

      const searchTime = Date.now() - startTime;
      const results = {
        query,
        results: searchResults.slice(0, limit),
        total: searchResults.length,
        searchTime,
        intent: intent || { type: 'unknown', confidence: 0 },
        suggestions: this.generateSuggestions(query, searchResults)
      };

      if (this.cacheResults) {
        await this.saveToCache(cacheKey, results);
      }

      return results;
    } catch (error) {
      console.error('Smart search failed:', error);
      throw error;
    }
  }

  async recognizeIntent(query, options = {}) {
    try {
      const prompt = `分析以下查询的意图和类型：

查询："${query}"

请识别：
1. 意图类型（information, transaction, navigation, comparison, troubleshooting, other）
2. 关键主题/领域
3. 是否需要精确匹配还是模糊搜索
4. 置信度（0-1）

以JSON格式返回：
{
  "type": "意图类型",
  "topic": "主要主题",
  "searchMode": "exact|fuzzy|semantic",
  "confidence": 置信度,
  "keywords": ["关键词列表"],
  "entities": ["实体列表"]
}`;

      const response = await aiManager.complete(prompt, {
        ...options,
        temperature: 0.3,
        maxTokens: 500
      });

      try {
        const parsed = JSON.parse(response.content);
        return {
          type: parsed.type || 'information',
          topic: parsed.topic || 'general',
          searchMode: parsed.searchMode || 'fuzzy',
          confidence: parsed.confidence || 0.5,
          keywords: parsed.keywords || [],
          entities: parsed.entities || []
        };
      } catch {
        return {
          type: 'information',
          topic: 'general',
          searchMode: 'fuzzy',
          confidence: 0.5,
          keywords: query.split(/\s+/).filter(w => w.length > 2),
          entities: []
        };
      }
    } catch (error) {
      console.error('Intent recognition failed:', error);
      return {
        type: 'information',
        topic: 'general',
        searchMode: 'fuzzy',
        confidence: 0.3,
        keywords: [],
        entities: []
      };
    }
  }

  async semanticSearch(query, options = {}) {
    const { intent, limit = 10, provider } = options;

    try {
      const prompt = `将以下查询转换为语义搜索向量表示：

查询："${query}"

请用JSON格式返回：
{
  "semanticVector": {
    "concepts": ["相关概念列表"],
    "synonyms": ["同义词列表"],
    "relatedTopics": ["相关主题列表"],
    "context": "查询的上下文理解"
  },
  "expandedQuery": "扩展后的查询语句，包含相关概念"
}`;

      const response = await aiManager.complete(prompt, {
        provider,
        temperature: 0.3,
        maxTokens: 600
      });

      let semanticData = {
        concepts: [],
        synonyms: [],
        relatedTopics: [],
        expandedQuery: query
      };

      try {
        const parsed = JSON.parse(response.content);
        semanticData = {
          concepts: parsed.semanticVector?.concepts || [],
          synonyms: parsed.semanticVector?.synonyms || [],
          relatedTopics: parsed.semanticVector?.relatedTopics || [],
          expandedQuery: parsed.expandedQuery || query
        };
      } catch {
        console.error('Failed to parse semantic data');
      }

      const expandedQuery = semanticData.expandedQuery;
      const searchTerms = [
        query,
        ...semanticData.synonyms,
        ...semanticData.concepts,
        ...semanticData.relatedTopics
      ].filter((v, i, a) => a.indexOf(v) === i);

      const results = await this.performDatabaseSearch(searchTerms.join(' '), {
        ...options,
        intent,
        limit,
        searchMode: 'semantic'
      });

      return results.map(r => ({
        ...r,
        relevanceScore: r.relevanceScore || 0.8,
        matchType: 'semantic',
        semanticConcepts: semanticData.concepts
      }));
    } catch (error) {
      console.error('Semantic search failed:', error);
      return [];
    }
  }

  async keywordSearch(query, options = {}) {
    const { category, filters, limit = 10, userId } = options;

    try {
      const searchTerms = query.split(/\s+/).filter(w => w.length > 2);

      if (searchTerms.length === 0) {
        return [];
      }

      const results = await this.performDatabaseSearch(query, {
        ...options,
        searchMode: 'keyword',
        limit
      });

      return results.map(r => ({
        ...r,
        matchType: 'keyword',
        matchedTerms: searchTerms.filter(term =>
          r.title?.toLowerCase().includes(term.toLowerCase()) ||
          r.content?.toLowerCase().includes(term.toLowerCase())
        )
      }));
    } catch (error) {
      console.error('Keyword search failed:', error);
      return [];
    }
  }

  async performDatabaseSearch(query, options = {}) {
    const { searchMode, category, filters = {}, limit = 10 } = options;

    try {
      let sql = 'SELECT * FROM articles WHERE 1=1';
      const params = [];
      let paramIndex = 1;

      const searchConditions = [
        'title ILIKE $' + paramIndex,
        'content ILIKE $' + paramIndex
      ];
      params.push(`%${query}%`);
      paramIndex++;

      if (searchConditions.length > 0) {
        sql += ' AND (' + searchConditions.join(' OR ') + ')';
      }

      if (category) {
        sql += ` AND category = $${paramIndex}`;
        params.push(category);
        paramIndex++;
      }

      for (const [field, value] of Object.entries(filters)) {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            sql += ` AND ${field} = ANY($${paramIndex})`;
            params.push(value);
          } else {
            sql += ` AND ${field} = $${paramIndex}`;
            params.push(value);
          }
          paramIndex++;
        }
      }

      sql += ` ORDER BY relevance DESC, created_at DESC LIMIT $${paramIndex}`;
      params.push(limit);

      const result = await pool.query(sql, params);

      return result.rows.map(row => ({
        id: row.id,
        title: row.title,
        content: row.content,
        category: row.category,
        tags: row.tags,
        url: row.url,
        relevanceScore: this.calculateRelevance(row, query),
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
    } catch (error) {
      console.error('Database search failed:', error);
      return [];
    }
  }

  calculateRelevance(document, query) {
    const queryLower = query.toLowerCase();
    const queryTerms = queryLower.split(/\s+/);

    let score = 0;

    if (document.title?.toLowerCase().includes(queryLower)) {
      score += 0.5;
    }

    for (const term of queryTerms) {
      if (document.title?.toLowerCase().includes(term)) {
        score += 0.15;
      }
      if (document.content?.toLowerCase().includes(term)) {
        score += 0.05;
      }
      if (document.tags?.some(tag => tag.toLowerCase().includes(term))) {
        score += 0.1;
      }
    }

    return Math.min(1, score);
  }

  async enhanceResultsWithContext(results, query, intent, options = {}) {
    if (results.length === 0) {
      return results;
    }

    try {
      const resultsContext = results.slice(0, 5).map((r, i) =>
        `[${i + 1}] ${r.title}: ${r.content?.substring(0, 200)}...`
      ).join('\n');

      const prompt = `基于以下搜索结果和用户查询，提供增强的回答：

用户查询："${query}"
查询意图：${intent.type} (置信度: ${intent.confidence})

搜索结果：
${resultsContext}

请提供：
1. 最佳匹配结果的分析
2. 为什么这些结果与查询相关
3. 补充信息（如有必要）
4. 相关但未显示的其他可能有用的话题

以JSON格式返回：
{
  "analysis": "最佳匹配结果的分析",
  "supplementaryInfo": "补充信息",
  "relatedTopics": ["相关话题列表"],
  "recommendedOrder": [1, 2, 3, ...]
}`;

      const response = await aiManager.complete(prompt, {
        ...options,
        temperature: 0.5,
        maxTokens: 800
      });

      let enhancement = {};
      try {
        enhancement = JSON.parse(response.content);
      } catch {
        enhancement = { analysis: response.content };
      }

      if (enhancement.relatedTopics) {
        results = results.map(r => ({
          ...r,
          relatedTopics: (r.relatedTopics || []).concat(enhancement.relatedTopics)
        }));
      }

      return results;
    } catch (error) {
      console.error('Context enhancement failed:', error);
      return results;
    }
  }

  generateSuggestions(query, results) {
    const suggestions = [];

    if (results.length === 0) {
      suggestions.push('尝试使用更通用的关键词');
      suggestions.push('检查拼写是否正确');
      suggestions.push('尝试同义词或相关概念');
    } else if (results.length < 3) {
      suggestions.push('尝试扩展搜索范围');
      suggestions.push('使用更广泛的关键词');
    }

    const topResult = results[0];
    if (topResult && topResult.category) {
      suggestions.push(`浏览${topResult.category}分类中的更多内容`);
    }

    return suggestions;
  }

  async buildKnowledgeBase(articles) {
    const kbId = `kb_${Date.now()}`;

    const knowledgeBase = {
      id: kbId,
      articles: articles.map(a => ({
        id: a.id,
        title: a.title,
        content: a.content,
        category: a.category,
        tags: a.tags,
        url: a.url,
        embedding: null
      })),
      createdAt: Date.now(),
      stats: {
        totalArticles: articles.length,
        categories: [...new Set(articles.map(a => a.category))],
        tags: [...new Set(articles.flatMap(a => a.tags || []))]
      }
    };

    if (this.redisConnected) {
      try {
        await redisClient.setEx(
          `knowledgebase:${kbId}`,
          86400 * 30,
          JSON.stringify(knowledgeBase)
        );
      } catch (error) {
        console.error('Failed to save knowledge base:', error);
      }
    }

    return knowledgeBase;
  }

  async searchKnowledgeBase(kbId, query, options = {}) {
    if (!this.redisConnected) {
      throw new Error('Redis not connected');
    }

    try {
      const kbData = await redisClient.get(`knowledgebase:${kbId}`);
      if (!kbData) {
        throw new Error(`Knowledge base ${kbId} not found`);
      }

      const knowledgeBase = JSON.parse(kbData);

      const searchResults = await this.search(query, {
        ...options,
        limit: options.limit || 10
      });

      const kbArticles = knowledgeBase.articles.filter(a =>
        searchResults.results.some(r => r.id === a.id)
      );

      return {
        ...searchResults,
        knowledgeBase: {
          id: kbId,
          stats: knowledgeBase.stats
        },
        articles: kbArticles
      };
    } catch (error) {
      console.error('Knowledge base search failed:', error);
      throw error;
    }
  }

  getCacheKey(query, options) {
    const normalizedQuery = query.toLowerCase().trim();
    const optionsStr = JSON.stringify({
      category: options.category,
      filters: options.filters,
      limit: options.limit
    });
    return `smartsearch:${this.hashCode(normalizedQuery + optionsStr)}`;
  }

  hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  async getFromCache(key) {
    try {
      if (!redisClient.isOpen) {
        await redisClient.connect();
      }
      const cached = await redisClient.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('Cache read error:', error);
      return null;
    }
  }

  async saveToCache(key, data) {
    try {
      if (!redisClient.isOpen) {
        await redisClient.connect();
      }
      await redisClient.setEx(key, this.cacheTTL, JSON.stringify(data));
    } catch (error) {
      console.error('Cache write error:', error);
    }
  }
}

const smartSearch = new SmartSearch();

module.exports = {
  SmartSearch,
  smartSearch
};
