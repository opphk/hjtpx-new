/**
 * Room Manager Service
 * 
 * Manages collaboration rooms including creation, joining, leaving, and cleanup.
 * Uses Redis for persistence and state management.
 * 
 * Features:
 * - Room creation with customizable settings and permissions
 * - Member management with roles (admin, moderator, member, guest)
 * - Room persistence to Redis
 * - Automatic cleanup of inactive rooms
 * - User room tracking
 */

const redisClient = require('../../../config/redis/client');
const { logInfo, logWarning, logError } = require('../../middleware/logger');

class RoomManager {
  constructor() {
    this.rooms = new Map();
    this.roomConfigs = {
      maxRoomSize: parseInt(process.env.WS_MAX_ROOM_SIZE) || 100,
      roomTTL: parseInt(process.env.WS_ROOM_TTL) || 3600,
      cleanupInterval: parseInt(process.env.WS_ROOM_CLEANUP_INTERVAL) || 60000,
      maxRoomsPerUser: parseInt(process.env.WS_MAX_ROOMS_PER_USER) || 10
    };
    
    this.startCleanupTimer();
  }

  /**
   * Creates a new collaboration room
   * @param {string} roomId - Unique room identifier
   * @param {Object} options - Room configuration options
   * @returns {Promise<Object>} Created room object
   */
  async createRoom(roomId, options = {}) {
    if (this.rooms.has(roomId)) {
      logWarning('Room already exists', { roomId });
      return this.rooms.get(roomId);
    }

    const room = {
      id: roomId,
      name: options.name || roomId,
      description: options.description || '',
      createdBy: options.createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
      maxSize: options.maxSize || this.roomConfigs.maxRoomSize,
      isPrivate: options.isPrivate || false,
      password: options.password || null,
      members: new Map(),
      admins: new Set(options.admins || []),
      metadata: options.metadata || {},
      permissions: {
        canSendMessages: options.canSendMessages !== false,
        canInviteUsers: options.canInviteUsers !== false,
        canRemoveUsers: options.canRemoveUsers || false,
        canEditRoom: options.canEditRoom || false,
        ...options.permissions
      },
      settings: {
        allowGuestMessages: options.allowGuestMessages || false,
        onlyAdminsCanPost: options.onlyAdminsCanPost || false,
        muteNewMembers: options.muteNewMembers || false,
        ...options.settings
      }
    };

    this.rooms.set(roomId, room);
    await this.persistRoomToRedis(room);
    
    logInfo('Room created', { roomId, createdBy: options.createdBy });
    return room;
  }

  /**
   * Handles user joining a room
   * @param {string} socketId - Socket connection ID
   * @param {string} userId - User ID
   * @param {string} roomId - Room ID to join
   * @param {Object} options - Join options (password, notifications, etc.)
   * @returns {Promise<Object>} Join result with room and member info
   */
  async joinRoom(socketId, userId, roomId, options = {}) {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    if (room.members.size >= room.maxSize) {
      throw new Error('Room is full');
    }

    if (room.isPrivate && options.password !== room.password) {
      throw new Error('Invalid room password');
    }

    const member = {
      socketId,
      userId,
      joinedAt: new Date(),
      role: room.admins.has(userId) ? 'admin' : 'member',
      isActive: true,
      lastActivity: new Date(),
      notifications: options.notifications !== false,
      customStatus: options.customStatus || null
    };

    room.members.set(socketId, member);
    room.updatedAt = new Date();

    await this.persistRoomToRedis(room);
    await this.updateUserRoomsInRedis(userId, roomId, 'add');

    logInfo('User joined room', { roomId, userId, socketId });

    return {
      room,
      member,
      memberCount: room.members.size,
      admins: Array.from(room.admins),
      members: this.getRoomMembers(roomId)
    };
  }

  /**
   * Handles user leaving a room
   * @param {string} socketId - Socket connection ID
   * @param {string} userId - User ID
   * @param {string} roomId - Room ID to leave
   * @returns {Promise<boolean>} Success status
   */
  async leaveRoom(socketId, userId, roomId) {
    const room = this.rooms.get(roomId);
    if (!room) {
      logWarning('Room not found when leaving', { roomId, userId });
      return false;
    }

    const member = room.members.get(socketId);
    if (!member || member.userId !== userId) {
      logWarning('User not in room', { roomId, userId });
      return false;
    }

    room.members.delete(socketId);
    room.updatedAt = new Date();

    if (room.members.size === 0) {
      await this.deleteRoom(roomId);
    } else {
      await this.persistRoomToRedis(room);
    }

    await this.updateUserRoomsInRedis(userId, roomId, 'remove');

    logInfo('User left room', { roomId, userId, socketId });

    return true;
  }

