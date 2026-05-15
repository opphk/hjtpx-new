const usersIndex = {
  properties: {
    id: { type: 'keyword' },
    email: {
      type: 'text',
      analyzer: 'standard',
      fields: {
        keyword: { type: 'keyword' },
        autocomplete: {
          type: 'text',
          analyzer: 'autocomplete_analyzer',
          search_analyzer: 'autocomplete_search_analyzer'
        }
      }
    },
    username: {
      type: 'text',
      analyzer: 'standard',
      fields: {
        keyword: { type: 'keyword' },
        pinyin: {
          type: 'text',
          analyzer: 'pinyin_analyzer'
        },
        autocomplete: {
          type: 'text',
          analyzer: 'autocomplete_analyzer',
          search_analyzer: 'autocomplete_search_analyzer'
        }
      }
    },
    fullName: {
      type: 'text',
      analyzer: 'standard',
      fields: {
        pinyin: {
          type: 'text',
          analyzer: 'pinyin_analyzer'
        },
        autocomplete: {
          type: 'text',
          analyzer: 'autocomplete_analyzer',
          search_analyzer: 'autocomplete_search_analyzer'
        }
      }
    },
    firstName: {
      type: 'text',
      analyzer: 'standard',
      fields: {
        pinyin: {
          type: 'text',
          analyzer: 'pinyin_analyzer'
        }
      }
    },
    lastName: {
      type: 'text',
      analyzer: 'standard',
      fields: {
        pinyin: {
          type: 'text',
          analyzer: 'pinyin_analyzer'
        }
      }
    },
    bio: {
      type: 'text',
      analyzer: 'standard'
    },
    status: { type: 'keyword' },
    role: { type: 'keyword' },
    roles: { type: 'keyword' },
    permissions: { type: 'keyword' },
    isActive: { type: 'boolean' },
    isVerified: { type: 'boolean' },
    provider: { type: 'keyword' },
    language: { type: 'keyword' },
    timezone: { type: 'keyword' },
    avatar: { type: 'keyword', index: false },
    lastLoginAt: { type: 'date' },
    createdAt: { type: 'date' },
    updatedAt: { type: 'date' },
    deletedAt: { type: 'date' }
  }
};

const contentIndex = {
  properties: {
    id: { type: 'keyword' },
    type: { type: 'keyword' },
    title: {
      type: 'text',
      analyzer: 'standard',
      fields: {
        keyword: { type: 'keyword' },
        pinyin: {
          type: 'text',
          analyzer: 'pinyin_analyzer'
        },
        autocomplete: {
          type: 'text',
          analyzer: 'autocomplete_analyzer',
          search_analyzer: 'autocomplete_search_analyzer'
        }
      }
    },
    content: {
      type: 'text',
      analyzer: 'standard'
    },
    excerpt: {
      type: 'text',
      analyzer: 'standard'
    },
    summary: {
      type: 'text',
      analyzer: 'standard'
    },
    authorId: { type: 'keyword' },
    authorName: {
      type: 'text',
      analyzer: 'standard',
      fields: {
        keyword: { type: 'keyword' },
        pinyin: {
          type: 'text',
          analyzer: 'pinyin_analyzer'
        }
      }
    },
    tags: { type: 'keyword' },
    categories: { type: 'keyword' },
    status: { type: 'keyword' },
    visibility: { type: 'keyword' },
    views: { type: 'integer' },
    likes: { type: 'integer' },
    comments: { type: 'integer' },
    shares: { type: 'integer' },
    rating: { type: 'float' },
    featured: { type: 'boolean' },
    pinned: { type: 'boolean' },
    metadata: {
      type: 'object',
      enabled: true
    },
    language: { type: 'keyword' },
    createdAt: { type: 'date' },
    updatedAt: { type: 'date' },
    publishedAt: { type: 'date' },
    deletedAt: { type: 'date' }
  }
};

const logsIndex = {
  properties: {
    id: { type: 'keyword' },
    type: { type: 'keyword' },
    level: { type: 'keyword' },
    message: {
      type: 'text',
      analyzer: 'standard'
    },
    description: {
      type: 'text',
      analyzer: 'standard'
    },
    userId: { type: 'keyword' },
    userName: {
      type: 'text',
      analyzer: 'standard',
      fields: {
        keyword: { type: 'keyword' }
      }
    },
    ip: { type: 'keyword' },
    userAgent: { type: 'text' },
    method: { type: 'keyword' },
    path: { type: 'keyword' },
    statusCode: { type: 'integer' },
    duration: { type: 'integer' },
    error: {
      type: 'text',
      analyzer: 'standard'
    },
    stack: { type: 'text' },
    metadata: {
      type: 'object',
      enabled: true
    },
    requestId: { type: 'keyword' },
    sessionId: { type: 'keyword' },
    action: { type: 'keyword' },
    resource: { type: 'keyword' },
    source: { type: 'keyword' },
    environment: { type: 'keyword' },
    timestamp: { type: 'date' },
    createdAt: { type: 'date' }
  }
};

