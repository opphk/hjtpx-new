const express = require('express');

const router = express.Router();
const { auth } = require('../../middleware/auth');
const { checkRole, ROLES } = require('../../middleware/rbac');

router.use(auth);
router.use(checkRole(ROLES.ADMIN));

router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 10, role, status, search } = req.query;
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM users WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (role) {
      query += ` AND role = $${paramIndex++}`;
      params.push(role);
    }

    if (status) {
      query += ` AND status = $${paramIndex++}`;
      params.push(status);
    }

    if (search) {
      query += ` AND (username ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*)');
    const countResult = await req.db.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await req.db.query(query, params);

    res.success(
      {
        users: result.rows,
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      },
      'Users retrieved successfully'
    );
  } catch (error) {
    res.error(error.message, 500, 'FETCH_USERS_ERROR');
  }
});

router.get('/users/:id', async (req, res) => {
  try {
    const result = await req.db.query(
      'SELECT id, username, email, role, status, created_at, last_login FROM users WHERE id = $1',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.notFound('User not found');
    }

    res.success(result.rows[0], 'User retrieved successfully');
  } catch (error) {
    res.error(error.message, 500, 'FETCH_USER_ERROR');
  }
});

router.post('/users', async (req, res) => {
  try {
    const { username, email, password, role = 'user', status = 'active' } = req.body;

    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await req.db.query(
      'INSERT INTO users (username, email, password, role, status) VALUES ($1, $2, $3, $4, $5) RETURNING id, username, email, role, status, created_at',
      [username, email, hashedPassword, role, status]
    );

    res.created(result.rows[0], 'User created successfully', 201);
  } catch (error) {
    if (error.code === '23505') {
      return res.badRequest('Username or email already exists');
    }
    res.error(error.message, 500, 'CREATE_USER_ERROR');
  }
});

router.put('/users/:id', async (req, res) => {
  try {
    const { username, email, password, role, status } = req.body;
    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (username) {
      updates.push(`username = $${paramIndex++}`);
      params.push(username);
    }

    if (email) {
      updates.push(`email = $${paramIndex++}`);
      params.push(email);
    }

    if (password) {
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash(password, 10);
      updates.push(`password = $${paramIndex++}`);
      params.push(hashedPassword);
    }

    if (role) {
      updates.push(`role = $${paramIndex++}`);
      params.push(role);
    }

    if (status) {
      updates.push(`status = $${paramIndex++}`);
      params.push(status);
    }

    if (updates.length === 0) {
      return res.badRequest('No fields to update');
    }

    params.push(req.params.id);
    const query = `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING id, username, email, role, status, created_at`;

    const result = await req.db.query(query, params);

    if (result.rows.length === 0) {
      return res.notFound('User not found');
    }

    res.success(result.rows[0], 'User updated successfully');
  } catch (error) {
    if (error.code === '23505') {
      return res.badRequest('Username or email already exists');
    }
    res.error(error.message, 500, 'UPDATE_USER_ERROR');
  }
});

router.delete('/users/:id', async (req, res) => {
  try {
    const result = await req.db.query('DELETE FROM users WHERE id = $1 RETURNING id', [
      req.params.id
    ]);

    if (result.rows.length === 0) {
      return res.notFound('User not found');
    }

    res.noContent();
  } catch (error) {
    res.error(error.message, 500, 'DELETE_USER_ERROR');
  }
});

router.put('/users/:id/status', async (req, res) => {
  try {
    const { status } = req.body;

    if (!['active', 'inactive', 'pending'].includes(status)) {
      return res.badRequest('Invalid status');
    }

    const result = await req.db.query(
      'UPDATE users SET status = $1 WHERE id = $2 RETURNING id, username, email, role, status',
      [status, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.notFound('User not found');
    }

    res.success(result.rows[0], 'User status updated successfully');
  } catch (error) {
    res.error(error.message, 500, 'UPDATE_STATUS_ERROR');
  }
});

router.put('/users/:id/role', async (req, res) => {
  try {
    const { role } = req.body;

    if (!['admin', 'user', 'guest'].includes(role)) {
      return res.badRequest('Invalid role');
    }

    const result = await req.db.query(
      'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, username, email, role, status',
      [role, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.notFound('User not found');
    }

    res.success(result.rows[0], 'User role updated successfully');
  } catch (error) {
    res.error(error.message, 500, 'UPDATE_ROLE_ERROR');
  }
});

router.get('/logs', async (req, res) => {
  try {
    const { page = 1, limit = 20, type, level, startDate, endDate, search } = req.query;
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM logs WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (type) {
      query += ` AND type = $${paramIndex++}`;
      params.push(type);
    }

    if (level) {
      query += ` AND level = $${paramIndex++}`;
      params.push(level);
    }

    if (startDate) {
      query += ` AND timestamp >= $${paramIndex++}`;
      params.push(startDate);
    }

    if (endDate) {
      query += ` AND timestamp <= $${paramIndex++}`;
      params.push(endDate);
    }

    if (search) {
      query += ` AND (action ILIKE $${paramIndex} OR details::text ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*)');
    const countResult = await req.db.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    query += ` ORDER BY timestamp DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await req.db.query(query, params);

    res.success(
      {
        logs: result.rows,
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      },
      'Logs retrieved successfully'
    );
  } catch (error) {
    res.error(error.message, 500, 'FETCH_LOGS_ERROR');
  }
});

router.get('/logs/export', async (req, res) => {
  try {
    const { startDate, endDate, type, level, search } = req.query;

    let query = 'SELECT * FROM logs WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (type) {
      query += ` AND type = $${paramIndex++}`;
      params.push(type);
    }

    if (level) {
      query += ` AND level = $${paramIndex++}`;
      params.push(level);
    }

    if (startDate) {
      query += ` AND timestamp >= $${paramIndex++}`;
      params.push(startDate);
    }

    if (endDate) {
      query += ` AND timestamp <= $${paramIndex++}`;
      params.push(endDate);
    }

    if (search) {
      query += ` AND (action ILIKE $${paramIndex} OR details::text ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    query += ' ORDER BY timestamp DESC LIMIT 10000';

    const result = await req.db.query(query, params);

    const csv = [
      ['timestamp', 'level', 'type', 'user_id', 'action', 'ip', 'details'].join(','),
      ...result.rows.map(row =>
        [
          row.timestamp,
          row.level,
          row.type,
          row.user_id || '',
          `"${(row.action || '').replace(/"/g, '""')}"`,
          row.ip || '',
          `"${(JSON.stringify(row.details) || '').replace(/"/g, '""')}"`
        ].join(',')
      )
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=logs.csv');
    res.send(csv);
  } catch (error) {
    res.error(error.message, 500, 'EXPORT_LOGS_ERROR');
  }
});

