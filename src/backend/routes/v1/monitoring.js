const express = require('express');
const router = express.Router();

const websocketService = require('../../services/websocketService');

router.get('/websocket', (req, res) => {
  try {
    const metrics = websocketService.getDetailedMetrics();
    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get WebSocket metrics'
    });
  }
});

router.get('/websocket/stats', (req, res) => {
  try {
    const stats = websocketService.getConnectionStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get WebSocket stats'
    });
  }
});

router.get('/websocket/online-users', (req, res) => {
  try {
    const users = websocketService.getOnlineUsers();
    res.json({
      success: true,
      data: {
        users,
        count: users.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get online users'
    });
  }
});

module.exports = router;
