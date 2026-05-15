const redisClient = require('../../../config/redis/client');
const { logInfo, logWarning, logError } = require('../../middleware/logger');

class PresenceService {
  constructor() {
    this.presenceConfig = {
      onlineTimeout: parseInt(process.env.PRESENCE_ONLINE_TIMEOUT) || 300,
      presenceTTL: parseInt(process.env.PRESENCE_TTL) || 600,
      updateInterval: parseInt(process.env.PRESENCE_UPDATE_INTERVAL) || 30,
      lastSeenThreshold: parseInt(process.env.PRESENCE_LAST_SEEN_THRESHOLD) || 300
    };

    this.userPresence = new Map();
    this.statusSubscriptions = new Map();
    this.setupPeriodicUpdate();
  }

  async setUserOnline(userId, socketId, metadata = {}) {
    const now = Date.now();
    const presence = {
      userId,
      socketId,
      status: 'online',
      firstSeen: this.userPresence.get(userId)?.firstSeen || now,
      lastSeen: now,
      lastActivity: now,
      metadata: {
        platform: metadata.platform || 'web',
        device: metadata.device || 'unknown',
        version: metadata.version || null,
        location: metadata.location || null,
        ...metadata
      },
      customStatus: metadata.customStatus || null,
      awayReason: null
    };

    this.userPresence.set(userId, presence);

    try {
      await redisClient.hSet(`presence:${userId}`, {
        status: 'online',
        socketId,
        lastSeen: now.toString(),
        metadata: JSON.stringify(presence.metadata)
      });
      await redisClient.expire(`presence:${userId}`, this.presenceConfig.presenceTTL);

      await this.notifyStatusChange(userId, 'online', presence);
    } catch (error) {
      logError('Error setting user presence in Redis', { error: error.message });
    }

    logInfo('User online', { userId, socketId });
    return presence;
  }

  async setUserOffline(userId, socketId) {
    const presence = this.userPresence.get(userId);
    if (!presence || presence.socketId !== socketId) {
      return false;
    }

    const wasOnline = presence.status === 'online';
    presence.status = 'offline';
    presence.lastSeen = Date.now();

    this.userPresence.set(userId, presence);

    try {
      await redisClient.hSet(`presence:${userId}`, {
        status: 'offline',
        lastSeen: presence.lastSeen.toString()
      });
      await redisClient.expire(`presence:${userId}`, this.presenceConfig.presenceTTL);

      if (wasOnline) {
        await this.notifyStatusChange(userId, 'offline', presence);
      }
    } catch (error) {
      logError('Error setting user offline in Redis', { error: error.message });
    }

    logInfo('User offline', { userId, socketId });
    return true;
  }

  async setUserAway(userId, socketId, reason = 'idle') {
    const presence = this.userPresence.get(userId);
    if (!presence || presence.socketId !== socketId) {
      return false;
    }

    const previousStatus = presence.status;
    presence.status = 'away';
    presence.awayReason = reason;
    presence.lastActivity = Date.now();

    this.userPresence.set(userId, presence);

    try {
      await redisClient.hSet(`presence:${userId}`, {
        status: 'away',
        awayReason: reason
      });
      await redisClient.expire(`presence:${userId}`, this.presenceConfig.presenceTTL);

      if (previousStatus !== 'away') {
        await this.notifyStatusChange(userId, 'away', presence);
      }
    } catch (error) {
      logError('Error setting user away in Redis', { error: error.message });
    }

    return true;
  }

  async updateActivity(userId, socketId) {
    const presence = this.userPresence.get(userId);
    if (!presence || presence.socketId !== socketId) {
      return false;
    }

    presence.lastActivity = Date.now();

    if (presence.status === 'away' || presence.status === 'idle') {
      presence.status = 'online';
      presence.awayReason = null;
      await this.notifyStatusChange(userId, 'online', presence);
    }

    this.userPresence.set(userId, presence);

    try {
      await redisClient.hSet(`presence:${userId}`, 'lastActivity', Date.now().toString());
      await redisClient.expire(`presence:${userId}`, this.presenceConfig.presenceTTL);
    } catch (error) {
      logError('Error updating activity in Redis', { error: error.message });
    }

    return true;
  }

  async updateCustomStatus(userId, socketId, customStatus) {
    const presence = this.userPresence.get(userId);
    if (!presence || presence.socketId !== socketId) {
      return false;
    }

    presence.customStatus = customStatus;
    presence.lastActivity = Date.now();

    this.userPresence.set(userId, presence);

    try {
      await redisClient.hSet(`presence:${userId}`, 'customStatus', customStatus);
      await redisClient.expire(`presence:${userId}`, this.presenceConfig.presenceTTL);

      await this.notifyStatusChange(userId, presence.status, presence);
    } catch (error) {
      logError('Error updating custom status in Redis', { error: error.message });
    }

    return true;
  }

  async updateMetadata(userId, socketId, metadata) {
    const presence = this.userPresence.get(userId);
    if (!presence || presence.socketId !== socketId) {
      return false;
    }

    presence.metadata = { ...presence.metadata, ...metadata };
    presence.lastActivity = Date.now();

    this.userPresence.set(userId, presence);

    try {
      await redisClient.hSet(`presence:${userId}`, 'metadata', JSON.stringify(presence.metadata));
      await redisClient.expire(`presence:${userId}`, this.presenceConfig.presenceTTL);
    } catch (error) {
      logError('Error updating metadata in Redis', { error: error.message });
    }

    return true;
  }

