const express = require('express');
const Joi = require('joi');
const router = express.Router();

const userSchema = Joi.object({
  email: Joi.string().email().required(),
  name: Joi.string().min(2).max(100).required(),
  password: Joi.string().min(8).max(100).required(),
  role: Joi.string().valid('user', 'admin', 'moderator').default('user')
});

const updateSchema = Joi.object({
  email: Joi.string().email(),
  name: Joi.string().min(2).max(100),
  role: Joi.string().valid('user', 'admin', 'moderator'),
  status: Joi.string().valid('active', 'inactive', 'suspended')
}).min(1);

router.post('/', async (req, res) => {
  try {
    const { error, value } = userSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: error.details[0].message }
      });
    }

    const user = await req.userService.createUser(value);
    res.status(201).json({ success: true, data: user });
  } catch (err) {
    if (err.message === 'User already exists') {
      return res.status(409).json({
        success: false,
        error: { code: 'USER_EXISTS', message: err.message }
      });
    }
    console.error('Create user error:', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to create user' }
    });
  }
});

router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, role, search } = req.query;
    const result = await req.userService.findAll({
      page: parseInt(page),
      limit: parseInt(limit),
      role,
      search
    });

    res.json({ success: true, data: result });
  } catch (err) {
    console.error('List users error:', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to list users' }
    });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const user = await req.userService.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User not found' }
      });
    }

    res.json({ success: true, data: user });
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get user' }
    });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { error, value } = updateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: error.details[0].message }
      });
    }

    const user = await req.userService.updateUser(req.params.id, value);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User not found' }
      });
    }

    res.json({ success: true, data: user });
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update user' }
    });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const deleted = await req.userService.deleteUser(req.params.id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User not found' }
      });
    }

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to delete user' }
    });
  }
});

router.post('/:id/password', async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Password must be at least 8 characters' }
      });
    }

    await req.userService.updatePassword(req.params.id, newPassword);
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    console.error('Update password error:', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update password' }
    });
  }
});

module.exports = router;
