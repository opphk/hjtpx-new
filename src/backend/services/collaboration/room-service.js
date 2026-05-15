const roomManager = require('../../websocket/room-manager');
const presenceService = require('../../websocket/presence-service');
const OperationTransform = require('./operation-transform');
const redisClient = require('../../../config/redis/client');
const { logInfo, logWarning, logError } = require('../../middleware/logger');

class CollaborationRoomService {
  constructor() {
    this.collabConfig = {
      maxDocumentSize: parseInt(process.env.COLLAB_MAX_DOCUMENT_SIZE) || 1024 * 1024,
      operationBufferSize: parseInt(process.env.COLLAB_OPERATION_BUFFER) || 100,
      checkpointInterval: parseInt(process.env.COLLAB_CHECKPOINT_INTERVAL) || 30000,
      garbageCollectionThreshold: parseInt(process.env.COLLAB_GC_THRESHOLD) || 1000,
      cursorTimeout: parseInt(process.env.COLLAB_CURSOR_TIMEOUT) || 60000
    };

    this.documents = new Map();
    this.pendingOperations = new Map();
    this.cursors = new Map();
    this.selections = new Map();
    this.versionVectors = new Map();

    this.ot = new OperationTransform();
    this.startCheckpointTimer();
  }

  async createCollaborationRoom(roomId, options = {}) {
    const { document = '', documentId, documentType = 'text' } = options;

    const room = await roomManager.createRoom(roomId, {
      name: options.name || `Collaboration: ${roomId}`,
      description: options.description || 'Real-time collaboration room',
      createdBy: options.createdBy,
      maxSize: options.maxSize || 50,
      isPrivate: options.isPrivate || false,
      ...options
    });

    const docId = documentId || `doc:${roomId}`;
    
    this.documents.set(docId, {
      id: docId,
      roomId,
      content: document,
      contentType: documentType,
      version: 0,
      lastModified: new Date(),
      lastModifiedBy: options.createdBy,
      createdAt: new Date(),
      checkpoints: [],
      operationCount: 0,
      metadata: {
        title: options.title || 'Untitled Document',
        description: options.description || '',
        tags: options.tags || [],
        ...options.metadata
      }
    });

    this.pendingOperations.set(docId, []);
    this.cursors.set(docId, new Map());
    this.selections.set(docId, new Map());
    this.versionVectors.set(docId, new Map());

    await this.saveDocumentToRedis(docId);

    logInfo('Collaboration room created', { roomId, docId });
    return { room, document: this.getDocument(docId) };
  }

  async joinCollaborationRoom(socketId, userId, roomId, options = {}) {
    const room = roomManager.getRoom(roomId);
    if (!room) {
      throw new Error('Collaboration room not found');
    }

    const result = await roomManager.joinRoom(socketId, userId, roomId, options);

    const docId = this.getDocumentIdForRoom(roomId);
    const doc = this.documents.get(docId);
    
    if (doc) {
      await this.initializeUserVersionVector(docId, userId);
      
      this.cursors.get(docId).set(socketId, {
        position: 0,
        userId,
        lastUpdated: Date.now()
      });

      this.selections.get(docId).set(socketId, {
        start: 0,
        end: 0,
        userId,
        lastUpdated: Date.now()
      });

      return {
        ...result,
        document: this.getDocumentWithVersion(docId, userId),
        cursors: this.getRoomCursors(roomId),
        selections: this.getRoomSelections(roomId),
        versionVector: this.getVersionVector(docId)
      };
    }

    return result;
  }

  async leaveCollaborationRoom(socketId, userId, roomId) {
    const docId = this.getDocumentIdForRoom(roomId);
    
    if (this.cursors.has(docId)) {
      this.cursors.get(docId).delete(socketId);
    }
    
    if (this.selections.has(docId)) {
      this.selections.get(docId).delete(socketId);
    }

    await roomManager.leaveRoom(socketId, userId, roomId);

    return { success: true };
  }