  getUserPresence(userId) {
    return this.userPresence.get(userId) || null;
  }

  getOnlineUsers(options = {}) {
    const {
      includeMetadata = false,
      statusFilter = null,
      minLastActivity = null
    } = options;

    const users = [];

    for (const [userId, presence] of this.userPresence.entries()) {
      if (statusFilter && presence.status !== statusFilter) continue;
      if (minLastActivity && presence.lastActivity < minLastActivity) continue;

      const userData = {
        userId,
        status: presence.status,
        lastSeen: presence.lastSeen,
        lastActivity: presence.lastActivity,
        customStatus: presence.customStatus
      };

      if (includeMetadata) {
        userData.metadata = presence.metadata;
      }

      users.push(userData);
    }

    return users;
  }

  async getOnlineFriends(userId) {
    try {
      const friends = await redisClient.sMembers(`user:${userId}:friends`);
      if (!friends || friends.length === 0) return [];

      const onlineFriends = [];
      for (const friendId of friends) {
        const presence = this.getUserPresence(friendId);
        if (presence && presence.status === 'online') {
          onlineFriends.push({
            userId: friendId,
            status: presence.status,
            customStatus: presence.customStatus,
            lastActivity: presence.lastActivity
          });
        }
      }

      return onlineFriends;
    } catch (error) {
      logError('Error getting online friends', { error: error.message });
      return [];
    }
  }

  async subscribeToStatusChanges(userId, callback) {
    if (!this.statusSubscriptions.has(userId)) {
      this.statusSubscriptions.set(userId, new Set());
    }
    this.statusSubscriptions.get(userId).add(callback);

    return () => {
      const subscriptions = this.statusSubscriptions.get(userId);
      if (subscriptions) {
        subscriptions.delete(callback);
        if (subscriptions.size === 0) {
          this.statusSubscriptions.delete(userId);
        }
      }
    };
  }

  async notifyStatusChange(userId, status, presence) {
    const subscriptions = this.statusSubscriptions.get(userId);
    if (subscriptions) {
      for (const callback of subscriptions) {
        try {
          await callback(userId, status, presence);
        } catch (error) {
          logError('Error in status change callback', { error: error.message });
        }
      }
    }
  }

  async broadcastStatusChange(io, userId, status, presence) {
    io.emit('presence:update', {
      userId,
      status,
      customStatus: presence.customStatus,
      lastActivity: presence.lastActivity,
      timestamp: new Date()
    });
  }

  setupPeriodicUpdate() {
    this.updateInterval = setInterval(async () => {
      await this.checkIdleUsers();
      await this.cleanupStalePresence();
    }, this.presenceConfig.updateInterval * 1000);
  }

  async checkIdleUsers() {
    const now = Date.now();
    const idleThreshold = 5 * 60 * 1000;

    for (const [userId, presence] of this.userPresence.entries()) {
      if (presence.status === 'online' && now - presence.lastActivity > idleThreshold) {
        await this.setUserAway(userId, presence.socketId, 'idle');
      }
    }
  }

  async cleanupStalePresence() {
    const now = Date.now();
    const staleThreshold = this.presenceConfig.lastSeenThreshold * 1000;

    for (const [userId, presence] of this.userPresence.entries()) {
      if (now - presence.lastSeen > staleThreshold) {
        await this.setUserOffline(userId, presence.socketId);
      }
    }
  }

  async syncFromRedis() {
    try {
      const keys = await redisClient.keys('presence:*');
      for (const key of keys) {
        const userId = key.replace('presence:', '');
        const data = await redisClient.hGetAll(key);
        
        if (data && data.status) {
          this.userPresence.set(userId, {
            userId,
            socketId: data.socketId || null,
            status: data.status,
            lastSeen: parseInt(data.lastSeen) || Date.now(),
            lastActivity: parseInt(data.lastActivity) || Date.now(),
            metadata: data.metadata ? JSON.parse(data.metadata) : {},
            customStatus: data.customStatus || null,
            awayReason: data.awayReason || null
          });
        }
      }
      logInfo('Presence synced from Redis', { count: keys.length });
    } catch (error) {
      logError('Error syncing presence from Redis', { error: error.message });
    }
  }

  getStatistics() {
    const stats = {
      total: this.userPresence.size,
      online: 0,
      away: 0,
      offline: 0
    };

    for (const presence of this.userPresence.values()) {
      if (presence.status === 'online') stats.online++;
      else if (presence.status === 'away') stats.away++;
      else if (presence.status === 'offline') stats.offline++;
    }

    return stats;
  }

  getLastSeen(userId) {
    const presence = this.userPresence.get(userId);
    if (!presence) return null;
    return presence.lastSeen;
  }

  async getLastSeenFromRedis(userId) {
    try {
      const data = await redisClient.hGetAll(`presence:${userId}`);
      return data.lastSeen ? parseInt(data.lastSeen) : null;
    } catch (error) {
      logError('Error getting last seen from Redis', { error: error.message });
      return null;
    }
  }

  formatLastSeen(timestamp) {
    if (!timestamp) return 'Unknown';

    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    return new Date(timestamp).toLocaleDateString();
  }

  stop() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    this.statusSubscriptions.clear();
    this.userPresence.clear();
  }
}

const presenceService = new PresenceService();

module.exports = presenceService;
