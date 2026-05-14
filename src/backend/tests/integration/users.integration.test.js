const request = require('supertest');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const pool = require('../../../config/database/db');
const usersRoutes = require('../../routes/v1/users');
const authMiddleware = require('../../middleware/auth');

const app = express();
app.use(express.json());
app.use('/api/v1/users', usersRoutes);
app.use('/api/v1/admin', usersRoutes);

const JWT_SECRET = process.env.JWT_SECRET || 'hjtpx-secret-key-change-in-production';

describe('Users API Integration Tests', () => {
  let regularUser;
  let adminUser;
  let regularToken;
  let adminToken;

  beforeAll(async () => {
    const hashedPassword = await bcrypt.hash('TestPassword123!', 10);

    regularUser = await pool.query(
      'INSERT INTO users (email, name, password, role) VALUES ($1, $2, $3, $4) RETURNING id, email, name, role',
      [`regular_user_${Date.now()}@example.com`, 'Regular User', hashedPassword, 'user']
    );
    regularUser = regularUser.rows[0];

    adminUser = await pool.query(
      'INSERT INTO users (email, name, password, role) VALUES ($1, $2, $3, $4) RETURNING id, email, name, role',
      [`admin_user_${Date.now()}@example.com`, 'Admin User', hashedPassword, 'admin']
    );
    adminUser = adminUser.rows[0];

    regularToken = jwt.sign(
      { id: regularUser.id, email: regularUser.email, role: regularUser.role },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    adminToken = jwt.sign(
      { id: adminUser.id, email: adminUser.email, role: adminUser.role },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    if (regularUser) {
      await pool.query('DELETE FROM users WHERE id = $1', [regularUser.id]);
    }
    if (adminUser) {
      await pool.query('DELETE FROM users WHERE id = $1', [adminUser.id]);
    }
    await pool.end();
  });

  describe('GET /api/v1/users/me', () => {
    it('should get current user profile successfully', async () => {
      const response = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${regularToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('email');
      expect(response.body.data).toHaveProperty('name');
      expect(response.body.data.email).toBe(regularUser.email);
    });

    it('should fail without authentication', async () => {
      const response = await request(app).get('/api/v1/users/me');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should fail with invalid token', async () => {
      const response = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/v1/users/me', () => {
    it('should update current user profile successfully', async () => {
      const response = await request(app)
        .put('/api/v1/users/me')
        .set('Authorization', `Bearer ${regularToken}`)
        .send({
          name: 'Updated Name',
          email: `updated_${Date.now()}@example.com`
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('name', 'Updated Name');
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .put('/api/v1/users/me')
        .send({
          name: 'Updated Name'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should fail to update protected fields', async () => {
      const response = await request(app)
        .put('/api/v1/users/me')
        .set('Authorization', `Bearer ${regularToken}`)
        .send({
          name: 'Updated Name',
          role: 'admin'
        });

      expect(response.status).toBe(200);
      expect(response.body.data).not.toHaveProperty('role', 'admin');
    });
  });

  describe('GET /api/v1/admin/users', () => {
    it('should get all users for admin', async () => {
      const response = await request(app)
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('users');
      expect(Array.isArray(response.body.data.users)).toBe(true);
    });

    it('should support pagination parameters', async () => {
      const response = await request(app)
        .get('/api/v1/admin/users?page=1&limit=5')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('page');
      expect(response.body.data).toHaveProperty('limit');
      expect(response.body.data).toHaveProperty('total');
    });

    it('should support role filtering', async () => {
      const response = await request(app)
        .get('/api/v1/admin/users?role=user')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should fail for non-admin users', async () => {
      const response = await request(app)
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${regularToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should fail without authentication', async () => {
      const response = await request(app).get('/api/v1/admin/users');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/admin/users', () => {
    let newUserEmail;

    beforeEach(() => {
      newUserEmail = `newadminuser_${Date.now()}@example.com`;
    });

    afterEach(async () => {
      await pool.query('DELETE FROM users WHERE email = $1', [newUserEmail]);
    });

    it('should create a new user for admin', async () => {
      const response = await request(app)
        .post('/api/v1/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          username: `newuser_${Date.now()}`,
          email: newUserEmail,
          password: 'NewPassword123!',
          role: 'user',
          status: 'active'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('email', newUserEmail);
    });

    it('should fail for non-admin users', async () => {
      const response = await request(app)
        .post('/api/v1/admin/users')
        .set('Authorization', `Bearer ${regularToken}`)
        .send({
          username: 'newuser',
          email: newUserEmail,
          password: 'NewPassword123!'
        });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .post('/api/v1/admin/users')
        .send({
          username: 'newuser',
          email: newUserEmail,
          password: 'NewPassword123!'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should fail with duplicate email', async () => {
      await request(app)
        .post('/api/v1/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          username: `newuser_${Date.now()}`,
          email: newUserEmail,
          password: 'NewPassword123!'
        });

      const response = await request(app)
        .post('/api/v1/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          username: `newuser2_${Date.now()}`,
          email: newUserEmail,
          password: 'NewPassword123!'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/v1/admin/users/:id', () => {
    let userToDelete;

    beforeEach(async () => {
      const hashedPassword = await bcrypt.hash('TestPassword123!', 10);
      userToDelete = await pool.query(
        'INSERT INTO users (email, name, password, role) VALUES ($1, $2, $3, $4) RETURNING id, email',
        [`delete_user_${Date.now()}@example.com`, 'User To Delete', hashedPassword, 'user']
      );
      userToDelete = userToDelete.rows[0];
    });

    afterEach(async () => {
      await pool.query('DELETE FROM users WHERE id = $1', [userToDelete.id]);
    });

    it('should delete user for admin', async () => {
      const response = await request(app)
        .delete(`/api/v1/admin/users/${userToDelete.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(204);
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .delete('/api/v1/admin/users/999999')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
    });

    it('should fail for non-admin users', async () => {
      const response = await request(app)
        .delete(`/api/v1/admin/users/${userToDelete.id}`)
        .set('Authorization', `Bearer ${regularToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .delete(`/api/v1/admin/users/${userToDelete.id}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
});
