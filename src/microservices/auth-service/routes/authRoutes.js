const express = require('express');
const Joi = require('joi');
const router = express.Router();

const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).max(100).required(),
  name: Joi.string().min(2).max(100).required()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

const refreshSchema = Joi.object({
  refreshToken: Joi.string().required()
});

router.post('/register', async (req, res) => {
  try {
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: error.details[0].message }
      });
    }

    const result = await req.authService.register(value);

    res.status(201).json({
      success: true,
      data: {
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        expiresIn: result.expiresIn
      }
    });
  } catch (err) {
    if (err.message === 'User already exists') {
      return res.status(409).json({
        success: false,
        error: { code: 'USER_EXISTS', message: err.message }
      });
    }
    console.error('Register error:', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Registration failed' }
    });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: error.details[0].message }
      });
    }

    const { email, password } = value;

    const locked = await req.authService.isAccountLocked(email);
    if (locked) {
      return res.status(423).json({
        success: false,
        error: { code: 'ACCOUNT_LOCKED', message: 'Account is temporarily locked' }
      });
    }

    const result = await req.authService.login(email, password);

    res.json({
      success: true,
      data: {
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        expiresIn: result.expiresIn
      }
    });
  } catch (err) {
    await req.authService.recordLoginAttempt(req.body.email, false);

    if (err.message === 'Invalid credentials') {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' }
      });
    }
    console.error('Login error:', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Login failed' }
    });
  }
});

router.post('/refresh', async (req, res) => {
  try {
    const { error, value } = refreshSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: error.details[0].message }
      });
    }

    const tokens = await req.authService.refreshToken(value.refreshToken);

    res.json({
      success: true,
      data: tokens
    });
  } catch (err) {
    if (err.message === 'Invalid refresh token') {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_TOKEN', message: 'Invalid or expired refresh token' }
      });
    }
    console.error('Refresh error:', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Token refresh failed' }
    });
  }
});

router.post('/logout', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await req.authService.logout(refreshToken);
    }

    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Logout failed' }
    });
  }
});

router.post('/verify', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_TOKEN', message: 'Token is required' }
      });
    }

    const decoded = await req.authService.verifyToken(token);

    res.json({
      success: true,
      data: {
        valid: true,
        user: {
          userId: decoded.userId,
          email: decoded.email,
          role: decoded.role
        }
      }
    });
  } catch (err) {
    res.status(401).json({
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'Token is invalid or expired' }
    });
  }
});

router.post('/oauth/:provider/url', async (req, res) => {
  try {
    const { provider } = req.params;
    const { url, state } = await req.authService.generateOAuthUrl(provider);

    res.json({ success: true, data: { url, state } });
  } catch (err) {
    if (err.message.includes('not configured')) {
      return res.status(501).json({
        success: false,
        error: { code: 'PROVIDER_NOT_CONFIGURED', message: err.message }
      });
    }
    console.error('OAuth URL error:', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to generate OAuth URL' }
    });
  }
});

router.post('/oauth/:provider/callback', async (req, res) => {
  try {
    const { provider } = req.params;
    const { code, state } = req.body;

    const result = await req.authService.handleOAuthCallback(provider, code, state);

    res.json({
      success: true,
      data: {
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        expiresIn: result.expiresIn
      }
    });
  } catch (err) {
    console.error('OAuth callback error:', err);
    res.status(400).json({
      success: false,
      error: { code: 'OAUTH_ERROR', message: 'OAuth authentication failed' }
    });
  }
});

router.post('/revoke-sessions', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authorization required' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = await req.authService.verifyToken(token);

    await req.authService.revokeAllSessions(decoded.userId);

    res.json({ success: true, message: 'All sessions revoked' });
  } catch (err) {
    console.error('Revoke sessions error:', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to revoke sessions' }
    });
  }
});

module.exports = router;
