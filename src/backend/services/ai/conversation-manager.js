const { aiManager } = require('./ai-service');
const redisClient = require('../../../config/redis/client');

class ConversationManager {
  constructor(options = {}) {
    this.maxHistoryLength = options.maxHistoryLength || 20;
    this.maxContextTokens = options.maxContextTokens || 4000;
    this.conversationTTL = options.conversationTTL || 86400;
    this.enableBranching = options.enableBranching !== false;
    this.branchTTL = options.branchTTL || 3600;
    this.sessions = new Map();
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
      console.error('Redis connection failed for conversation manager:', error.message);
      this.redisConnected = false;
    }
  }

  async createConversation(userId, options = {}) {
    const conversationId = this.generateConversationId();
    const conversation = {
      id: conversationId,
      userId,
      title: options.title || 'New Conversation',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
      metadata: {
        systemPrompt: options.systemPrompt || this.getDefaultSystemPrompt(),
        context: options.context || {},
        tags: options.tags || [],
        model: options.model || 'openai',
        temperature: options.temperature || 0.7
      },
      stats: {
        messageCount: 0,
        totalTokens: 0,
        totalCost: 0
      },
      branches: new Map()
    };

    if (this.redisConnected) {
      try {
        await redisClient.setEx(
          `conversation:${conversationId}`,
          this.conversationTTL,
          JSON.stringify(conversation)
        );
        await redisClient.sAdd(`user:conversations:${userId}`, conversationId);
      } catch (error) {
        console.error('Failed to save conversation to Redis:', error);
      }
    }

    this.sessions.set(conversationId, conversation);

    return {
      id: conversationId,
      title: conversation.title,
      createdAt: conversation.createdAt
    };
  }

  async getConversation(conversationId) {
    if (this.sessions.has(conversationId)) {
      return this.sessions.get(conversationId);
    }

    if (this.redisConnected) {
      try {
        const cached = await redisClient.get(`conversation:${conversationId}`);
        if (cached) {
          const conversation = JSON.parse(cached);
          conversation.branches = new Map(Object.entries(conversation.branches || {}));
          this.sessions.set(conversationId, conversation);
          return conversation;
        }
      } catch (error) {
        console.error('Failed to get conversation from Redis:', error);
      }
    }

    return null;
  }

  async addMessage(conversationId, message, options = {}) {
    const conversation = await this.getConversation(conversationId);
    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`);
    }

    const messageObj = {
      id: this.generateMessageId(),
      role: message.role,
      content: message.content,
      timestamp: Date.now(),
      tokens: options.tokens,
      metadata: {
        model: options.model || conversation.metadata.model,
        temperature: options.temperature || conversation.metadata.temperature,
        ...options.metadata
      }
    };

    conversation.messages.push(messageObj);
    conversation.updatedAt = Date.now();
    conversation.stats.messageCount++;

    await this.saveConversation(conversation);

    return messageObj;
  }

  async sendMessage(conversationId, userMessage, options = {}) {
    const conversation = await this.getConversation(conversationId);
    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`);
    }

    const messages = this.buildContext(conversation, options);

    messages.push({
      role: 'user',
      content: userMessage
    });

    await this.addMessage(conversationId, {
      role: 'user',
      content: userMessage
    }, options);

    try {
      const response = await aiManager.call(messages, {
        ...options,
        userId: conversation.userId,
        provider: options.provider || conversation.metadata.model
      });

      const assistantMessage = await this.addMessage(conversationId, {
        role: 'assistant',
        content: response.content
      }, {
        tokens: response.usage?.total_tokens
      });

      conversation.stats.totalTokens += response.usage?.total_tokens || 0;
      conversation.stats.totalCost += this.calculateCost(response);
      await this.saveConversation(conversation);

      return {
        message: assistantMessage,
        response,
        conversation: this.getConversationSummary(conversation)
      };
    } catch (error) {
      console.error('AI call failed:', error);
      throw error;
    }
  }

  buildContext(conversation, options = {}) {
    const messages = [];
    const systemPrompt = options.systemPrompt || conversation.metadata.systemPrompt;

    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }

    let contextHistory = conversation.messages.slice(-this.maxHistoryLength);

    if (options.branchId) {
      const branch = conversation.branches.get(options.branchId);
      if (branch) {
        contextHistory = contextHistory.slice(0, branch.messageIndex);
      }
    }

    if (this.shouldSummarize(contextHistory)) {
      const summary = this.summarizeHistory(contextHistory);
      messages.push({
        role: 'system',
        content: `Previous conversation summary: ${summary}`
      });
      contextHistory = contextHistory.slice(-5);
    }

    contextHistory.forEach(msg => {
      messages.push({
        role: msg.role,
        content: msg.content
      });
    });

    return messages;
  }

  shouldSummarize(history) {
    const estimatedTokens = this.estimateTokens(history);
    return estimatedTokens > this.maxContextTokens;
  }

  estimateTokens(messages) {
    return messages.reduce((total, msg) => {
      return total + Math.ceil((msg.content?.length || 0) / 4);
    }, 0);
  }

  summarizeHistory(messages) {
    const summaryLength = Math.min(5, messages.length);
    const recentMessages = messages.slice(-summaryLength);
    return recentMessages.map(m => `${m.role}: ${m.content.substring(0, 100)}`).join('; ');
  }

  async createBranch(conversationId, branchFromMessageId, branchName) {
    if (!this.enableBranching) {
      throw new Error('Branching is not enabled');
    }

    const conversation = await this.getConversation(conversationId);
    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`);
    }

    const messageIndex = conversation.messages.findIndex(m => m.id === branchFromMessageId);
    if (messageIndex === -1) {
      throw new Error(`Message ${branchFromMessageId} not found`);
    }

    const branchId = this.generateBranchId();
    const branch = {
      id: branchId,
      name: branchName,
      createdAt: Date.now(),
      messageIndex,
      parentMessageId: branchFromMessageId,
      messages: conversation.messages.slice(0, messageIndex + 1)
    };

    conversation.branches.set(branchId, branch);
    await this.saveConversation(conversation);

    return branch;
  }

  async switchBranch(conversationId, branchId) {
    const conversation = await this.getConversation(conversationId);
    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`);
    }

    const branch = conversation.branches.get(branchId);
    if (!branch) {
      throw new Error(`Branch ${branchId} not found`);
    }

    return branch;
  }

  async getConversationHistory(conversationId, options = {}) {
    const conversation = await this.getConversation(conversationId);
    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`);
    }

    let messages = conversation.messages;

    if (options.branchId) {
      const branch = conversation.branches.get(options.branchId);
      if (branch) {
        messages = branch.messages;
      }
    }

    if (options.limit) {
      messages = messages.slice(-options.limit);
    }

    return messages;
  }

  async searchConversations(userId, query, options = {}) {
    if (!this.redisConnected) {
      return [];
    }

    try {
      const conversationIds = await redisClient.sMembers(`user:conversations:${userId}`);
      const results = [];

      for (const convId of conversationIds) {
        const conversation = await this.getConversation(convId);
        if (conversation) {
          const searchInMessages = conversation.messages.some(m =>
            m.content.toLowerCase().includes(query.toLowerCase())
          );

          if (searchInMessages) {
            results.push({
              id: conversation.id,
              title: conversation.title,
              matchedMessages: conversation.messages.filter(m =>
                m.content.toLowerCase().includes(query.toLowerCase())
              )
            });
          }
        }
      }

      return results.slice(0, options.limit || 10);
    } catch (error) {
      console.error('Search failed:', error);
      return [];
    }
  }

  async deleteConversation(conversationId) {
    if (this.sessions.has(conversationId)) {
      this.sessions.delete(conversationId);
    }

    if (this.redisConnected) {
      try {
        await redisClient.del(`conversation:${conversationId}`);
      } catch (error) {
        console.error('Failed to delete conversation from Redis:', error);
      }
    }

    return true;
  }

  async updateConversationTitle(conversationId, title) {
    const conversation = await this.getConversation(conversationId);
    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`);
    }

    conversation.title = title;
    conversation.updatedAt = Date.now();
    await this.saveConversation(conversation);

    return conversation;
  }

  async getUserConversations(userId, options = {}) {
    if (!this.redisConnected) {
      return [];
    }

    try {
      const conversationIds = await redisClient.sMembers(`user:conversations:${userId}`);
      const conversations = [];

      for (const convId of conversationIds.slice(0, options.limit || 50)) {
        const conversation = await this.getConversation(convId);
        if (conversation) {
          conversations.push(this.getConversationSummary(conversation));
        }
      }

      return conversations.sort((a, b) => b.updatedAt - a.updatedAt);
    } catch (error) {
      console.error('Failed to get user conversations:', error);
      return [];
    }
  }

  getConversationSummary(conversation) {
    return {
      id: conversation.id,
      title: conversation.title,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      messageCount: conversation.stats.messageCount,
      totalTokens: conversation.stats.totalTokens,
      totalCost: conversation.stats.totalCost,
      tags: conversation.metadata.tags,
      branches: Array.from(conversation.branches.keys())
    };
  }

  async saveConversation(conversation) {
    if (this.redisConnected) {
      try {
        const serializable = {
          ...conversation,
          branches: Object.fromEntries(conversation.branches)
        };
        await redisClient.setEx(
          `conversation:${conversation.id}`,
          this.conversationTTL,
          JSON.stringify(serializable)
        );
      } catch (error) {
        console.error('Failed to save conversation:', error);
      }
    }
  }

  generateConversationId() {
    return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateMessageId() {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateBranchId() {
    return `branch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getDefaultSystemPrompt() {
    return `You are a helpful AI assistant. Provide accurate, helpful, and respectful responses.`;
  }

  calculateCost(response) {
    const pricing = {
      prompt: 0.0015,
      completion: 0.002
    };
    const usage = response.usage || {};
    const inputCost = (usage.prompt_tokens || 0) * pricing.prompt;
    const outputCost = (usage.completion_tokens || 0) * pricing.completion;
    return (inputCost + outputCost) / 1000;
  }

  async cleanup() {
    const now = Date.now();
    const expiredConversations = [];

    for (const [id, conv] of this.sessions) {
      if (now - conv.updatedAt > this.conversationTTL * 1000) {
        expiredConversations.push(id);
      }
    }

    for (const id of expiredConversations) {
      await this.deleteConversation(id);
    }

    return expiredConversations.length;
  }
}

const conversationManager = new ConversationManager();

module.exports = {
  ConversationManager,
  conversationManager
};