  /**
   * Deletes a room and cleans up associated data
   * @param {string} roomId - Room ID to delete
   * @returns {Promise<boolean>} Success status
   */
  async deleteRoom(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) {
      return false;
    }

    for (const [socketId, member] of room.members) {
      await this.updateUserRoomsInRedis(member.userId, roomId, 'remove');
    }

    this.rooms.delete(roomId);
    await this.removeRoomFromRedis(roomId);

    logInfo('Room deleted', { roomId });
    return true;
  }

  /**
   * Gets room information by ID
   * @param {string} roomId - Room ID
   * @returns {Object|null} Room object or null
   */
  getRoom(roomId) {
    return this.rooms.get(roomId);
  }

  /**
   * Gets all members of a room
   * @param {string} roomId - Room ID
   * @returns {Array} Array of member objects
   */
  getRoomMembers(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return [];

    return Array.from(room.members.entries()).map(([socketId, member]) => ({
      socketId,
      userId: member.userId,
      joinedAt: member.joinedAt,
      role: member.role,
      isActive: member.isActive,
      lastActivity: member.lastActivity,
      customStatus: member.customStatus
    }));
  }

  /**
   * Gets all rooms a user is a member of
   * @param {string} userId - User ID
   * @returns {Array} Array of user's room memberships
   */
  getUserRooms(userId) {
    const userRooms = [];
    for (const [roomId, room] of this.rooms.entries()) {
      for (const [socketId, member] of room.members) {
        if (member.userId === userId) {
          userRooms.push({
            roomId,
            roomName: room.name,
            role: member.role,
            joinedAt: member.joinedAt,
            memberCount: room.members.size,
            isActive: member.isActive
          });
          break;
        }
      }
    }
    return userRooms;
  }

  /**
   * Updates member status in a room
   * @param {string} roomId - Room ID
   * @param {string} socketId - Socket connection ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object|null>} Updated member or null
   */
  async updateMemberStatus(roomId, socketId, updates) {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    const member = room.members.get(socketId);
    if (!member) return null;

    Object.assign(member, updates, { lastActivity: new Date() });
    room.updatedAt = new Date();

    await this.persistRoomToRedis(room);

    return member;
  }

  /**
   * Adds a user as admin to a room
   * @param {string} roomId - Room ID
   * @param {string} userId - User ID to promote
   * @returns {Promise<boolean>} Success status
   */
  async addAdmin(roomId, userId) {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    room.admins.add(userId);
    room.updatedAt = new Date();

    for (const [socketId, member] of room.members) {
      if (member.userId === userId) {
        member.role = 'admin';
        break;
      }
    }

    await this.persistRoomToRedis(room);
    logInfo('Admin added to room', { roomId, userId });
    return true;
  }

  /**
   * Removes admin status from a user
   * @param {string} roomId - Room ID
   * @param {string} userId - User ID to demote
   * @returns {Promise<boolean>} Success status
   */
  async removeAdmin(roomId, userId) {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    room.admins.delete(userId);
    room.updatedAt = new Date();

    for (const [socketId, member] of room.members) {
      if (member.userId === userId) {
        member.role = 'member';
        break;
      }
    }

    await this.persistRoomToRedis(room);
    logInfo('Admin removed from room', { roomId, userId });
    return true;
  }

  /**
   * Updates room settings
   * @param {string} roomId - Room ID
   * @param {Object} settings - Settings to update
   * @returns {Promise<Object|null>} Updated room or null
   */
  async updateRoomSettings(roomId, settings) {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    Object.assign(room.settings, settings);
    Object.assign(room.permissions, settings.permissions || {});
    room.updatedAt = new Date();

    await this.persistRoomToRedis(room);
    return room;
  }

  /**
   * Updates room metadata
   * @param {string} roomId - Room ID
   * @param {Object} metadata - Metadata to update
   * @returns {Promise<Object|null>} Updated room or null
   */
  async updateRoomMetadata(roomId, metadata) {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    Object.assign(room.metadata, metadata);
    room.updatedAt = new Date();

    await this.persistRoomToRedis(room);
    return room;
  }

  /**
   * Gets filtered list of rooms
   * @param {Object} options - Filter options
   * @returns {Array} Filtered room list
   */
  getRooms(options = {}) {
    const {
      includePrivate = false,
      minMembers = 0,
      maxMembers = Infinity,
      createdBy = null,
      searchTerm = ''
    } = options;

    const filteredRooms = [];

    for (const [roomId, room] of this.rooms.entries()) {
      if (room.isPrivate && !includePrivate) continue;
      if (room.members.size < minMembers) continue;
      if (room.members.size > maxMembers) continue;
      if (createdBy && room.createdBy !== createdBy) continue;
      if (searchTerm && !room.name.toLowerCase().includes(searchTerm.toLowerCase())) continue;

      filteredRooms.push({
        id: roomId,
        name: room.name,
        description: room.description,
        createdBy: room.createdBy,
        createdAt: room.createdAt,
        memberCount: room.members.size,
        maxSize: room.maxSize,
        isPrivate: room.isPrivate,
        metadata: room.metadata
      });
    }

    return filteredRooms.sort((a, b) => b.memberCount - a.memberCount);
  }

  /**
   * Gets the number of rooms a user is in
   * @param {string} userId - User ID
   * @returns {Promise<number>} Room count
   */
  async getUserRoomCount(userId) {
    try {
      const key = `user:${userId}:rooms`;
      const rooms = await redisClient.sMembers(key);
      return rooms.length;
    } catch (error) {
      logError('Error getting user room count from Redis', { error: error.message });
      return this.getUserRooms(userId).length;
    }
  }

  /**
   * Persists room data to Redis for durability
   * @param {Object} room - Room object to persist
   */
  async persistRoomToRedis(room) {
    try {
      const roomData = {
        ...room,
        members: Array.from(room.members.entries()),
        admins: Array.from(room.admins)
      };
      await redisClient.setEx(
        `room:${room.id}`,
        this.roomConfigs.roomTTL,
        JSON.stringify(roomData)
      );
    } catch (error) {
      logError('Error persisting room to Redis', { error: error.message });
    }
  }

  /**
   * Removes room from Redis
   * @param {string} roomId - Room ID
   */
  async removeRoomFromRedis(roomId) {
    try {
      await redisClient.del(`room:${roomId}`);
    } catch (error) {
      logError('Error removing room from Redis', { error: error.message });
    }
  }

  /**
   * Updates user's room membership in Redis
   * @param {string} userId - User ID
   * @param {string} roomId - Room ID
   * @param {string} action - 'add' or 'remove'
   */
  async updateUserRoomsInRedis(userId, roomId, action) {
    try {
      const key = `user:${userId}:rooms`;
      if (action === 'add') {
        await redisClient.sAdd(key, roomId);
        await redisClient.expire(key, this.roomConfigs.roomTTL * 2);
      } else if (action === 'remove') {
        await redisClient.sRem(key, roomId);
      }
    } catch (error) {
      logError('Error updating user rooms in Redis', { error: error.message });
    }
  }

  /**
   * Loads room data from Redis
   * @param {string} roomId - Room ID
   * @returns {Promise<Object|null>} Loaded room or null
   */
  async loadRoomFromRedis(roomId) {
    try {
      const data = await redisClient.get(`room:${roomId}`);
      if (data) {
        const roomData = JSON.parse(data);
        roomData.members = new Map(roomData.members);
        roomData.admins = new Set(roomData.admins);
        this.rooms.set(roomId, roomData);
        return roomData;
      }
      return null;
    } catch (error) {
      logError('Error loading room from Redis', { error: error.message });
      return null;
    }
  }

  /**
   * Starts the periodic cleanup timer for inactive rooms
   */
  startCleanupTimer() {
    this.cleanupInterval = setInterval(async () => {
      await this.cleanupInactiveRooms();
    }, this.roomConfigs.cleanupInterval);
  }

  /**
   * Cleans up rooms that have been inactive for too long
   */
  async cleanupInactiveRooms() {
    const now = Date.now();
    const inactiveThreshold = 30 * 60 * 1000;
    const roomsToDelete = [];

    for (const [roomId, room] of this.rooms.entries()) {
      if (room.members.size === 0) {
        roomsToDelete.push(roomId);
      } else {
        let allInactive = true;
        for (const member of room.members.values()) {
          if (now - member.lastActivity.getTime() < inactiveThreshold) {
            allInactive = false;
            break;
          }
        }
        if (allInactive) {
          roomsToDelete.push(roomId);
        }
      }
    }

    for (const roomId of roomsToDelete) {
      await this.deleteRoom(roomId);
      logInfo('Cleaned up inactive room', { roomId });
    }
  }

  /**
   * Gets room manager statistics
   * @returns {Object} Statistics object
   */
  getStatistics() {
    let totalMembers = 0;
    let totalRooms = this.rooms.size;

    for (const room of this.rooms.values()) {
      totalMembers += room.members.size;
    }

    return {
      totalRooms,
      totalMembers,
      averageMembersPerRoom: totalRooms > 0 ? totalMembers / totalRooms : 0,
      privateRooms: Array.from(this.rooms.values()).filter(r => r.isPrivate).length,
      publicRooms: Array.from(this.rooms.values()).filter(r => !r.isPrivate).length
    };
  }

  /**
   * Stops the room manager and cleans up resources
   */
  stop() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

const roomManager = new RoomManager();

module.exports = roomManager;
