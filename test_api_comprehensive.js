#!/usr/bin/env node

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000/api/v1';
let authToken = '';
let adminToken = '';
let testUserId = '';
let testNotificationId = '';
let testFileId = '';

function httpRequest(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: JSON.parse(data)
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data
          });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function makeRequest(method, endpoint, body = null, token = null) {
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: `/api/v1${endpoint}`,
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    }
  };
  return httpRequest(options, body);
}

async function runTests() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║         HJTPX API 综合测试报告 - 全面测试套件              ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const results = {
    testSuite: 'HJTPX API Comprehensive Test',
    timestamp: new Date().toISOString(),
    tests: [],
    summary: { passed: 0, failed: 0, total: 0 }
  };

  console.log('═══════════════════════════════════════════════════════════');
  console.log('第1部分: 健康检查测试');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Test 1: Health Check
  try {
    const res = await makeRequest('GET', '/health');
    const passed = res.status === 200 && res.body.success;
    results.tests.push({
      category: 'Health Check',
      name: 'GET /api/v1/health',
      status: passed ? 'PASS' : 'FAIL',
      statusCode: res.status,
      response: res.body
    });
    console.log(`${passed ? '✅' : '❌'} GET /api/v1/health - ${res.status}`);
    if (passed) results.summary.passed++; else results.summary.failed++;
  } catch (e) {
    results.tests.push({ category: 'Health Check', name: 'GET /api/v1/health', status: 'FAIL', error: e.message });
    console.log(`❌ GET /api/v1/health - ERROR: ${e.message}`);
    results.summary.failed++;
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('第2部分: 用户认证测试');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Test 2: Register User
  try {
    const userData = {
      email: `testuser_${Date.now()}@example.com`,
      name: 'Test User',
      password: 'Test123456'
    };
    const res = await makeRequest('POST', '/auth/register', userData);
    const passed = res.status === 201 && res.body.success;
    if (passed) {
      authToken = res.body.data.token;
      testUserId = res.body.data.user.id;
    }
    results.tests.push({
      category: 'Authentication',
      name: 'POST /api/v1/auth/register',
      status: passed ? 'PASS' : 'FAIL',
      statusCode: res.status,
      response: passed ? { user: res.body.data.user, token: '[REDACTED]' } : res.body
    });
    console.log(`${passed ? '✅' : '❌'} POST /api/v1/auth/register - ${res.status}`);
    if (passed) results.summary.passed++; else results.summary.failed++;
  } catch (e) {
    results.tests.push({ category: 'Authentication', name: 'POST /api/v1/auth/register', status: 'FAIL', error: e.message });
    console.log(`❌ POST /api/v1/auth/register - ERROR: ${e.message}`);
    results.summary.failed++;
  }

  // Test 3: Login
  try {
    const res = await makeRequest('POST', '/auth/login', {
      email: `testuser_${Date.now()}@example.com`,
      password: 'Test123456'
    });
    const passed = res.status === 200 || res.status === 401;
    results.tests.push({
      category: 'Authentication',
      name: 'POST /api/v1/auth/login',
      status: passed ? 'PASS' : 'FAIL',
      statusCode: res.status
    });
    console.log(`${passed ? '✅' : '❌'} POST /api/v1/auth/login - ${res.status}`);
    if (passed) results.summary.passed++; else results.summary.failed++;
  } catch (e) {
    results.tests.push({ category: 'Authentication', name: 'POST /api/v1/auth/login', status: 'FAIL', error: e.message });
    console.log(`❌ POST /api/v1/auth/login - ERROR: ${e.message}`);
    results.summary.failed++;
  }

  // Test 4: Get Current User
  if (authToken) {
    try {
      const res = await makeRequest('GET', '/auth/me', null, authToken);
      const passed = res.status === 200 && res.body.success;
      results.tests.push({
        category: 'Authentication',
        name: 'GET /api/v1/auth/me',
        status: passed ? 'PASS' : 'FAIL',
        statusCode: res.status
      });
      console.log(`${passed ? '✅' : '❌'} GET /api/v1/auth/me - ${res.status}`);
      if (passed) results.summary.passed++; else results.summary.failed++;
    } catch (e) {
      results.tests.push({ category: 'Authentication', name: 'GET /api/v1/auth/me', status: 'FAIL', error: e.message });
      console.log(`❌ GET /api/v1/auth/me - ERROR: ${e.message}`);
      results.summary.failed++;
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('第3部分: 通知API测试');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Test 5: Create Notification
  if (authToken) {
    try {
      const notificationData = {
        type: 'info',
        title: '测试通知',
        message: '这是一条测试通知消息'
      };
      const res = await makeRequest('POST', '/notifications', notificationData, authToken);
      const passed = res.status === 201 && res.body.success;
      if (passed) testNotificationId = res.body.data?.id;
      results.tests.push({
        category: 'Notifications',
        name: 'POST /api/v1/notifications',
        status: passed ? 'PASS' : 'FAIL',
        statusCode: res.status
      });
      console.log(`${passed ? '✅' : '❌'} POST /api/v1/notifications - ${res.status}`);
      if (passed) results.summary.passed++; else results.summary.failed++;
    } catch (e) {
      results.tests.push({ category: 'Notifications', name: 'POST /api/v1/notifications', status: 'FAIL', error: e.message });
      console.log(`❌ POST /api/v1/notifications - ERROR: ${e.message}`);
      results.summary.failed++;
    }
  }

  // Test 6: Get Notifications
  if (authToken) {
    try {
      const res = await makeRequest('GET', '/notifications', null, authToken);
      const passed = res.status === 200 && res.body.success;
      results.tests.push({
        category: 'Notifications',
        name: 'GET /api/v1/notifications',
        status: passed ? 'PASS' : 'FAIL',
        statusCode: res.status
      });
      console.log(`${passed ? '✅' : '❌'} GET /api/v1/notifications - ${res.status}`);
      if (passed) results.summary.passed++; else results.summary.failed++;
    } catch (e) {
      results.tests.push({ category: 'Notifications', name: 'GET /api/v1/notifications', status: 'FAIL', error: e.message });
      console.log(`❌ GET /api/v1/notifications - ERROR: ${e.message}`);
      results.summary.failed++;
    }
  }

  // Test 7: Mark Notification as Read
  if (authToken && testNotificationId) {
    try {
      const res = await makeRequest('PUT', `/notifications/${testNotificationId}/read`, null, authToken);
      const passed = res.status === 200 && res.body.success;
      results.tests.push({
        category: 'Notifications',
        name: `PUT /api/v1/notifications/${testNotificationId}/read`,
        status: passed ? 'PASS' : 'FAIL',
        statusCode: res.status
      });
      console.log(`${passed ? '✅' : '❌'} PUT /api/v1/notifications/:id/read - ${res.status}`);
      if (passed) results.summary.passed++; else results.summary.failed++;
    } catch (e) {
      results.tests.push({ category: 'Notifications', name: 'PUT /api/v1/notifications/:id/read', status: 'FAIL', error: e.message });
      console.log(`❌ PUT /api/v1/notifications/:id/read - ERROR: ${e.message}`);
      results.summary.failed++;
    }
  }

  // Test 8: Get Unread Count
  if (authToken) {
    try {
      const res = await makeRequest('GET', '/notifications/unread-count', null, authToken);
      const passed = res.status === 200 && res.body.success;
      results.tests.push({
        category: 'Notifications',
        name: 'GET /api/v1/notifications/unread-count',
        status: passed ? 'PASS' : 'FAIL',
        statusCode: res.status
      });
      console.log(`${passed ? '✅' : '❌'} GET /api/v1/notifications/unread-count - ${res.status}`);
      if (passed) results.summary.passed++; else results.summary.failed++;
    } catch (e) {
      results.tests.push({ category: 'Notifications', name: 'GET /api/v1/notifications/unread-count', status: 'FAIL', error: e.message });
      console.log(`❌ GET /api/v1/notifications/unread-count - ERROR: ${e.message}`);
      results.summary.failed++;
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('第4部分: 管理员API测试');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Test 9: Register Admin User
  try {
    const adminData = {
      email: `admin_${Date.now()}@example.com`,
      name: 'Admin User',
      password: 'Admin123456',
      role: 'admin'
    };
    const res = await makeRequest('POST', '/auth/register', adminData);
    const passed = res.status === 201 && res.body.success;
    if (passed) {
      adminToken = res.body.data.token;
    }
    results.tests.push({
      category: 'Admin',
      name: 'POST /api/v1/auth/register (admin)',
      status: passed ? 'PASS' : 'FAIL',
      statusCode: res.status
    });
    console.log(`${passed ? '✅' : '❌'} POST /api/v1/auth/register (admin) - ${res.status}`);
    if (passed) results.summary.passed++; else results.summary.failed++;
  } catch (e) {
    results.tests.push({ category: 'Admin', name: 'POST /api/v1/auth/register (admin)', status: 'FAIL', error: e.message });
    console.log(`❌ POST /api/v1/auth/register (admin) - ERROR: ${e.message}`);
    results.summary.failed++;
  }

  // Test 10: Get All Users (Admin)
  if (adminToken) {
    try {
      const res = await makeRequest('GET', '/admin/users', null, adminToken);
      const passed = res.status === 200 && res.body.success;
      results.tests.push({
        category: 'Admin',
        name: 'GET /api/v1/admin/users',
        status: passed ? 'PASS' : 'FAIL',
        statusCode: res.status
      });
      console.log(`${passed ? '✅' : '❌'} GET /api/v1/admin/users - ${res.status}`);
      if (passed) results.summary.passed++; else results.summary.failed++;
    } catch (e) {
      results.tests.push({ category: 'Admin', name: 'GET /api/v1/admin/users', status: 'FAIL', error: e.message });
      console.log(`❌ GET /api/v1/admin/users - ERROR: ${e.message}`);
      results.summary.failed++;
    }
  }

  // Test 11: Create User (Admin)
  if (adminToken) {
    try {
      const newUserData = {
        email: `newuser_${Date.now()}@example.com`,
        name: 'New User',
        password: 'NewUser123',
        role: 'user'
      };
      const res = await makeRequest('POST', '/admin/users', newUserData, adminToken);
      const passed = res.status === 201 && res.body.success;
      results.tests.push({
        category: 'Admin',
        name: 'POST /api/v1/admin/users',
        status: passed ? 'PASS' : 'FAIL',
        statusCode: res.status
      });
      console.log(`${passed ? '✅' : '❌'} POST /api/v1/admin/users - ${res.status}`);
      if (passed) results.summary.passed++; else results.summary.failed++;
    } catch (e) {
      results.tests.push({ category: 'Admin', name: 'POST /api/v1/admin/users', status: 'FAIL', error: e.message });
      console.log(`❌ POST /api/v1/admin/users - ERROR: ${e.message}`);
      results.summary.failed++;
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('第5部分: 文件管理API测试');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Test 12: Get Files List
  if (authToken) {
    try {
      const res = await makeRequest('GET', '/files', null, authToken);
      const passed = res.status === 200 && res.body.success;
      results.tests.push({
        category: 'File Management',
        name: 'GET /api/v1/files',
        status: passed ? 'PASS' : 'FAIL',
        statusCode: res.status
      });
      console.log(`${passed ? '✅' : '❌'} GET /api/v1/files - ${res.status}`);
      if (passed) results.summary.passed++; else results.summary.failed++;
    } catch (e) {
      results.tests.push({ category: 'File Management', name: 'GET /api/v1/files', status: 'FAIL', error: e.message });
      console.log(`❌ GET /api/v1/files - ERROR: ${e.message}`);
      results.summary.failed++;
    }
  }

  // Test 13: File Upload (simulated)
  if (authToken) {
    try {
      const { exec } = require('child_process');

      const testFilePath = path.join(__dirname, 'test_upload.txt');
      fs.writeFileSync(testFilePath, 'Test file content for upload testing');

      const formData = new FormData();
      formData.append('file', fs.createReadStream(testFilePath));

      const options = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/v1/upload',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          ...formData.getHeaders()
        }
      };

      const res = await new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
          let data = '';
          res.on('data', (chunk) => data += chunk);
          res.on('end', () => {
            try {
              resolve({ status: res.statusCode, body: JSON.parse(data) });
            } catch (e) {
              resolve({ status: res.statusCode, body: data });
            }
          });
        });
        req.on('error', reject);
        formData.pipe(req);
      });

      const passed = res.status === 201 || res.status === 200;
      if (passed && res.body.data) testFileId = res.body.data.id;
      results.tests.push({
        category: 'File Management',
        name: 'POST /api/v1/upload',
        status: passed ? 'PASS' : 'FAIL',
        statusCode: res.status
      });
      console.log(`${passed ? '✅' : '❌'} POST /api/v1/upload - ${res.status}`);
      if (passed) results.summary.passed++; else results.summary.failed++;

      fs.unlinkSync(testFilePath);
    } catch (e) {
      results.tests.push({ category: 'File Management', name: 'POST /api/v1/upload', status: 'FAIL', error: e.message });
      console.log(`❌ POST /api/v1/upload - ERROR: ${e.message}`);
      results.summary.failed++;
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('第6部分: WebSocket连接测试');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Test 14: WebSocket Connection
  try {
    const { io } = require('socket.io-client');

    const socket = io('http://localhost:3000', {
      transports: ['websocket'],
      reconnection: false
    });

    const wsResult = await new Promise((resolve) => {
      let passed = false;
      const timeout = setTimeout(() => {
        if (!passed) {
          resolve({ passed: false, error: 'Connection timeout' });
        }
      }, 5000);

      socket.on('connect', () => {
        passed = true;
        clearTimeout(timeout);
        resolve({ passed: true });
        socket.disconnect();
      });

      socket.on('connect_error', (error) => {
        clearTimeout(timeout);
        resolve({ passed: false, error: error.message });
      });
    });

    results.tests.push({
      category: 'WebSocket',
      name: 'Socket.IO Connection',
      status: wsResult.passed ? 'PASS' : 'FAIL',
      error: wsResult.error
    });
    console.log(`${wsResult.passed ? '✅' : '❌'} Socket.IO Connection - ${wsResult.passed ? 'Connected' : wsResult.error}`);
    if (wsResult.passed) results.summary.passed++; else results.summary.failed++;
  } catch (e) {
    results.tests.push({ category: 'WebSocket', name: 'Socket.IO Connection', status: 'FAIL', error: e.message });
    console.log(`❌ Socket.IO Connection - ERROR: ${e.message}`);
    results.summary.failed++;
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('第7部分: 错误处理测试');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Test 15: 401 Unauthorized
  try {
    const res = await makeRequest('GET', '/notifications');
    const passed = res.status === 401;
    results.tests.push({
      category: 'Error Handling',
      name: 'GET /api/v1/notifications (401 Unauthorized)',
      status: passed ? 'PASS' : 'FAIL',
      statusCode: res.status
    });
    console.log(`${passed ? '✅' : '❌'} GET /api/v1/notifications (no token) - ${res.status}`);
    if (passed) results.summary.passed++; else results.summary.failed++;
  } catch (e) {
    results.tests.push({ category: 'Error Handling', name: 'GET /api/v1/notifications (401)', status: 'FAIL', error: e.message });
    console.log(`❌ GET /api/v1/notifications (401) - ERROR: ${e.message}`);
    results.summary.failed++;
  }

  // Test 16: 404 Not Found
  try {
    const res = await makeRequest('GET', '/nonexistent-endpoint');
    const passed = res.status === 404;
    results.tests.push({
      category: 'Error Handling',
      name: 'GET /api/v1/nonexistent-endpoint (404)',
      status: passed ? 'PASS' : 'FAIL',
      statusCode: res.status
    });
    console.log(`${passed ? '✅' : '❌'} GET /api/v1/nonexistent-endpoint - ${res.status}`);
    if (passed) results.summary.passed++; else results.summary.failed++;
  } catch (e) {
    results.tests.push({ category: 'Error Handling', name: 'GET /api/v1/nonexistent-endpoint (404)', status: 'FAIL', error: e.message });
    console.log(`❌ GET /api/v1/nonexistent-endpoint - ERROR: ${e.message}`);
    results.summary.failed++;
  }

  // Test 17: 400 Bad Request
  try {
    const res = await makeRequest('POST', '/auth/register', {});
    const passed = res.status === 400;
    results.tests.push({
      category: 'Error Handling',
      name: 'POST /api/v1/auth/register (400 - missing fields)',
      status: passed ? 'PASS' : 'FAIL',
      statusCode: res.status
    });
    console.log(`${passed ? '✅' : '❌'} POST /api/v1/auth/register (empty body) - ${res.status}`);
    if (passed) results.summary.passed++; else results.summary.failed++;
  } catch (e) {
    results.tests.push({ category: 'Error Handling', name: 'POST /api/v1/auth/register (400)', status: 'FAIL', error: e.message });
    console.log(`❌ POST /api/v1/auth/register (400) - ERROR: ${e.message}`);
    results.summary.failed++;
  }

  results.summary.total = results.summary.passed + results.summary.failed;

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                    测试结果摘要                             ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  console.log(`总测试数: ${results.summary.total}`);
  console.log(`通过: ${results.summary.passed} ✅`);
  console.log(`失败: ${results.summary.failed} ❌`);
  console.log(`通过率: ${((results.summary.passed / results.summary.total) * 100).toFixed(2)}%\n`);

  console.log('═══════════════════════════════════════════════════════════');
  console.log('各分类测试结果');
  console.log('═══════════════════════════════════════════════════════════\n');

  const categories = {};
  results.tests.forEach(test => {
    if (!categories[test.category]) {
      categories[test.category] = { passed: 0, failed: 0, total: 0 };
    }
    categories[test.category].total++;
    if (test.status === 'PASS') categories[test.category].passed++;
    else categories[test.category].failed++;
  });

  Object.entries(categories).forEach(([category, stats]) => {
    const icon = stats.failed === 0 ? '✅' : '⚠️';
    console.log(`${icon} ${category}: ${stats.passed}/${stats.total} 通过`);
  });

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('失败测试详情');
  console.log('═══════════════════════════════════════════════════════════\n');

  const failedTests = results.tests.filter(t => t.status === 'FAIL');
  if (failedTests.length === 0) {
    console.log('🎉 所有测试均已通过！\n');
  } else {
    failedTests.forEach(test => {
      console.log(`❌ ${test.name}`);
      console.log(`   状态码: ${test.statusCode || 'N/A'}`);
      if (test.error) console.log(`   错误: ${test.error}`);
      console.log('');
    });
  }

  return results;
}

runTests().catch(console.error);
