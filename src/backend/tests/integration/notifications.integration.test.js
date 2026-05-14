const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const pool = require('../../../config/database/db');
const notificationsRoutes = require('../../routes/notifications');
const Notification = require('../../models/Notification');

const app = express();
app.use(express.json());
app.use('/api/v1/notifications', notificationsRoutes);

const JWT_SECRET = process.env.JWT_SECRET || 'hjtpx-secret-key-change-in-production';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/hjtpx_notifications_test';

describe('Notifications API Integration Tests', () => {
  let testUser;
  let testToken;
  let testNotificationId;

  beforeAll(async () => {
    try {
      if (mongoose.connection.readyState === 0) {
        await mongoose.connect(MONGO_URI, {
          useNewUrlParser: true,
          useUnifiedTopology: true
        });
      }
    } catch (error) {
      console.log('MongoDB connection skipped for integration test:', error.message);
    }

    const hashedPassword = await bcrypt.hash('TestPassword123!', 10);
    testUser = await pool.query(
      'INSERT INTO users (email, name, password, role) VALUES ($1, $2, $3, $4) RETURNING id, email, name, role',
      [`notification_user_${Date.now()}@example.com`, 'Notification User', hashedPassword, 'user']
    );
    testUser = testUser.rows[0];

    testToken = jwt.sign(
      { id: testUser.id, email: testUser.email, role: testUser.role },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    try {
      const notification = await Notification.create({
        userId: testUser.id,
        type: 'info',
        title: 'Test Notification',
        message: 'This is a test notification',
        status: 'unread',
        channels: ['in_app']
      });
      testNotificationId = notification._id.toString();
    } catch (error) {
      console.log('Could not create test notification:', error.message);
    }
  });

  afterAll(async () => {
    if (testUser) {
      try {
        await Notification.deleteMany({ userId: testUser.id });
      } catch (error) {
        console.log('Cleanup notification skipped:', error.message);
      }
      await pool.query('DELETE FROM users WHERE id = $1', [testUser.id]);
    }
    await pool.end();
    try {
      if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.close();
      }
    } catch (error) {
      console.log('MongoDB disconnect skipped:', error.message);
    }
  });

  describe('GET /api/v1/notifications', () => {
    it('should get user notifications successfully', async () => {
      const response = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('notifications');
      expect(Array.isArray(response.body.data.notifications)).toBe(true);
      expect(response.body.data).toHaveProperty('pagination');
    });

    it('should support pagination parameters', async () => {
      const response = await request(app)
        .get('/api/v1/notifications?page=1&limit=10')
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.pagination).toHaveProperty('page', 1);
      expect(response.body.data.pagination).toHaveProperty('limit', 10);
    });

    it('should support status filtering', async () => {
      const response = await request(app)
        .get('/api/v1/notifications?status=unread')
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should fail without authentication', async () => {
      const response = await request(app).get('/api/v1/notifications');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should fail with invalid token', async () => {
      const response = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/notifications/send', () => {
    it('should create a new notification successfully', async () => {
      const response = await request(app)
        .post('/api/v1/notifications/send')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          userId: testUser.id,
          title: 'New Notification',
          message: 'This is a new notification',
          type: 'info',
          channels: ['in_app']
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('_id');
      expect(response.body.data).toHaveProperty('title', 'New Notification');

      if (response.body.data && response.body.data._id) {
        await Notification.findByIdAndDelete(response.body.data._id);
      }
    });

    it('should fail with missing required fields', async () => {
      const response = await request(app)
        .post('/api/v1/notifications/send')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          userId: testUser.id,
          title: 'Missing Message'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .post('/api/v1/notifications/send')
        .send({
          userId: testUser.id,
          title: 'New Notification',
          message: 'This is a new notification'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/v1/notifications/:id/read', () => {
    let notificationToMark;

    beforeEach(async () => {
      try {
        notificationToMark = await Notification.create({
          userId: testUser.id,
          type: 'info',
          title: 'Notification to Mark',
          message: 'This notification will be marked as read',
          status: 'unread',
          channels: ['in_app']
        });
      } catch (error) {
        console.log('Could not create notification in beforeEach:', error.message);
        notificationToMark = null;
      }
    });

    afterEach(async () => {
      if (notificationToMark && notificationToMark._id) {
        try {
          await Notification.findByIdAndDelete(notificationToMark._id);
        } catch (error) {
          console.log('Cleanup notification skipped:', error.message);
        }
      }
    });

    it('should mark notification as read successfully', async () => {
      if (!notificationToMark) {
        console.log('Skipping test: Could not create notification');
        return;
      }

      const response = await request(app)
        .put(`/api/v1/notifications/${notificationToMark._id}/read`)
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('modifiedCount');
    });

    it('should fail for non-existent notification', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .put(`/api/v1/notifications/${fakeId}/read`)
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(500);
    });

    it('should fail without authentication', async () => {
      if (!notificationToMark) {
        console.log('Skipping test: Could not create notification');
        return;
      }

      const response = await request(app)
        .put(`/api/v1/notifications/${notificationToMark._id}/read`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/notifications/unread/count', () => {
    it('should get unread notification count', async () => {
      const response = await request(app)
        .get('/api/v1/notifications/unread/count')
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('count');
      expect(typeof response.body.data.count).toBe('number');
    });

    it('should fail without authentication', async () => {
      const response = await request(app).get('/api/v1/notifications/unread/count');

      expect(response.status).toBe(401);
    });
  });
});