const notificationsIndex = {
  properties: {
    id: { type: 'keyword' },
    type: { type: 'keyword' },
    category: { type: 'keyword' },
    priority: { type: 'keyword' },
    title: {
      type: 'text',
      analyzer: 'standard',
      fields: {
        autocomplete: {
          type: 'text',
          analyzer: 'autocomplete_analyzer',
          search_analyzer: 'autocomplete_search_analyzer'
        }
      }
    },
    message: {
      type: 'text',
      analyzer: 'standard'
    },
    content: {
      type: 'text',
      analyzer: 'standard'
    },
    userId: { type: 'keyword' },
    targetUserId: { type: 'keyword' },
    senderId: { type: 'keyword' },
    senderName: { type: 'text' },
    read: { type: 'boolean' },
    archived: { type: 'boolean' },
    dismissed: { type: 'boolean' },
    link: { type: 'keyword', index: false },
    actionUrl: { type: 'keyword' },
    imageUrl: { type: 'keyword', index: false },
    data: {
      type: 'object',
      enabled: true
    },
    channels: { type: 'keyword' },
    expiresAt: { type: 'date' },
    createdAt: { type: 'date' },
    readAt: { type: 'date' }
  }
};

const apiLogsIndex = {
  properties: {
    id: { type: 'keyword' },
    method: { type: 'keyword' },
    path: { type: 'keyword' },
    query: { type: 'text' },
    body: { type: 'text' },
    headers: {
      type: 'object',
      enabled: true
    },
    ip: { type: 'keyword' },
    userId: { type: 'keyword' },
    apiKeyId: { type: 'keyword' },
    userAgent: { type: 'text' },
    statusCode: { type: 'integer' },
    responseTime: { type: 'integer' },
    responseSize: { type: 'integer' },
    cacheHit: { type: 'boolean' },
    error: { type: 'text' },
    endpoint: { type: 'keyword' },
    version: { type: 'keyword' },
    rateLimitRemaining: { type: 'integer' },
    metadata: {
      type: 'object',
      enabled: true
    },
    timestamp: { type: 'date' },
    createdAt: { type: 'date' }
  }
};

const filesIndex = {
  properties: {
    id: { type: 'keyword' },
    filename: {
      type: 'text',
      analyzer: 'standard',
      fields: {
        keyword: { type: 'keyword' },
        autocomplete: {
          type: 'text',
          analyzer: 'autocomplete_analyzer',
          search_analyzer: 'autocomplete_search_analyzer'
        }
      }
    },
    originalName: {
      type: 'text',
      analyzer: 'standard'
    },
    mimeType: { type: 'keyword' },
    extension: { type: 'keyword' },
    size: { type: 'long' },
    width: { type: 'integer' },
    height: { type: 'integer' },
    path: { type: 'keyword' },
    url: { type: 'keyword' },
    userId: { type: 'keyword' },
    folder: { type: 'keyword' },
    tags: { type: 'keyword' },
    description: {
      type: 'text',
      analyzer: 'standard'
    },
    alt: {
      type: 'text',
      analyzer: 'standard'
    },
    status: { type: 'keyword' },
    metadata: {
      type: 'object',
      enabled: true
    },
    createdAt: { type: 'date' },
    updatedAt: { type: 'date' },
    deletedAt: { type: 'date' }
  }
};

const INDEX_DEFINITIONS = {
  users: usersIndex,
  content: contentIndex,
  logs: logsIndex,
  notifications: notificationsIndex,
  api_logs: apiLogsIndex,
  files: filesIndex
};

const INDEX_SETTINGS = {
  users: {
    refresh_interval: '5s',
    number_of_shards: 1,
    number_of_replicas: 1
  },
  content: {
    refresh_interval: '1s',
    number_of_shards: 2,
    number_of_replicas: 1
  },
  logs: {
    refresh_interval: '5s',
    number_of_shards: 2,
    number_of_replicas: 1
  },
  notifications: {
    refresh_interval: '1s',
    number_of_shards: 1,
    number_of_replicas: 1
  },
  api_logs: {
    refresh_interval: '5s',
    number_of_shards: 3,
    number_of_replicas: 1
  },
  files: {
    refresh_interval: '5s',
    number_of_shards: 1,
    number_of_replicas: 1
  }
};

module.exports = {
  INDEX_DEFINITIONS,
  INDEX_SETTINGS,
  usersIndex,
  contentIndex,
  logsIndex,
  notificationsIndex,
  apiLogsIndex,
  filesIndex
};
