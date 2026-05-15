const NOTIFICATION_TYPES = {
  SYSTEM: 'system',
  USER: 'user',
  COLLABORATION: 'collaboration',
  COMMENT: 'comment',
  MENTION: 'mention',
  MESSAGE: 'message',
  FRIEND_REQUEST: 'friend_request',
  FRIEND_ACCEPTED: 'friend_accepted',
  ROOM_INVITATION: 'room_invitation',
  PRESENCE: 'presence',
  DOCUMENT_SHARED: 'document_shared',
  DOCUMENT_EDITED: 'document_edited',
  DOCUMENT_COMMENT: 'document_comment',
  TASK_ASSIGNED: 'task_assigned',
  TASK_COMPLETED: 'task_completed',
  DEADLINE_REMINDER: 'deadline_reminder',
  SECURITY_ALERT: 'security_alert',
  ERROR: 'error'
};

const NOTIFICATION_PRIORITIES = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  URGENT: 'urgent'
};

const NOTIFICATION_CHANNELS = {
  IN_APP: 'in_app',
  EMAIL: 'email',
  SMS: 'sms',
  PUSH: 'push',
  WEBHOOK: 'webhook'
};

const NOTIFICATION_STATUS = {
  PENDING: 'pending',
  SENT: 'sent',
  DELIVERED: 'delivered',
  READ: 'read',
  ARCHIVED: 'archived',
  FAILED: 'failed'
};

const NOTIFICATION_CATEGORIES = {
  PRESENCE: 'presence',
  COLLABORATION: 'collaboration',
  MESSAGING: 'messaging',
  SOCIAL: 'social',
  SECURITY: 'security',
  SYSTEM: 'system',
  TASK: 'task'
};

const NOTIFICATION_TEMPLATES = {
  [NOTIFICATION_TYPES.MENTION]: {
    title: 'You were mentioned',
    message: '{{mentionedBy}} mentioned you in {{context}}',
    icon: 'at',
    sound: 'mention'
  },
  [NOTIFICATION_TYPES.COMMENT]: {
    title: 'New comment',
    message: '{{commenter}} commented on {{target}}',
    icon: 'comment',
    sound: 'comment'
  },
  [NOTIFICATION_TYPES.MESSAGE]: {
    title: 'New message',
    message: '{{sender}} sent you a message',
    icon: 'message',
    sound: 'message'
  },
  [NOTIFICATION_TYPES.FRIEND_REQUEST]: {
    title: 'Friend request',
    message: '{{requester}} wants to be your friend',
    icon: 'user-plus',
    sound: 'friend_request'
  },
  [NOTIFICATION_TYPES.FRIEND_ACCEPTED]: {
    title: 'Friend request accepted',
    message: '{{accepter}} accepted your friend request',
    icon: 'check',
    sound: 'success'
  },
  [NOTIFICATION_TYPES.ROOM_INVITATION]: {
    title: 'Room invitation',
    message: '{{inviter}} invited you to join {{room}}',
    icon: 'door-open',
    sound: 'invitation'
  },
  [NOTIFICATION_TYPES.PRESENCE]: {
    title: 'User presence',
    message: '{{user}} is now {{status}}',
    icon: 'circle',
    sound: null
  },
  [NOTIFICATION_TYPES.DOCUMENT_SHARED]: {
    title: 'Document shared',
    message: '{{sharer}} shared "{{document}}" with you',
    icon: 'file-share',
    sound: 'share'
  },
  [NOTIFICATION_TYPES.DOCUMENT_EDITED]: {
    title: 'Document edited',
    message: '{{editor}} edited "{{document}}"',
    icon: 'edit',
    sound: null
  },
  [NOTIFICATION_TYPES.DOCUMENT_COMMENT]: {
    title: 'Document comment',
    message: '{{commenter}} commented on "{{document}}"',
    icon: 'comment',
    sound: 'comment'
  },
  [NOTIFICATION_TYPES.TASK_ASSIGNED]: {
    title: 'Task assigned',
    message: '{{assigner}} assigned "{{task}}" to you',
    icon: 'clipboard-list',
    sound: 'assignment'
  },
  [NOTIFICATION_TYPES.TASK_COMPLETED]: {
    title: 'Task completed',
    message: '{{user}} completed "{{task}}"',
    icon: 'check-circle',
    sound: 'success'
  },
  [NOTIFICATION_TYPES.DEADLINE_REMINDER]: {
    title: 'Deadline reminder',
    message: '{{task}} is due in {{timeRemaining}}',
    icon: 'clock',
    sound: 'reminder'
  },
  [NOTIFICATION_TYPES.SECURITY_ALERT]: {
    title: 'Security alert',
    message: '{{message}}',
    icon: 'shield-alt',
    sound: 'alert'
  },
  [NOTIFICATION_TYPES.SYSTEM]: {
    title: 'System notification',
    message: '{{message}}',
    icon: 'info-circle',
    sound: null
  }
};