router.delete('/logs/clear', async (req, res) => {
  try {
    const { days = 30 } = req.body;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const result = await req.db.query('DELETE FROM logs WHERE timestamp < $1 RETURNING id', [
      cutoffDate.toISOString()
    ]);

    res.success({ deleted: result.rows.length }, 'Old logs cleared successfully');
  } catch (error) {
    res.error(error.message, 500, 'CLEAR_LOGS_ERROR');
  }
});

router.get('/settings/system', async (req, res) => {
  try {
    const defaultConfig = {
      site_name: 'HJTPX',
      site_url: process.env.SITE_URL || 'http://localhost:3000',
      maintenance_mode: false,
      max_users: 1000,
      session_timeout: 3600,
      api_rate_limit: 100,
      log_level: 'info',
      log_retention_days: 30,
      cache_enabled: true,
      cache_ttl: 300,
      upload_max_size: 10485760,
      allowed_file_types: '.jpg,.png,.pdf,.doc,.docx',
      email_verification_required: true,
      password_min_length: 6
    };

    const result = await req.db.query(
      'SELECT key, value FROM system_settings WHERE category = $1',
      ['system']
    );

    const config = { ...defaultConfig };
    result.rows.forEach(row => {
      try {
        config[row.key] = JSON.parse(row.value);
      } catch {
        config[row.key] = row.value;
      }
    });

    res.success({ config }, 'System config retrieved successfully');
  } catch (error) {
    res.error(error.message, 500, 'FETCH_CONFIG_ERROR');
  }
});

router.put('/settings/system', async (req, res) => {
  try {
    const config = req.body;
    const allowedKeys = [
      'site_name',
      'site_url',
      'maintenance_mode',
      'max_users',
      'session_timeout',
      'api_rate_limit',
      'log_level',
      'log_retention_days',
      'cache_enabled',
      'cache_ttl',
      'upload_max_size',
      'allowed_file_types',
      'email_verification_required',
      'password_min_length'
    ];

    for (const [key, value] of Object.entries(config)) {
      if (allowedKeys.includes(key)) {
        await req.db.query(
          `INSERT INTO system_settings (key, value, category, updated_at)
           VALUES ($1, $2, 'system', NOW())
           ON CONFLICT (key, category) DO UPDATE SET value = $2, updated_at = NOW()`,
          [key, JSON.stringify(value)]
        );
      }
    }

    res.success({ config }, 'System config updated successfully');
  } catch (error) {
    res.error(error.message, 500, 'UPDATE_CONFIG_ERROR');
  }
});

