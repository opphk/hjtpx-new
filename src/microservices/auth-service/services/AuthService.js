const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

class AuthService {
  constructor(pool, redis, options = {}) {
    this.pool = pool;
    this.redis = redis;
    this.jwtSecret = options.jwtSecret || 'default-secret';
    this.jwtExpiresIn = options.jwtExpiresIn || '24h';
    this.refreshTokenExpiresIn = options.refreshTokenExpiresIn || '7d';
    this.oauth = options.oauth || {};
    this.tokenPrefix = 'auth:token:';
    this.refreshPrefix = 'auth:refresh:';
    this.sessionsPrefix = 'auth:session:';
    this.tokenTTL = 86400;
    this.refreshTTL = 604800;
  }

  async register(userData) {
    const { email, password, name } = userData;

    const existingUser = await this.findByEmail(email);
    if (existingUser) {
      throw new Error('User already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuidv4();

    const query = `
      INSERT INTO users (id, email, password, name, role, created_at, updated_at)
      VALUES ($1, $2, $3, $4, 'user', NOW(), NOW())
      RETURNING id, email, name, role, created_at
    `;

    const result = await this.pool.query(query, [userId, email, hashedPassword, name]);
    const user = result.rows[0];

    const tokens = await this.generateTokens(user);

    await this.storeSession(user.id, tokens.refreshToken);

    return { user, ...tokens };
  }

  async login(email, password) {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await this.pool.query(query, [email]);

    const user = result.rows[0];
    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    await this.recordLoginAttempt(user.id, true);

    const tokens = await this.generateTokens(user);

    await this.storeSession(user.id, tokens.refreshToken);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      ...tokens
    };
  }

  async refreshToken(refreshToken) {
    const tokenKey = `${this.refreshPrefix}${refreshToken}`;
    const storedData = await this.redis.get(tokenKey);

    if (!storedData) {
      throw new Error('Invalid refresh token');
    }

    const { userId } = JSON.parse(storedData);

    const query = 'SELECT id, email, name, role FROM users WHERE id = $1';
    const result = await this.pool.query(query, [userId]);

    if (result.rows.length === 0) {
      throw new Error('User not found');
    }

    const user = result.rows[0];

    await this.redis.del(tokenKey);

    const tokens = await this.generateTokens(user);

    await this.storeSession(user.id, tokens.refreshToken);

    return tokens;
  }

  async logout(refreshToken) {
    const tokenKey = `${this.refreshPrefix}${refreshToken}`;
    await this.redis.del(tokenKey);
    return true;
  }

  async verifyToken(token) {
    try {
      const decoded = jwt.verify(token, this.jwtSecret);
      return decoded;
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  async generateTokens(user) {
    const accessToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role
      },
      this.jwtSecret,
      { expiresIn: this.jwtExpiresIn }
    );

    const refreshToken = crypto.randomBytes(64).toString('hex');

    return {
      accessToken,
      refreshToken,
      expiresIn: this.jwtExpiresIn
    };
  }

  async storeSession(userId, refreshToken) {
    const tokenKey = `${this.refreshPrefix}${refreshToken}`;
    const sessionKey = `${this.sessionsPrefix}${userId}`;

    await this.redis.setex(tokenKey, this.refreshTTL, JSON.stringify({
      userId,
      createdAt: Date.now()
    }));

    await this.redis.sadd(sessionKey, refreshToken);
    await this.redis.expire(sessionKey, this.refreshTTL);
  }

  async findByEmail(email) {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await this.pool.query(query, [email]);
    return result.rows[0] || null;
  }

  async recordLoginAttempt(userId, success) {
    const key = `login:attempt:${userId}`;
    const attempts = await this.redis.incr(key);
    await this.redis.expire(key, 3600);

    if (!success && attempts >= 5) {
      const lockKey = `login:locked:${userId}`;
      await this.redis.setex(lockKey, 1800, '1');
    }
  }

  async isAccountLocked(userId) {
    const lockKey = `login:locked:${userId}`;
    const locked = await this.redis.get(lockKey);
    return !!locked;
  }

  async generateOAuthUrl(provider) {
    const oauthConfig = this.oauth[provider];
    if (!oauthConfig) {
      throw new Error(`OAuth provider ${provider} not configured`);
    }

    const state = crypto.randomBytes(16).toString('hex');
    await this.redis.setex(`oauth:state:${state}`, 600, provider);

    let url;
    if (provider === 'google') {
      const params = new URLSearchParams({
        client_id: oauthConfig.clientID,
        redirect_uri: oauthConfig.callbackURL,
        response_type: 'code',
        scope: 'openid email profile',
        state,
        access_type: 'offline',
        prompt: 'consent'
      });
      url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    } else if (provider === 'github') {
      const params = new URLSearchParams({
        client_id: oauthConfig.clientID,
        redirect_uri: oauthConfig.callbackURL,
        scope: 'user:email',
        state
      });
      url = `https://github.com/login/oauth/authorize?${params.toString()}`;
    }

    return { url, state };
  }

  async handleOAuthCallback(provider, code, state) {
    const storedState = await this.redis.get(`oauth:state:${state}`);
    if (!storedState || storedState !== provider) {
      throw new Error('Invalid OAuth state');
    }

    await this.redis.del(`oauth:state:${state}`);

    const oauthConfig = this.oauth[provider];
    let oauthUser;

    if (provider === 'google') {
      const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
        client_id: oauthConfig.clientID,
        client_secret: oauthConfig.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: oauthConfig.callbackURL
      });

      const accessToken = tokenResponse.data.access_token;
      const userResponse = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      oauthUser = {
        email: userResponse.data.email,
        name: userResponse.data.name,
        provider: 'google',
        providerId: userResponse.data.id
      };
    } else if (provider === 'github') {
      const tokenResponse = await axios.post(
        'https://github.com/login/oauth/access_token',
        {
          client_id: oauthConfig.clientID,
          client_secret: oauthConfig.clientSecret,
          code,
          redirect_uri: oauthConfig.callbackURL
        },
        { headers: { Accept: 'application/json' } }
      );

      const accessToken = tokenResponse.data.access_token;
      const userResponse = await axios.get('https://api.github.com/user', {
        headers: { Authorization: `token ${accessToken}` }
      });

      oauthUser = {
        email: userResponse.data.email,
        name: userResponse.data.name || userResponse.data.login,
        provider: 'github',
        providerId: userResponse.data.id.toString()
      };
    }

