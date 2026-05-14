# HJTPX WebSocket 压力测试

## 概述

此目录包含了用于测试 HJTPX WebSocket 服务性能的脚本和工具。

## 文件说明

- `package.json` - 测试脚本的依赖配置
- `test-connections.js` - 并发连接压力测试脚本
- `test-broadcast.js` - 消息广播性能测试脚本
- `test-monitor.js` - 监控测试脚本

## 安装依赖

```bash
cd tests/websocket
npm install
```

## 使用方法

### 1. 启动主服务器

在项目根目录下运行：

```bash
npm start
```

### 2. 并发连接压力测试

```bash
cd tests/websocket
node test-connections.js
```

该测试会：
- 尝试建立大量并发连接
- 测量连接成功率和连接时间
- 保持连接一段时间后断开
- 输出详细的测试结果

**配置项**（在 `test-connections.js` 中修改）：
- `TOTAL_CONNECTIONS` - 总连接数（默认：100）
- `CONNECTIONS_PER_BATCH` - 每批连接数（默认：20）
- `BATCH_DELAY` - 批次间隔（毫秒，默认：500）
- `STAY_CONNECTED_TIME` - 保持连接时间（毫秒，默认：30000）

### 3. 广播性能测试

```bash
cd tests/websocket
node test-broadcast.js
```

该测试会：
- 创建多个连接
- 发送多条广播消息
- 测量消息接收成功率和吞吐量

**配置项**（在 `test-broadcast.js` 中修改）：
- `TOTAL_CLIENTS` - 客户端数量（默认：50）
- `MESSAGES_PER_TEST` - 发送消息数（默认：100）
- `MESSAGE_INTERVAL` - 消息间隔（毫秒，默认：100）

### 4. 监控测试

```bash
cd tests/websocket
node test-monitor.js
```

该测试会：
- 连接到服务器
- 监控内存使用情况
- 运行一段时间后输出统计数据

## API 监控端点

### 获取 WebSocket 详细指标

```
GET /api/v1/monitoring/websocket
```

响应示例：
```json
{
  "success": true,
  "data": {
    "uptime": 3600000,
    "currentConnections": 10,
    "onlineUsers": 5,
    "totalConnections": 100,
    "totalDisconnections": 90,
    "messagesSent": 500,
    "messagesReceived": 480,
    "errors": 5,
    "avgConnectionTime": 120000,
    "rooms": ["room1", "room2"],
    "subscriptions": [
      {"channel": "channel1", "subscriberCount": 3}
    ]
  }
}
```

### 获取基本统计信息

```
GET /api/v1/monitoring/websocket/stats
```

### 获取在线用户

```
GET /api/v1/monitoring/websocket/online-users
```

## WebSocket 事件

### 获取指标（客户端）

```javascript
socket.emit('get:metrics', (response) => {
  console.log(response.metrics);
});
```

## 性能优化说明

### 心跳机制优化
- pingTimeout: 30秒（原60秒）
- pingInterval: 15秒（原25秒）
- 更快的连接状态检测

### 消息压缩
- 启用 perMessageDeflate 压缩
- 阈值设置为 1KB
- 减少网络带宽消耗

### 缓冲区大小
- maxHttpBufferSize: 10MB
- 支持更大的消息传输