  async applyOperation(docId, operation, userId) {
    const doc = this.documents.get(docId);
    if (!doc) {
      throw new Error('Document not found');
    }

    const clientVersion = this.getClientVersion(docId, userId);
    
    const transformedOps = await this.transformPendingOperations(docId, operation, userId, clientVersion);

    const appliedOps = [];
    for (const op of transformedOps) {
      doc.content = this.applyOpToContent(doc.content, op);
      doc.version++;
      doc.lastModified = new Date();
      doc.lastModifiedBy = userId;
      doc.operationCount++;
      
      appliedOps.push({
        ...op,
        serverVersion: doc.version,
        serverTimestamp: new Date()
      });
    }

    this.updateVersionVector(docId, userId, doc.version);
    this.saveDocumentToRedis(docId);

    logInfo('Operation applied', { docId, userId, version: doc.version });

    return {
      success: true,
      version: doc.version,
      appliedOps,
      document: doc.content
    };
  }

  async transformPendingOperations(docId, operation, userId, clientVersion) {
    const pending = this.pendingOperations.get(docId) || [];
    const transformedOps = [];
    
    let currentOp = operation;
    let currentClientVersion = clientVersion;

    for (const pendingOp of pending) {
      if (pendingOp.userId === userId) continue;
      if (pendingOp.serverVersion <= currentClientVersion) continue;

      const { transformed: [transformedOp, transformedPending] } = this.ot.transform(currentOp, pendingOp);
      transformedOps.push({
        original: currentOp,
        transformed: transformedOp,
        transformedPending,
        pendingOp
      });
      
      currentOp = transformedOp;
      currentClientVersion = pendingOp.serverVersion;
    }

    return transformedOps.length > 0 ? transformedOps.map(t => t.transformed) : [operation];
  }

  applyOpToContent(content, operation) {
    const { type, position, text, length, properties } = operation;

    switch (type) {
      case 'insert':
        return content.slice(0, position) + text + content.slice(position);
      
      case 'delete':
        return content.slice(0, position) + content.slice(position + length);
      
      case 'retain':
        return content;
      
      case 'format':
        return content;
      
      case 'replace':
        return content.slice(0, position) + text + content.slice(position + length);
      
      default:
        return content;
    }
  }

  queueOperation(docId, operation, userId) {
    if (!this.pendingOperations.has(docId)) {
      this.pendingOperations.set(docId, []);
    }

    const queue = this.pendingOperations.get(docId);
    
    if (queue.length >= this.collabConfig.operationBufferSize) {
      queue.shift();
    }

    queue.push({
      ...operation,
      userId,
      clientId: operation.clientId || this.generateClientId(),
      timestamp: Date.now()
    });

    return queue.length;
  }

  getPendingOperations(docId, userId, sinceVersion) {
    const pending = this.pendingOperations.get(docId) || [];
    return pending.filter(op => 
      op.userId !== userId && 
      (!sinceVersion || op.serverVersion > sinceVersion)
    );
  }

  async initializeUserVersionVector(docId, userId) {
    if (!this.versionVectors.has(docId)) {
      this.versionVectors.set(docId, new Map());
    }
    
    const vv = this.versionVectors.get(docId);
    if (!vv.has(userId)) {
      vv.set(userId, 0);
    }
  }

  getClientVersion(docId, userId) {
    const vv = this.versionVectors.get(docId);
    return vv ? vv.get(userId) || 0 : 0;
  }

  updateVersionVector(docId, userId, version) {
    const vv = this.versionVectors.get(docId);
    if (vv) {
      vv.set(userId, version);
    }
  }

  getVersionVector(docId) {
    const vv = this.versionVectors.get(docId);
    if (!vv) return {};
    
    const result = {};
    for (const [userId, version] of vv.entries()) {
      result[userId] = version;
    }
    return result;
  }

  updateCursor(docId, socketId, position, userId) {
    const cursors = this.cursors.get(docId);
    if (cursors) {
      cursors.set(socketId, {
        position,
        userId,
        lastUpdated: Date.now()
      });
    }
  }

  getRoomCursors(roomId) {
    const docId = this.getDocumentIdForRoom(roomId);
    const cursors = this.cursors.get(docId);
    if (!cursors) return [];

    return Array.from(cursors.entries()).map(([socketId, cursor]) => ({
      socketId,
      userId: cursor.userId,
      position: cursor.position,
      lastUpdated: cursor.lastUpdated
    }));
  }

  updateSelection(docId, socketId, start, end, userId) {
    const selections = this.selections.get(docId);
    if (selections) {
      selections.set(socketId, {
        start,
        end,
        userId,
        lastUpdated: Date.now()
      });
    }
  }

