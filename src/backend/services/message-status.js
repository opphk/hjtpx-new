const redisClient = require('../../../config/redis/client');
const { logInfo, logWarning, logError } = require('../../middleware/logger');

class MessageStatusService {
  constructor() {
    this.config = {
      maxMessagesPerThread: parseInt(process.env.MAX_MESSAGES_PER_THREAD) || 1000,
      messageTTL: parseInt(process.env.MESSAGE_TTL) || 30 * 24 * 60 * 60,
      readReceiptTTL: parseInt(process.env.READ_RECEIPT_TTL) || 7 * 24 * 60 * 60,
      typingTimeout: parseInt(process.env.TYPING_TIMEOUT) || 5000,
      deliveryTimeout: parseInt(process.env.DELIVERY_TIMEOUT) || 30000
    };

    this.typingUsers = new Map();
    this.messageCache = new Map();
    this.startTypingCleanup();
  }

  async sendMessage(options) {
    const {
      threadId,
      senderId,
      content,
      messageType = 'text',
      replyTo = null,
      mentions = [],
      metadata = {}
    } = options;

    const message = {
      id: this.generateMessageId(),
      threadId,
      senderId,
      content,
      messageType,
      replyTo,
      mentions,
      metadata,
      status: 'sent',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    try {
      await this.persistMessage(message);
      await this.addToThread(message);

      await this.processMentions(message);

      await this.updateDeliveryStatus(message.id, 'sent');

      logInfo('Message sent', { 
        messageId: message.id, 
        threadId, 
        senderId 
      });

      return message;
    } catch (error) {
      logError('Error sending message', { 
        error: error.message, 
        threadId, 
        senderId 
      });
      throw error;
    }
  }

  async editMessage(messageId, userId, newContent) {
    const message = await this.getMessage(messageId);
    if (!message) {
      throw new Error('Message not found');
    }

    if (message.senderId !== userId) {
      throw new Error('Not authorized to edit this message');
    }

    const oldContent = message.content;
    message.content = newContent;
    message.editedAt = new Date();
    message.editCount = (message.editCount || 0) + 1;
    message.updatedAt = new Date();

    await this.persistMessage(message);
    await this.updateThreadMessage(message);

    logInfo('Message edited', { messageId, userId });

    return {
      ...message,
      oldContent,
      newContent
    };
  }

  async deleteMessage(messageId, userId, hardDelete = false) {
    const message = await this.getMessage(messageId);
    if (!message) {
      throw new Error('Message not found');
    }

    if (message.senderId !== userId) {
      throw new Error('Not authorized to delete this message');
    }

    if (hardDelete) {
      await this.removeMessage(message);
      logInfo('Message hard deleted', { messageId, userId });
    } else {
      message.deleted = true;
      message.deletedAt = new Date();
      message.deletedBy = userId;
      await this.persistMessage(message);
      await this.updateThreadMessage(message);
      logInfo('Message soft deleted', { messageId, userId });
    }

    return { success: true, messageId };
  }

  async reactToMessage(messageId, userId, reaction) {
    const message = await this.getMessage(messageId);
    if (!message) {
      throw new Error('Message not found');
    }

    if (!message.reactions) {
      message.reactions = {};
    }

    if (!message.reactions[reaction]) {
      message.reactions[reaction] = [];
    }

    const reactionIndex = message.reactions[reaction].indexOf(userId);
    
    if (reactionIndex === -1) {
      message.reactions[reaction].push(userId);
    } else {
      message.reactions[reaction].splice(reactionIndex, 1);
      if (message.reactions[reaction].length === 0) {
        delete message.reactions[reaction];
      }
    }

    await this.persistMessage(message);

    return {
      messageId,
      reaction,
      action: reactionIndex === -1 ? 'added' : 'removed',
      count: message.reactions[reaction]?.length || 0,
      users: message.reactions[reaction] || []
    };
  }

  async updateDeliveryStatus(messageId, status) {
    try {
      const statusMap = {
        'sent': 0,
        'delivered': 1,
        'read': 2
      };

      await redisClient.zAdd(`message:status:${messageId}`, {
        score: statusMap[status] || 0,
        value: JSON.stringify({
          status,
          timestamp: Date.now()
        })
      });

      await redisClient.expire(`message:status:${messageId}`, this.config.readReceiptTTL);
    } catch (error) {
      logError('Error updating delivery status', { error: error.message });
    }
  }

  async markAsRead(messageId, userId) {
    try {
      await redisClient.sAdd(`message:read:${messageId}`, userId);
      await redisClient.expire(`message:read:${messageId}`, this.config.readReceiptTTL);

      await this.updateDeliveryStatus(messageId, 'read');

      const threadId = await this.getMessageThreadId(messageId);
      if (threadId) {
        await this.updateThreadReadStatus(threadId, userId, messageId);
      }

      logInfo('Message marked as read', { messageId, userId });
    } catch (error) {
      logError('Error marking message as read', { error: error.message });
    }
  }

  async markThreadAsRead(threadId, userId, untilMessageId = null) {
    try {
      const messages = await this.getThreadMessages(threadId, {
        limit: 1000,
        until: untilMessageId
      });

      for (const message of messages) {
        if (message.senderId !== userId) {
          await this.markAsRead(message.id, userId);
        }
      }

      logInfo('Thread marked as read', { threadId, userId, messageCount: messages.length });
    } catch (error) {
      logError('Error marking thread as read', { error: error.message });
    }
  }

  async getReadStatus(messageId) {
    try {
      const readers = await redisClient.sMembers(`message:read:${messageId}`);
      return {
        messageId,
        readBy: readers,
        readCount: readers.length
      };
    } catch (error) {
      logError('Error getting read status', { error: error.message });
      return { messageId, readBy: [], readCount: 0 };
    }
  }

  async startTyping(threadId, userId) {
    const key = `typing:${threadId}:${userId}`;
    
    await redisClient.setEx(key, Math.ceil(this.config.typingTimeout / 1000), Date.now().toString());

    if (!this.typingUsers.has(threadId)) {
      this.typingUsers.set(threadId, new Set());
    }
    this.typingUsers.get(threadId).add(userId);

    return {
      threadId,
      userId,
      isTyping: true,
      timestamp: Date.now()
    };
  }

  async stopTyping(threadId, userId) {
    const key = `typing:${threadId}:${userId}`;
    await redisClient.del(key);

    if (this.typingUsers.has(threadId)) {
      this.typingUsers.get(threadId).delete(userId);
      if (this.typingUsers.get(threadId).size === 0) {
        this.typingUsers.delete(threadId);
      }
    }

    return {
      threadId,
      userId,
      isTyping: false,
      timestamp: Date.now()
    };
  }

  getTypingUsers(threadId) {
    const typing = this.typingUsers.get(threadId);
    if (!typing) return [];

    const now = Date.now();
    const activeTyping = [];

    for (const userId of typing) {
      activeTyping.push({
        userId,
        isTyping: true
      });
    }

    return activeTyping;
  }

  async processMentions(message) {
    if (!message.mentions || message.mentions.length === 0) {
      return [];
    }

    const mentionedUsers = [];
    for (const userId of message.mentions) {
      mentionedUsers.push({
        userId,
        messageId: message.id,
        mentionedAt: new Date()
      });

      await redisClient.sAdd(`user:${userId}:mentions`, message.id);
      await redisClient.expire(`user:${userId}:mentions`, this.config.messageTTL);
    }

    return mentionedUsers;
  }

  async getMentions(userId, options = {}) {
    const { limit = 50, offset = 0 } = options;

    try {
      const mentionIds = await redisClient.sMembers(`user:${userId}:mentions`);
      const paginatedIds = mentionIds.slice(offset, offset + limit);

      const messages = [];
      for (const messageId of paginatedIds) {
        const message = await this.getMessage(messageId);
        if (message) {
          messages.push(message);
        }
      }

      return {
        messages,
        total: mentionIds.length,
        hasMore: offset + limit < mentionIds.length
      };
    } catch (error) {
      logError('Error getting mentions', { error: error.message });
      return { messages: [], total: 0, hasMore: false };
    }
  }

  async createThread(options) {
    const {
      participants,
      title,
      type = 'direct',
      metadata = {}
    } = options;

    const thread = {
      id: this.generateThreadId(),
      participants,
      title: title || this.generateThreadTitle(participants),
      type,
      metadata,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastMessageAt: new Date(),
      messageCount: 0,
      unreadCounts: {}
    };

    for (const userId of participants) {
      thread.unreadCounts[userId] = 0;
    }

    await this.persistThread(thread);

    logInfo('Thread created', { threadId: thread.id, participants });

    return thread;
  }

  async getThread(threadId) {
    try {
      const data = await redisClient.get(`thread:${threadId}`);
      if (data) {
        return JSON.parse(data);
      }
      return null;
    } catch (error) {
      logError('Error getting thread', { error: error.message });
      return null;
    }
  }

  async getThreadMessages(threadId, options = {}) {
    const { limit = 50, offset = 0, until = null } = options;

    try {
      const messages = await redisClient.lRange(`thread:${threadId}:messages`, offset, offset + limit - 1);
      return messages.map(m => JSON.parse(m)).reverse();
    } catch (error) {
      logError('Error getting thread messages', { error: error.message });
      return [];
    }
  }

  async getUnreadCount(userId, threadId = null) {
    try {
      if (threadId) {
        const thread = await this.getThread(threadId);
        return thread?.unreadCounts?.[userId] || 0;
      }

      let totalUnread = 0;
      const userThreads = await this.getUserThreads(userId);
      
      for (const thread of userThreads) {
        totalUnread += thread.unreadCounts?.[userId] || 0;
      }

      return totalUnread;
    } catch (error) {
      logError('Error getting unread count', { error: error.message });
      return 0;
    }
  }

  async getUserThreads(userId, options = {}) {
    const { limit = 20, offset = 0 } = options;

    try {
      const threadIds = await redisClient.lRange(`user:${userId}:threads`, offset, offset + limit - 1);
      const threads = [];

      for (const threadId of threadIds) {
        const thread = await this.getThread(threadId);
        if (thread && thread.participants.includes(userId)) {
          threads.push(thread);
        }
      }

      return threads;
    } catch (error) {
      logError('Error getting user threads', { error: error.message });
      return [];
    }
  }

  async persistMessage(message) {
    try {
      await redisClient.setEx(
        `message:${message.id}`,
        this.config.messageTTL,
        JSON.stringify(message)
      );

      this.messageCache.set(message.id, message);
    } catch (error) {
      logError('Error persisting message', { error: error.message });
    }
  }

  async getMessage(messageId) {
    if (this.messageCache.has(messageId)) {
      return this.messageCache.get(messageId);
    }

    try {
      const data = await redisClient.get(`message:${messageId}`);
      if (data) {
        const message = JSON.parse(data);
        this.messageCache.set(messageId, message);
        return message;
      }
      return null;
    } catch (error) {
      logError('Error getting message', { error: error.message });
      return null;
    }
  }

  async removeMessage(message) {
    try {
      await redisClient.del(`message:${message.id}`);
      this.messageCache.delete(message.id);
    } catch (error) {
      logError('Error removing message', { error: error.message });
    }
  }

  async persistThread(thread) {
    try {
      await redisClient.setEx(
        `thread:${thread.id}`,
        this.config.messageTTL,
        JSON.stringify(thread)
      );

      for (const userId of thread.participants) {
        await redisClient.lPush(`user:${userId}:threads`, thread.id);
      }
    } catch (error) {
      logError('Error persisting thread', { error: error.message });
    }
  }

  async addToThread(message) {
    try {
      await redisClient.lPush(`thread:${message.threadId}:messages`, JSON.stringify(message));
      await redisClient.lTrim(`thread:${message.threadId}:messages`, 0, this.config.maxMessagesPerThread - 1);

      const thread = await this.getThread(message.threadId);
      if (thread) {
        thread.lastMessageAt = message.createdAt;
        thread.messageCount++;
        thread.updatedAt = new Date();

        for (const userId of thread.participants) {
          if (userId !== message.senderId) {
            thread.unreadCounts[userId] = (thread.unreadCounts[userId] || 0) + 1;
          }
        }

        await this.persistThread(thread);
      }
    } catch (error) {
      logError('Error adding message to thread', { error: error.message });
    }
  }

  async updateThreadMessage(message) {
    try {
      await redisClient.setEx(
        `message:${message.id}`,
        this.config.messageTTL,
        JSON.stringify(message)
      );
    } catch (error) {
      logError('Error updating thread message', { error: error.message });
    }
  }

  async updateThreadReadStatus(threadId, userId, messageId) {
    try {
      const thread = await this.getThread(threadId);
      if (thread && thread.unreadCounts?.[userId] !== undefined) {
        thread.unreadCounts[userId] = 0;
        thread.updatedAt = new Date();
        await this.persistThread(thread);
      }
    } catch (error) {
      logError('Error updating thread read status', { error: error.message });
    }
  }

  async getMessageThreadId(messageId) {
    const message = await this.getMessage(messageId);
    return message?.threadId || null;
  }

  generateMessageId() {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateThreadId() {
    return `thread_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateThreadTitle(participants) {
    return `Chat with ${participants.length} participant${participants.length > 1 ? 's' : ''}`;
  }

  startTypingCleanup() {
    this.typingCleanupInterval = setInterval(async () => {
      await this.cleanupExpiredTyping();
    }, this.config.typingTimeout);
  }

  async cleanupExpiredTyping() {
    const now = Date.now();
    for (const [threadId, users] of this.typingUsers.entries()) {
      for (const userId of users) {
        try {
          const key = `typing:${threadId}:${userId}`;
          const timestamp = await redisClient.get(key);
          if (!timestamp || now - parseInt(timestamp) > this.config.typingTimeout) {
            users.delete(userId);
          }
        } catch (error) {
          logError('Error cleaning up typing status', { error: error.message });
        }
      }
      if (users.size === 0) {
        this.typingUsers.delete(threadId);
      }
    }
  }

  getStatistics() {
    return {
      totalCachedMessages: this.messageCache.size,
      activeThreadsWithTyping: this.typingUsers.size,
      totalTypingUsers: Array.from(this.typingUsers.values()).reduce((sum, users) => sum + users.size, 0)
    };
  }

  stop() {
    if (this.typingCleanupInterval) {
      clearInterval(this.typingCleanupInterval);
      this.typingCleanupInterval = null;
    }
    this.typingUsers.clear();
    this.messageCache.clear();
  }
}

const messageStatusService = new MessageStatusService();

module.exports = messageStatusService;