const NOTIFICATION_ACTIONS = {
  VIEW_PROFILE: 'view_profile',
  VIEW_ROOM: 'view_room',
  VIEW_DOCUMENT: 'view_document',
  VIEW_MESSAGE: 'view_message',
  VIEW_TASK: 'view_task',
  ACCEPT_FRIEND: 'accept_friend',
  DECLINE_FRIEND: 'decline_friend',
  JOIN_ROOM: 'join_room',
  REPLY: 'reply',
  MARK_READ: 'mark_read',
  DISMISS: 'dismiss'
};

const NOTIFICATION_LIMITS = {
  MAX_PER_USER_PER_HOUR: 100,
  MAX_PER_USER_PER_DAY: 500,
  MAX_BATCH_SIZE: 50,
  MAX_QUEUE_SIZE: 1000
};

const NOTIFICATION_DEFAULTS = {
  priority: NOTIFICATION_PRIORITIES.NORMAL,
  channels: [NOTIFICATION_CHANNELS.IN_APP],
  retention: 30,
  batchDelay: 1000,
  retryAttempts: 3,
  retryDelay: 5000
};

const NOTIFICATION_COLORS = {
  [NOTIFICATION_TYPES.MENTION]: '#7289da',
  [NOTIFICATION_TYPES.COMMENT]: '#43b581',
  [NOTIFICATION_TYPES.MESSAGE]: '#7289da',
  [NOTIFICATION_TYPES.FRIEND_REQUEST]: '#faa61a',
  [NOTIFICATION_TYPES.FRIEND_ACCEPTED]: '#43b581',
  [NOTIFICATION_TYPES.ROOM_INVITATION]: '#7289da',
  [NOTIFICATION_TYPES.PRESENCE]: '#747f8d',
  [NOTIFICATION_TYPES.DOCUMENT_SHARED]: '#7289da',
  [NOTIFICATION_TYPES.DOCUMENT_EDITED]: '#f04747',
  [NOTIFICATION_TYPES.DOCUMENT_COMMENT]: '#43b581',
  [NOTIFICATION_TYPES.TASK_ASSIGNED]: '#faa61a',
  [NOTIFICATION_TYPES.TASK_COMPLETED]: '#43b581',
  [NOTIFICATION_TYPES.DEADLINE_REMINDER]: '#f04747',
  [NOTIFICATION_TYPES.SECURITY_ALERT]: '#f04747',
  [NOTIFICATION_TYPES.SYSTEM]: '#747f8d',
  [NOTIFICATION_TYPES.ERROR]: '#f04747',
  [NOTIFICATION_TYPES.USER]: '#7289da',
  [NOTIFICATION_TYPES.COLLABORATION]: '#9b59b6'
};

class NotificationTypeManager {
  static getTypeInfo(type) {
    return {
      type,
      category: this.getCategory(type),
      template: NOTIFICATION_TEMPLATES[type] || NOTIFICATION_TEMPLATES[NOTIFICATION_TYPES.SYSTEM],
      color: NOTIFICATION_COLORS[type] || NOTIFICATION_COLORS[NOTIFICATION_TYPES.SYSTEM],
      priority: NOTIFICATION_PRIORITIES.NORMAL
    };
  }

  static getCategory(type) {
    switch (type) {
      case NOTIFICATION_TYPES.MENTION:
      case NOTIFICATION_TYPES.COMMENT:
      case NOTIFICATION_TYPES.DOCUMENT_COMMENT:
        return NOTIFICATION_CATEGORIES.COLLABORATION;
      
      case NOTIFICATION_TYPES.MESSAGE:
        return NOTIFICATION_CATEGORIES.MESSAGING;
      
      case NOTIFICATION_TYPES.FRIEND_REQUEST:
      case NOTIFICATION_TYPES.FRIEND_ACCEPTED:
        return NOTIFICATION_CATEGORIES.SOCIAL;
      
      case NOTIFICATION_TYPES.PRESENCE:
        return NOTIFICATION_CATEGORIES.PRESENCE;
      
      case NOTIFICATION_TYPES.SECURITY_ALERT:
      case NOTIFICATION_TYPES.ERROR:
        return NOTIFICATION_CATEGORIES.SECURITY;
      
      case NOTIFICATION_TYPES.TASK_ASSIGNED:
      case NOTIFICATION_TYPES.TASK_COMPLETED:
      case NOTIFICATION_TYPES.DEADLINE_REMINDER:
        return NOTIFICATION_CATEGORIES.TASK;
      
      default:
        return NOTIFICATION_CATEGORIES.SYSTEM;
    }
  }