    let user = await this.findOAuthUser(provider, oauthUser.providerId);

    if (!user) {
      user = await this.createOAuthUser(oauthUser);
    }

    const tokens = await this.generateTokens(user);
    await this.storeSession(user.id, tokens.refreshToken);

    return { user, ...tokens };
  }

  async findOAuthUser(provider, providerId) {
    const query = `
      SELECT * FROM users 
      WHERE provider = $1 AND provider_id = $2
    `;
    const result = await this.pool.query(query, [provider, providerId]);
    return result.rows[0] || null;
  }

  async createOAuthUser(oauthUser) {
    const userId = uuidv4();
    const query = `
      INSERT INTO users (id, email, name, provider, provider_id, role, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, 'user', NOW(), NOW())
      RETURNING id, email, name, role, provider
    `;
    const result = await this.pool.query(query, [
      userId,
      oauthUser.email,
      oauthUser.name,
      oauthUser.provider,
      oauthUser.providerId
    ]);
    return result.rows[0];
  }

  async getUserSessions(userId) {
    const sessionKey = `${this.sessionsPrefix}${userId}`;
    const sessions = await this.redis.smembers(sessionKey);
    return sessions.length;
  }

  async revokeAllSessions(userId) {
    const sessionKey = `${this.sessionsPrefix}${userId}`;
    const sessions = await this.redis.smembers(sessionKey);

    for (const token of sessions) {
      const tokenKey = `${this.refreshPrefix}${token}`;
      await this.redis.del(tokenKey);
    }

    await this.redis.del(sessionKey);
    return true;
  }
}

module.exports = AuthService;
