const redisClient = require('../../../config/redis/client');

class AIService {
  constructor(config = {}) {
    this.config = {
      provider: config.provider || 'openai',
      model: config.model || 'gpt-3.5-turbo',
      temperature: config.temperature || 0.7,
      maxTokens: config.maxTokens || 2000,
      apiKey: config.apiKey || process.env.OPENAI_API_KEY,
      ...config
    };
    this.cacheEnabled = config.cacheEnabled !== false;
    this.cacheTTL = config.cacheTTL || 3600;
    this.requestCount = 0;
    this.totalTokens = 0;
    this.costTracking = {
      totalCost: 0,
      requestsByModel: {},
      requestsByUser: {}
    };
  }

  async call(messages, options = {}) {
    const cacheKey = this.getCacheKey(messages, options);

    if (this.cacheEnabled) {
      const cached = await this.getFromCache(cacheKey);
      if (cached) {
        return { ...cached, cached: true };
      }
    }

    try {
      const response = await this.sendRequest(messages, options);

      if (this.cacheEnabled) {
        await this.saveToCache(cacheKey, response);
      }

      this.trackUsage(options.userId, response);

      return response;
    } catch (error) {
      console.error('AI Service Error:', error);
      throw error;
    }
  }

  async sendRequest(messages, options = {}) {
    throw new Error('sendRequest must be implemented by subclass');
  }

  getCacheKey(messages, options) {
    const content = JSON.stringify({ messages, options: { ...options, userId: undefined } });
    return `ai:cache:${this.hashCode(content)}`;
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

  trackUsage(userId, response) {
    this.requestCount++;
    this.totalTokens += response.usage?.total_tokens || 0;

    const modelCost = this.calculateCost(response.usage);
    this.costTracking.totalCost += modelCost;

    if (!this.costTracking.requestsByModel[this.config.model]) {
      this.costTracking.requestsByModel[this.config.model] = { count: 0, tokens: 0, cost: 0 };
    }
    this.costTracking.requestsByModel[this.config.model].count++;
    this.costTracking.requestsByModel[this.config.model].tokens += response.usage?.total_tokens || 0;
    this.costTracking.requestsByModel[this.config.model].cost += modelCost;

    if (userId) {
      if (!this.costTracking.requestsByUser[userId]) {
        this.costTracking.requestsByUser[userId] = { count: 0, tokens: 0, cost: 0 };
      }
      this.costTracking.requestsByUser[userId].count++;
      this.costTracking.requestsByUser[userId].tokens += response.usage?.total_tokens || 0;
      this.costTracking.requestsByUser[userId].cost += modelCost;
    }
  }

  calculateCost(usage) {
    const pricing = this.getPricing();
    const inputCost = (usage.prompt_tokens || 0) * pricing.input;
    const outputCost = (usage.completion_tokens || 0) * pricing.output;
    return (inputCost + outputCost) / 1000;
  }

  getPricing() {
    return {
      input: 0.0015,
      output: 0.002
    };
  }

  getStats() {
    return {
      requestCount: this.requestCount,
      totalTokens: this.totalTokens,
      totalCost: this.costTracking.totalCost,
      byModel: this.costTracking.requestsByModel,
      byUser: this.costTracking.requestsByUser
    };
  }

  clearCache() {
    console.log('Cache clearing not implemented - use Redis FLUSHDB');
  }
}

class OpenAIService extends AIService {
  constructor(config = {}) {
    super({
      provider: 'openai',
      model: config.model || 'gpt-3.5-turbo',
      ...config
    });
  }

  async sendRequest(messages, options = {}) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify({
        model: this.config.model,
        messages,
        temperature: options.temperature ?? this.config.temperature,
        max_tokens: options.maxTokens ?? this.config.maxTokens,
        ...options.extraParams
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'OpenAI API Error');
    }

    const data = await response.json();

    return {
      content: data.choices[0].message.content,
      usage: data.usage,
      model: data.model,
      finishReason: data.choices[0].finish_reason
    };
  }