router.get('/settings/features', async (req, res) => {
  try {
    const defaultFeatures = {
      dark_mode: { enabled: true, description: '深色模式主题' },
      social_login: { enabled: false, description: '社交媒体登录' },
      two_factor_auth: { enabled: true, description: '两步验证' },
      api_access: { enabled: true, description: '开放API访问' },
      file_sharing: { enabled: true, description: '文件分享功能' },
      comments: { enabled: true, description: '评论功能' },
      notifications: { enabled: true, description: '通知系统' },
      analytics: { enabled: false, description: '数据分析功能' },
      export_csv: { enabled: true, description: 'CSV导出功能' },
      export_json: { enabled: true, description: 'JSON导出功能' },
      export_excel: { enabled: false, description: 'Excel导出功能' },
      import_csv: { enabled: true, description: 'CSV导入功能' },
      import_json: { enabled: true, description: 'JSON导入功能' },
      webhooks: { enabled: false, description: 'Webhook集成' },
      api_docs: { enabled: true, description: 'API文档访问' },
      realtime_updates: { enabled: true, description: '实时数据更新' }
    };

    const result = await req.db.query(
      'SELECT key, value FROM system_settings WHERE category = $1',
      ['features']
    );

    const features = { ...defaultFeatures };
    result.rows.forEach(row => {
      try {
        features[row.key] = { ...features[row.key], ...JSON.parse(row.value) };
      } catch {
        features[row.key] = {
          enabled: row.value === 'true',
          description: features[row.key]?.description || ''
        };
      }
    });

    res.success({ features }, 'Feature flags retrieved successfully');
  } catch (error) {
    res.error(error.message, 500, 'FETCH_FEATURES_ERROR');
  }
});

router.put('/settings/features', async (req, res) => {
  try {
    const { features } = req.body;

    for (const [key, value] of Object.entries(features)) {
      await req.db.query(
        `INSERT INTO system_settings (key, value, category, updated_at)
         VALUES ($1, $2, 'features', NOW())
         ON CONFLICT (key, category) DO UPDATE SET value = $2, updated_at = NOW()`,
        [key, JSON.stringify(value)]
      );
    }

    res.success({ features }, 'Feature flags updated successfully');
  } catch (error) {
    res.error(error.message, 500, 'UPDATE_FEATURES_ERROR');
  }
});

router.get('/settings/notifications', async (req, res) => {
  try {
    const defaultNotifications = {
      email_notifications: true,
      push_notifications: true,
      in_app_notifications: true,
      notification_frequency: 'realtime',
      email_for_important: true,
      daily_digest: false,
      weekly_report: false
    };

    const result = await req.db.query(
      'SELECT key, value FROM system_settings WHERE category = $1',
      ['notifications']
    );

    const notifications = { ...defaultNotifications };
    result.rows.forEach(row => {
      if (row.value === 'true') notifications[row.key] = true;
      else if (row.value === 'false') notifications[row.key] = false;
      else notifications[row.key] = row.value;
    });

    res.success({ notifications }, 'Notification settings retrieved successfully');
  } catch (error) {
    res.error(error.message, 500, 'FETCH_NOTIFICATIONS_ERROR');
  }
});

router.put('/settings/notifications', async (req, res) => {
  try {
    const notifications = req.body;

    for (const [key, value] of Object.entries(notifications)) {
      await req.db.query(
        `INSERT INTO system_settings (key, value, category, updated_at)
         VALUES ($1, $2, 'notifications', NOW())
         ON CONFLICT (key, category) DO UPDATE SET value = $2, updated_at = NOW()`,
        [key, String(value)]
      );
    }

    res.success({ notifications }, 'Notification settings updated successfully');
  } catch (error) {
    res.error(error.message, 500, 'UPDATE_NOTIFICATIONS_ERROR');
  }
});

router.get('/audit', async (req, res) => {
  try {
    const { page = 1, limit = 20, userId, action, startDate, endDate } = req.query;
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM audit_logs WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (userId) {
      query += ` AND user_id = $${paramIndex++}`;
      params.push(userId);
    }

    if (action) {
      query += ` AND action = $${paramIndex++}`;
      params.push(action);
    }

    if (startDate) {
      query += ` AND created_at >= $${paramIndex++}`;
      params.push(startDate);
    }

    if (endDate) {
      query += ` AND created_at <= $${paramIndex++}`;
      params.push(endDate);
    }

    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*)');
    const countResult = await req.db.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await req.db.query(query, params);

    res.success(
      {
        audit_logs: result.rows,
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      },
      'Audit logs retrieved successfully'
    );
  } catch (error) {
    res.error(error.message, 500, 'FETCH_AUDIT_ERROR');
  }
});

module.exports = router;