  static isValidType(type) {
    return Object.values(NOTIFICATION_TYPES).includes(type);
  }

  static isValidPriority(priority) {
    return Object.values(NOTIFICATION_PRIORITIES).includes(priority);
  }

  static isValidChannel(channel) {
    return Object.values(NOTIFICATION_CHANNELS).includes(channel);
  }

  static formatMessage(template, variables) {
    let message = template.message;
    for (const [key, value] of Object.entries(variables)) {
      message = message.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }
    return message;
  }

  static createNotification(options) {
    const {
      type,
      userId,
      data = {},
      priority = NOTIFICATION_DEFAULTS.priority,
      channels = NOTIFICATION_DEFAULTS.channels,
      metadata = {}
    } = options;

    if (!this.isValidType(type)) {
      throw new Error(`Invalid notification type: ${type}`);
    }

    const typeInfo = this.getTypeInfo(type);
    const variables = this.extractVariables(data);
    const message = this.formatMessage(typeInfo.template, variables);

    return {
      id: this.generateNotificationId(),
      type,
      userId,
      title: data.title || typeInfo.template.title,
      message,
      data,
      priority,
      channels,
      metadata: {
        category: typeInfo.category,
        icon: typeInfo.template.icon,
        sound: typeInfo.template.sound,
        color: typeInfo.color,
        ...metadata
      },
      status: NOTIFICATION_STATUS.PENDING,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + NOTIFICATION_DEFAULTS.retention * 24 * 60 * 60 * 1000)
    };
  }

  static extractVariables(data) {
    const variables = {};
    const commonVars = [
      'mentionedBy', 'commenter', 'sender', 'requester', 'accepter',
      'inviter', 'user', 'sharer', 'editor', 'assigner',
      'context', 'target', 'room', 'document', 'task',
      'status', 'message', 'timeRemaining'
    ];

    for (const key of commonVars) {
      if (data[key] !== undefined) {
        variables[key] = data[key];
      }
    }

    return variables;
  }

  static generateNotificationId() {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  static getCategoryIcon(category) {
    const icons = {
      [NOTIFICATION_CATEGORIES.PRESENCE]: 'circle',
      [NOTIFICATION_CATEGORIES.COLLABORATION]: 'users',
      [NOTIFICATION_CATEGORIES.MESSAGING]: 'comment',
      [NOTIFICATION_CATEGORIES.SOCIAL]: 'heart',
      [NOTIFICATION_CATEGORIES.SECURITY]: 'shield',
      [NOTIFICATION_CATEGORIES.SYSTEM]: 'cog',
      [NOTIFICATION_CATEGORIES.TASK]: 'clipboard'
    };
    return icons[category] || 'bell';
  }

  static shouldBatch(notifications) {
    return notifications.length > 1 && 
           notifications.every(n => n.type === NOTIFICATION_TYPES.MESSAGE);
  }

  static batchNotifications(notifications) {
    if (!this.shouldBatch(notifications)) {
      return notifications;
    }

    return [{
      ...notifications[0],
      id: this.generateNotificationId(),
      title: `${notifications.length} new messages`,
      message: `You have ${notifications.length} unread messages`,
      data: {
        messages: notifications.map(n => ({
          id: n.id,
          sender: n.data?.sender,
          preview: n.data?.preview || n.message
        }))
      },
      metadata: {
        ...notifications[0].metadata,
        batched: true,
        count: notifications.length
      }
    }];
  }
}

module.exports = {
  NOTIFICATION_TYPES,
  NOTIFICATION_PRIORITIES,
  NOTIFICATION_CHANNELS,
  NOTIFICATION_STATUS,
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_TEMPLATES,
  NOTIFICATION_ACTIONS,
  NOTIFICATION_LIMITS,
  NOTIFICATION_DEFAULTS,
  NOTIFICATION_COLORS,
  NotificationTypeManager
};
