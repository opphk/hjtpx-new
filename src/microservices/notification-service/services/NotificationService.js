const nodemailer = require('nodemailer');
const { WebClient } = require('@slack/web-api');
const { Expo } = require('expo-server-sdk');

class NotificationService {
  constructor(pool, redis, options = {}) {
    this.pool = pool;
    this.redis = redis;
    this.emailConfig = options.email || {};
    this.pushConfig = options.push || {};
    this.cachePrefix = 'notification:';
    this.cacheTTL = 3600;
    this.queue = [];
    this.processing = false;
    this.slack = null;
    this.expo = null;

    if (this.slack) {
      this.slack = new WebClient(this.pushConfig.slackToken);
    }

    if (this.expo) {
      this.expo = new Expo();
    }

    this.initializeTransporter();
    this.startQueueProcessor();
  }

  initializeTransporter() {
    if (this.emailConfig.auth?.user && this.emailConfig.auth?.pass) {
      this.transporter = nodemailer.createTransport({
        host: this.emailConfig.host,
        port: this.emailConfig.port,
        secure: this.emailConfig.secure,
        auth: {
          user: this.emailConfig.auth.user,
          pass: this.emailConfig.auth.pass
        }
      });
    }
  }

  async sendEmail(notification) {
    const { to, subject, html, text, template, templateData } = notification;

    if (!this.transporter) {
      throw new Error('Email service not configured');
    }

    let emailHtml = html;
    if (template) {
      emailHtml = await this.renderTemplate(template, templateData || {});
    }

    const mailOptions = {
      from: this.emailConfig.from || '"HJTPX" <noreply@hjtpx.com>',
      to,
      subject,
      text: text || subject,
      html: emailHtml
    };

    const result = await this.transporter.sendMail(mailOptions);

    await this.logNotification({
      type: 'email',
      to,
      subject,
      status: 'sent',
      messageId: result.messageId
    });

    return result;
  }

  async sendPush(notification) {
    const { userId, title, body, data, tokens } = notification;

    if (!tokens || tokens.length === 0) {
      const userTokens = await this.getUserPushTokens(userId);
      if (userTokens.length === 0) {
        throw new Error('No push tokens found for user');
      }
      return this.sendExpoPush(userTokens, { title, body, data });
    }

    return this.sendExpoPush(tokens, { title, body, data });
  }

  async sendExpoPush(tokens, message) {
    if (!this.expo) {
      console.log('Firebase/Expo not configured, logging push notification:', message);
      return { success: true, logged: true };
    }

    const messages = [];
    for (const pushToken of tokens) {
      if (!Expo.isExpoPushToken(pushToken)) {
        console.error(`Push token ${pushToken} is not a valid Expo push token`);
        continue;
      }

      messages.push({
        to: pushToken,
        sound: 'default',
        title: message.title,
        body: message.body,
        data: message.data,
        priority: 'high',
        channelId: 'default'
      });
    }

    const chunks = this.expo.chunkPushNotifications(messages);
    const tickets = [];

    for (const chunk of chunks) {
      try {
        const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      } catch (error) {
        console.error('Error sending push notifications:', error);
      }
    }

    return tickets;
  }

  async sendSlack(notification) {
    const { channel, text, blocks, userId } = notification;

    if (!this.slack) {
      throw new Error('Slack integration not configured');
    }

    const result = await this.slack.chat.postMessage({
      channel,
      text,
      blocks
    });

    if (userId) {
      await this.logNotification({
        type: 'slack',
        userId,
        channel,
        status: 'sent',
        timestamp: result.ts
      });
    }

    return result;
  }

  async createNotification(notification) {
    const {
      userId,
      type,
      title,
      message,
      channel = 'email',
      priority = 'normal',
      scheduledAt,
      metadata = {}
    } = notification;

    const query = `
      INSERT INTO notifications (
        user_id, type, title, message, channel, priority, 
        status, scheduled_at, metadata, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      RETURNING *
    `;

    const status = scheduledAt ? 'scheduled' : 'pending';
    const result = await this.pool.query(query, [
      userId,
      type,
      title,
      message,
      channel,
      priority,
      status,
      scheduledAt,
      JSON.stringify(metadata)
    ]);

    const notificationRecord = result.rows[0];

    if (!scheduledAt) {
      this.queue.push(notificationRecord);
      this.processQueue();
    }

    return notificationRecord;
  }

