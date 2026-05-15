const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

class UserService {
  constructor(pool, redis) {
    this.pool = pool;
    this.redis = redis;
    this.saltRounds = 10;
    this.cachePrefix = 'user:';
    this.cacheTTL = 3600;
  }

  async createUser(userData) {
    const { email, name, password, role = 'user' } = userData;

    const existingUser = await this.findByEmail(email);
    if (existingUser) {
      throw new Error('User already exists');
    }

    const hashedPassword = await bcrypt.hash(password, this.saltRounds);
    const userId = uuidv4();

    const query = `
      INSERT INTO users (id, email, name, password, role, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING id, email, name, role, created_at, updated_at
    `;

    const result = await this.pool.query(query, [userId, email, name, hashedPassword, role]);
    const user = result.rows[0];

    await this.cacheUser(user);

    return user;
  }

  async findById(userId) {
    const cacheKey = `${this.cachePrefix}${userId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const query = 'SELECT id, email, name, role, created_at, updated_at FROM users WHERE id = $1';
    const result = await this.pool.query(query, [userId]);

    if (result.rows.length > 0) {
      const user = result.rows[0];
      await this.cacheUser(user);
      return user;
    }

    return null;
  }

  async findByEmail(email) {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await this.pool.query(query, [email]);
    return result.rows[0] || null;
  }

  async findAll(options = {}) {
    const { page = 1, limit = 20, role, search } = options;
    const offset = (page - 1) * limit;

    let query = 'SELECT id, email, name, role, created_at, updated_at FROM users WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (role) {
      query += ` AND role = $${paramIndex}`;
      params.push(role);
      paramIndex++;
    }

    if (search) {
      query += ` AND (email ILIKE $${paramIndex} OR name ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await this.pool.query(query, params);

    const countQuery = 'SELECT COUNT(*) FROM users';
    const countResult = await this.pool.query(countQuery);

    return {
      users: result.rows,
      total: parseInt(countResult.rows[0].count),
      page,
      limit,
      totalPages: Math.ceil(countResult.rows[0].count / limit)
    };
  }

  async updateUser(userId, updates) {
    const { email, name, role, status } = updates;

    const allowedFields = [];
    const params = [];
    let paramIndex = 1;

    if (email !== undefined) {
      allowedFields.push(`email = $${paramIndex}`);
      params.push(email);
      paramIndex++;
    }

    if (name !== undefined) {
      allowedFields.push(`name = $${paramIndex}`);
      params.push(name);
      paramIndex++;
    }

    if (role !== undefined) {
      allowedFields.push(`role = $${paramIndex}`);
      params.push(role);
      paramIndex++;
    }

    if (status !== undefined) {
      allowedFields.push(`status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (allowedFields.length === 0) {
      return this.findById(userId);
    }

    allowedFields.push(`updated_at = NOW()`);
    params.push(userId);

    const query = `
      UPDATE users 
      SET ${allowedFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, email, name, role, status, created_at, updated_at
    `;

    const result = await this.pool.query(query, params);

    if (result.rows.length > 0) {
      await this.invalidateCache(userId);
      return result.rows[0];
    }

    return null;
  }

  async deleteUser(userId) {
    const query = 'DELETE FROM users WHERE id = $1 RETURNING id';
    const result = await this.pool.query(query, [userId]);

    if (result.rows.length > 0) {
      await this.invalidateCache(userId);
      return true;
    }

    return false;
  }

  async updatePassword(userId, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, this.saltRounds);
    const query = 'UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2';
    await this.pool.query(query, [hashedPassword, userId]);
    await this.invalidateCache(userId);
    return true;
  }

  async verifyPassword(userId, password) {
    const user = await this.findByEmail(userId);
    if (!user) {
      return false;
    }
    return bcrypt.compare(password, user.password);
  }

  async changeEmail(userId, newEmail) {
    const existing = await this.findByEmail(newEmail);
    if (existing && existing.id !== userId) {
      throw new Error('Email already in use');
    }

    const query = 'UPDATE users SET email = $1, updated_at = NOW() WHERE id = $2';
    await this.pool.query(query, [newEmail, userId]);
    await this.invalidateCache(userId);
    return true;
  }

  async cacheUser(user) {
    const cacheKey = `${this.cachePrefix}${user.id}`;
    await this.redis.setex(cacheKey, this.cacheTTL, JSON.stringify(user));
  }

  async invalidateCache(userId) {
    const cacheKey = `${this.cachePrefix}${userId}`;
    await this.redis.del(cacheKey);
  }
}

module.exports = UserService;