  getPricing() {
    const model = this.config.model;
    if (model === 'gpt-4') {
      return { input: 0.03, output: 0.06 };
    } else if (model === 'gpt-4-turbo') {
      return { input: 0.01, output: 0.03 };
    } else if (model === 'gpt-3.5-turbo-16k') {
      return { input: 0.001, output: 0.002 };
    }
    return { input: 0.0015, output: 0.002 };
  }
}

class ClaudeService extends AIService {
  constructor(config = {}) {
    super({
      provider: 'anthropic',
      model: config.model || 'claude-3-sonnet-20240229',
      apiKey: config.apiKey || process.env.ANTHROPIC_API_KEY,
      ...config
    });
    this.apiVersion = '2023-06-01';
  }

  async sendRequest(messages, options = {}) {
    const systemPrompt = messages.find(m => m.role === 'system')?.content || '';
    const userMessages = messages.filter(m => m.role !== 'system');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': this.apiVersion
      },
      body: JSON.stringify({
        model: this.config.model,
        system: systemPrompt,
        messages: userMessages.map(m => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content
        })),
        temperature: options.temperature ?? this.config.temperature,
        max_tokens: options.maxTokens ?? this.config.maxTokens,
        ...options.extraParams
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Anthropic API Error');
    }

    const data = await response.json();

    return {
      content: data.content[0].text,
      usage: {
        input_tokens: data.usage.input_tokens,
        output_tokens: data.usage.output_tokens
      },
      model: data.model,
      stopReason: data.stop_reason
    };
  }

  getPricing() {
    const model = this.config.model;
    if (model.includes('claude-3-opus')) {
      return { input: 0.015, output: 0.075 };
    } else if (model.includes('claude-3-sonnet')) {
      return { input: 0.003, output: 0.015 };
    } else if (model.includes('claude-3-haiku')) {
      return { input: 0.00025, output: 0.00125 };
    }
    return { input: 0.003, output: 0.015 };
  }
}

class AIServiceFactory {
  static providers = {
    openai: OpenAIService,
    anthropic: ClaudeService
  };

  static create(provider, config = {}) {
    const ServiceClass = this.providers[provider.toLowerCase()];
    if (!ServiceClass) {
      throw new Error(`Unknown AI provider: ${provider}`);
    }
    return new ServiceClass(config);
  }

  static registerProvider(name, ServiceClass) {
    this.providers[name.toLowerCase()] = ServiceClass;
  }

  static getAvailableProviders() {
    return Object.keys(this.providers);
  }
}

class AIManager {
  constructor() {
    this.services = new Map();
    this.defaultService = null;
    this.initializeDefaults();
  }

  initializeDefaults() {
    if (process.env.OPENAI_API_KEY) {
      this.registerService('openai', new OpenAIService({
        model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo'
      }));
      this.defaultService = 'openai';
    }

    if (process.env.ANTHROPIC_API_KEY) {
      this.registerService('claude', new ClaudeService({
        model: process.env.CLAUDE_MODEL || 'claude-3-sonnet-20240229'
      }));
      if (!this.defaultService) {
        this.defaultService = 'claude';
      }
    }
  }

  registerService(name, service) {
    this.services.set(name, service);
    if (!this.defaultService) {
      this.defaultService = name;
    }
  }

  getService(name = null) {
    if (name) {
      const service = this.services.get(name);
      if (!service) {
        throw new Error(`Service ${name} not found`);
      }
      return service;
    }
    return this.services.get(this.defaultService);
  }

  async call(messages, options = {}) {
    const serviceName = options.provider || this.defaultService;
    const service = this.getService(serviceName);
    return service.call(messages, options);
  }

  async complete(prompt, options = {}) {
    const messages = [{ role: 'user', content: prompt }];
    return this.call(messages, options);
  }

  getStats() {
    const stats = {};
    for (const [name, service] of this.services) {
      stats[name] = service.getStats();
    }
    return {
      defaultProvider: this.defaultService,
      services: stats,
      availableProviders: Array.from(this.services.keys())
    };
  }

  getAvailableProviders() {
    return Array.from(this.services.keys());
  }
}

const aiManager = new AIManager();

module.exports = {
  AIService,
  OpenAIService,
  ClaudeService,
  AIServiceFactory,
  AIManager,
  aiManager
};