  async getUserNotifications(userId, options = {}) {
    const { page = 1, limit = 20, unreadOnly = false } = options;
    const offset = (page - 1) * limit;

    let query = `
      SELECT * FROM notifications 
      WHERE user_id = $1
    `;
    const params = [userId];

    if (unreadOnly) {
      query += ' AND is_read = false';
    }

    query += ` ORDER BY created_at DESC LIMIT $2 OFFSET $3`;
    params.push(limit, offset);

    const result = await this.pool.query(query, params);

    const countQuery = unreadOnly
      ? 'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false'
      : 'SELECT COUNT(*) FROM notifications WHERE user_id = $1';
    const countResult = await this.pool.query(countQuery, [userId]);

    return {
      notifications: result.rows,
      total: parseInt(countResult.rows[0].count),
      page,
      limit,
      unreadCount: unreadOnly ? 0 : await this.getUnreadCount(userId)
    };
  }

  async markAsRead(notificationId, userId) {
    const query = `
      UPDATE notifications 
      SET is_read = true, read_at = NOW()
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `;
    const result = await this.pool.query(query, [notificationId, userId]);
    return result.rows[0];
  }

  async markAllAsRead(userId) {
    const query = `
      UPDATE notifications 
      SET is_read = true, read_at = NOW()
      WHERE user_id = $1 AND is_read = false
    `;
    await this.pool.query(query, [userId]);
    return true;
  }

  async deleteNotification(notificationId, userId) {
    const query = `
      DELETE FROM notifications 
      WHERE id = $1 AND user_id = $2
      RETURNING id
    `;
    const result = await this.pool.query(query, [notificationId, userId]);
    return result.rows.length > 0;
  }

  async getUnreadCount(userId) {
    const query = 'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false';
    const result = await this.pool.query(query, [userId]);
    return parseInt(result.rows[0].count);
  }

  async getUserPushTokens(userId) {
    const cacheKey = `${this.cachePrefix}tokens:${userId}`;
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const query = 'SELECT push_token FROM user_push_tokens WHERE user_id = $1 AND active = true';
    const result = await this.pool.query(query, [userId]);
    const tokens = result.rows.map(row => row.push_token);

    if (tokens.length > 0) {
      await this.redis.setex(cacheKey, this.cacheTTL, JSON.stringify(tokens));
    }

    return tokens;
  }

  async addPushToken(userId, token, deviceInfo = {}) {
    const query = `
      INSERT INTO user_push_tokens (user_id, push_token, device_info, active, created_at)
      VALUES ($1, $2, $3, true, NOW())
      ON CONFLICT (user_id, push_token) 
      DO UPDATE SET active = true, updated_at = NOW()
    `;
    await this.pool.query(query, [userId, token, JSON.stringify(deviceInfo)]);

    await this.redis.del(`${this.cachePrefix}tokens:${userId}`);
    return true;
  }

  async removePushToken(userId, token) {
    const query = `
      UPDATE user_push_tokens 
      SET active = false, updated_at = NOW()
      WHERE user_id = $1 AND push_token = $2
    `;
    await this.pool.query(query, [userId, token]);

    await this.redis.del(`${this.cachePrefix}tokens:${userId}`);
    return true;
  }

  async renderTemplate(templateName, data) {
    const templates = {
      'welcome': `
        <h1>Welcome to HJTPX!</h1>
        <p>Hello ${data.name || 'User'},</p>
        <p>Thank you for joining us. Get started by exploring our features.</p>
        <a href="${data.verifyUrl || '#'}">Verify your email</a>
      `,
      'password-reset': `
        <h1>Password Reset</h1>
        <p>You requested a password reset. Click the link below:</p>
        <a href="${data.resetUrl}">Reset Password</a>
        <p>This link expires in 1 hour.</p>
      `,
      'notification': `
        <h2>${data.title || 'Notification'}</h2>
        <p>${data.message || ''}</p>
        ${data.actionUrl ? `<a href="${data.actionUrl}">View Details</a>` : ''}
      `
    };

    return templates[templateName] || `<p>${data.message || ''}</p>`;
  }

  async logNotification(log) {
    const query = `
      INSERT INTO notification_logs (
        notification_type, recipient, status, details, created_at
      )
      VALUES ($1, $2, $3, $4, NOW())
    `;
    await this.pool.query(query, [
      log.type,
      log.to || log.userId || 'unknown',
      log.status,
      JSON.stringify(log)
    ]);
  }

  queueNotification(notification) {
    this.queue.push(notification);
    this.processQueue();
  }

  async processQueue() {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const notification = this.queue.shift();

      try {
        switch (notification.channel) {
          case 'email':
            await this.sendEmail(notification);
            break;
          case 'push':
            await this.sendPush(notification);
            break;
          case 'slack':
            await this.sendSlack(notification);
            break;
          default:
            console.warn(`Unknown notification channel: ${notification.channel}`);
        }
      } catch (error) {
        console.error('Error processing notification:', error);
        this.queue.push(notification);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    this.processing = false;
  }

  startQueueProcessor() {
    setInterval(() => this.processQueue(), 1000);
  }
}

module.exports = NotificationService;
