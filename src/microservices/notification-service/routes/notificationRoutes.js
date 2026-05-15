const express = require('express');
const Joi = require('joi');
const router = express.Router();

const notificationSchema = Joi.object({
  userId: Joi.string().uuid().required(),
  type: Joi.string().valid('email', 'system', 'reminder', 'alert').required(),
  title: Joi.string().min(1).max(200).required(),
  message: Joi.string().min(1).max(1000).required(),
  channel: Joi.string().valid('email', 'push', 'slack', 'in_app').default('in_app'),
  priority: Joi.string().valid('low', 'normal', 'high', 'urgent').default('normal'),
  scheduledAt: Joi.date().iso(),
  metadata: Joi.object()
});

const sendEmailSchema = Joi.object({
  to: Joi.string().email().required(),
  subject: Joi.string().min(1).max(200).required(),
  html: Joi.string(),
  text: Joi.string(),
  template: Joi.string(),
  templateData: Joi.object()
});

const pushTokenSchema = Joi.object({
  token: Joi.string().required(),
  deviceInfo: Joi.object({
    platform: Joi.string(),
    version: Joi.string(),
    model: Joi.string()
  })
});

router.post('/', async (req, res) => {
  try {
    const { error, value } = notificationSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: error.details[0].message }
      });
    }

    const notification = await req.notificationService.createNotification(value);

    res.status(201).json({
      success: true,
      data: notification
    });
  } catch (err) {
    console.error('Create notification error:', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to create notification' }
    });
  }
});

router.get('/', async (req, res) => {
  try {
    const { userId, page = 1, limit = 20, unreadOnly } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_USER_ID', message: 'userId is required' }
      });
    }

    const result = await req.notificationService.getUserNotifications(userId, {
      page: parseInt(page),
      limit: parseInt(limit),
      unreadOnly: unreadOnly === 'true'
    });

    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    console.error('Get notifications error:', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get notifications' }
    });
  }
});

router.get('/:id/read-count', async (req, res) => {
  try {
    const count = await req.notificationService.getUnreadCount(req.params.id);
    res.json({
      success: true,
      data: { unreadCount: count }
    });
  } catch (err) {
    console.error('Get unread count error:', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get unread count' }
    });
  }
});

router.put('/:id/read', async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_USER_ID', message: 'userId is required' }
      });
    }

    const notification = await req.notificationService.markAsRead(req.params.id, userId);

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Notification not found' }
      });
    }

    res.json({
      success: true,
      data: notification
    });
  } catch (err) {
    console.error('Mark as read error:', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to mark notification as read' }
    });
  }
});

router.put('/read-all', async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_USER_ID', message: 'userId is required' }
      });
    }

    await req.notificationService.markAllAsRead(userId);

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (err) {
    console.error('Mark all as read error:', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to mark all notifications as read' }
    });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_USER_ID', message: 'userId is required' }
      });
    }

    const deleted = await req.notificationService.deleteNotification(req.params.id, userId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Notification not found' }
      });
    }

    res.json({
      success: true,
      message: 'Notification deleted'
    });
  } catch (err) {
    console.error('Delete notification error:', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to delete notification' }
    });
  }
});

router.post('/email', async (req, res) => {
  try {
    const { error, value } = sendEmailSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: error.details[0].message }
      });
    }

    await req.notificationService.sendEmail(value);

    res.json({
      success: true,
      message: 'Email sent successfully'
    });
  } catch (err) {
    console.error('Send email error:', err);
    res.status(500).json({
      success: false,
      error: { code: 'EMAIL_ERROR', message: err.message || 'Failed to send email' }
    });
  }
});

router.post('/push', async (req, res) => {
  try {
    const schema = Joi.object({
      userId: Joi.string().uuid(),
      title: Joi.string().required(),
      body: Joi.string().required(),
      data: Joi.object(),
      tokens: Joi.array().items(Joi.string())
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: error.details[0].message }
      });
    }

    await req.notificationService.sendPush(value);

    res.json({
      success: true,
      message: 'Push notification sent'
    });
  } catch (err) {
    console.error('Send push error:', err);
    res.status(500).json({
      success: false,
      error: { code: 'PUSH_ERROR', message: err.message || 'Failed to send push notification' }
    });
  }
});

router.post('/tokens', async (req, res) => {
  try {
    const { error, value } = pushTokenSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: error.details[0].message }
      });
    }

    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_USER_ID', message: 'userId is required' }
      });
    }

    await req.notificationService.addPushToken(userId, value.token, value.deviceInfo);

    res.json({
      success: true,
      message: 'Push token registered'
    });
  } catch (err) {
    console.error('Add push token error:', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to add push token' }
    });
  }
});

router.delete('/tokens/:token', async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_USER_ID', message: 'userId is required' }
      });
    }

    await req.notificationService.removePushToken(userId, req.params.token);

    res.json({
      success: true,
      message: 'Push token removed'
    });
  } catch (err) {
    console.error('Remove push token error:', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to remove push token' }
    });
  }
});

module.exports = router;