  getRoomSelections(roomId) {
    const docId = this.getDocumentIdForRoom(roomId);
    const selections = this.selections.get(docId);
    if (!selections) return [];

    return Array.from(selections.entries()).map(([socketId, selection]) => ({
      socketId,
      userId: selection.userId,
      start: selection.start,
      end: selection.end,
      lastUpdated: selection.lastUpdated
    }));
  }

  async createCheckpoint(docId) {
    const doc = this.documents.get(docId);
    if (!doc) return null;

    const checkpoint = {
      version: doc.version,
      content: doc.content,
      timestamp: new Date(),
      operationCount: doc.operationCount
    };

    doc.checkpoints.push(checkpoint);

    if (doc.checkpoints.length > 10) {
      doc.checkpoints = doc.checkpoints.slice(-10);
    }

    await this.saveDocumentToRedis(docId);

    logInfo('Checkpoint created', { docId, version: checkpoint.version });
    return checkpoint;
  }

  async restoreCheckpoint(docId, version) {
    const doc = this.documents.get(docId);
    if (!doc) return null;

    const checkpoint = doc.checkpoints.find(c => c.version === version);
    if (!checkpoint) {
      throw new Error('Checkpoint not found');
    }

    doc.content = checkpoint.content;
    doc.version = checkpoint.version;
    doc.lastModified = new Date();

    await this.saveDocumentToRedis(docId);

    logInfo('Checkpoint restored', { docId, version });
    return doc;
  }

  async saveDocumentToRedis(docId) {
    try {
      const doc = this.documents.get(docId);
      if (!doc) return;

      const data = {
        ...doc,
        checkpoints: doc.checkpoints.slice(-5)
      };

      await redisClient.setEx(
        `collab:doc:${docId}`,
        3600,
        JSON.stringify(data)
      );
    } catch (error) {
      logError('Error saving document to Redis', { error: error.message });
    }
  }

  async loadDocumentFromRedis(docId) {
    try {
      const data = await redisClient.get(`collab:doc:${docId}`);
      if (data) {
        const doc = JSON.parse(data);
        this.documents.set(docId, doc);
        return doc;
      }
      return null;
    } catch (error) {
      logError('Error loading document from Redis', { error: error.message });
      return null;
    }
  }

  getDocument(docId) {
    return this.documents.get(docId);
  }

  getDocumentWithVersion(docId, userId) {
    const doc = this.documents.get(docId);
    if (!doc) return null;

    const clientVersion = this.getClientVersion(docId, userId);
    const pendingOps = this.getPendingOperations(docId, userId, clientVersion);

    return {
      ...doc,
      clientVersion,
      pendingOperations: pendingOps.length,
      needsSync: pendingOps.length > 0
    };
  }

  getDocumentIdForRoom(roomId) {
    return `doc:${roomId}`;
  }

  startCheckpointTimer() {
    this.checkpointInterval = setInterval(async () => {
      for (const [docId, doc] of this.documents.entries()) {
        if (doc.operationCount > this.collabConfig.garbageCollectionThreshold) {
          await this.createCheckpoint(docId);
        }
      }
    }, this.collabConfig.checkpointInterval);
  }

  generateClientId() {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async handleDisconnection(socketId, userId, roomId) {
    if (roomId) {
      const docId = this.getDocumentIdForRoom(roomId);
      
      if (this.cursors.has(docId)) {
        this.cursors.get(docId).delete(socketId);
      }
      
      if (this.selections.has(docId)) {
        this.selections.get(docId).delete(socketId);
      }
    }
  }

  getCollaborationStatistics() {
    let totalDocuments = 0;
    let totalOperations = 0;
    let totalCursors = 0;

    for (const doc of this.documents.values()) {
      totalDocuments++;
      totalOperations += doc.operationCount;
    }

    for (const cursors of this.cursors.values()) {
      totalCursors += cursors.size;
    }

    return {
      totalDocuments,
      totalOperations,
      totalCursors,
      averageOperationsPerDocument: totalDocuments > 0 ? totalOperations / totalDocuments : 0
    };
  }

  stop() {
    if (this.checkpointInterval) {
      clearInterval(this.checkpointInterval);
      this.checkpointInterval = null;
    }
    this.documents.clear();
    this.pendingOperations.clear();
    this.cursors.clear();
    this.selections.clear();
    this.versionVectors.clear();
  }
}

const collaborationRoomService = new CollaborationRoomService();

module.exports = collaborationRoomService;
