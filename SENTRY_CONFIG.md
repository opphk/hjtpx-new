# Sentry 配置指南

## 概述

本项目已集成 Sentry 错误追踪系统，支持 Node.js 主项目和 Go 语言 captchax 子项目。

## 1. 前置准备

### 1.1 创建 Sentry 项目

1. 访问 [Sentry 官网](https://sentry.io) 注册账号
2. 创建两个项目：
   - 一个 Node.js 项目（主 API）
   - 一个 Go 项目（captchax）
3. 获取每个项目的 DSN（Data Source Name）

## 2. Node.js 项目配置

### 2.1 环境变量配置

编辑对应的环境变量文件（`.env`、`.env.staging`、`.env.production`）：

```env
# Sentry 配置
SENTRY_DSN=https://your-dsn@sentry.io/project-id
SENTRY_ENVIRONMENT=production
SENTRY_RELEASE=hjtpx@1.0.0
SENTRY_TRACES_SAMPLE_RATE=1.0
SENTRY_PROFILES_SAMPLE_RATE=1.0
SENTRY_DEBUG=false
```

### 2.2 源码映射配置（Source Maps）

为了在 Sentry 中看到正确的堆栈跟踪，需要配置源码映射：

#### 步骤 1: 构建时生成源码映射

在 `package.json` 中添加构建脚本：

```json
{
  "scripts": {
    "build": "node --enable-source-maps src/index.js",
    "sentry:release": "sentry-cli releases new $SENTRY_RELEASE && sentry-cli releases files $SENTRY_RELEASE upload-sourcemaps ./dist"
  }
}
```

#### 步骤 2: 安装 Sentry CLI

```bash
npm install -g @sentry/cli
```

#### 步骤 3: 配置 Sentry CLI

创建 `.sentryclirc` 文件：

```ini
[auth]
token=your-sentry-auth-token

[defaults]
url=https://sentry.io
org=your-organization
project=hjtpx-api
```

## 3. Go 项目配置

### 3.1 YAML 配置文件

编辑 `captchax/config/config.yaml`：

```yaml
sentry:
  dsn: "https://your-dsn@sentry.io/project-id"
  environment: "production"
  release: "captchax@1.0.0"
  traces_sample_rate: 1.0
  debug: false
```

### 3.2 源码映射配置

对于 Go 项目，Sentry 会自动处理堆栈跟踪，但建议在构建时包含调试信息：

```bash
# 保留调试信息的构建
go build -gcflags "all=-N -l" -o captchax-server ./cmd/server

# 或者生产环境构建（带调试信息）
go build -ldflags "-s=false -w=false" -o captchax-server ./cmd/server
```

## 4. 错误分组配置

Sentry 提供了强大的错误分组功能，以下是推荐的配置：

### 4.1 自定义指纹（Fingerprinting）

在 Node.js 的 `sentry.js` 配置中，已包含网络错误标记：

```javascript
beforeSend(event, hint) {
  const error = hint.originalException;
  if (error && error.message) {
    if (error.message.includes('Network Error')) {
      event.tags = event.tags || {};
      event.tags.network_error = 'true';
    }
  }
  return event;
}
```

### 4.2 Sentry 控制台分组规则

在 Sentry 控制台中，可以配置以下分组规则：

1. **按错误类型分组**：`exception.type`
2. **按 API 端点分组**：`transaction`
3. **按环境分组**：`environment`

## 5. 性能监控配置

### 5.1 事务采样率

- **开发环境**：1.0（100% 采样）
- **预发布环境**：0.5（50% 采样）
- **生产环境**：0.1 - 0.3（10%-30% 采样）

### 5.2 忽略健康检查

在配置中已添加忽略健康检查端点的功能：

```javascript
beforeSendTransaction(event) {
  if (event.transaction && event.transaction.includes('/health')) {
    return null;
  }
  return event;
}
```

## 6. 告警规则配置

在 Sentry 控制台配置以下告警规则：

### 6.1 错误频率告警

| 规则名称 | 条件 | 通知方式 |
|---------|------|---------|
| 高错误率 | 5分钟内错误数 > 100 | Slack/邮件 |
| 新错误出现 | 首次出现的错误类型 | Slack/邮件 |
| 错误率突增 | 错误率增加 > 200% | Slack/邮件 |

### 6.2 性能告警

| 规则名称 | 条件 | 通知方式 |
|---------|------|---------|
| 慢事务 | p95 响应时间 > 3s | Slack |
| 错误率过高 | 错误率 > 5% | Slack/邮件 |

### 6.3 告警配置示例 (YAML)

```yaml
# Sentry 告警规则配置示例
alerts:
  - name: "High Error Rate"
    conditions:
      - event.frequency > 100
        interval: 5m
    actions:
      - slack_notification: "#alerts-channel"
      - email_notification: "dev-team@example.com"
  
  - name: "Slow Transactions"
    conditions:
      - transaction.duration.p95 > 3000
        interval: 1m
    actions:
      - slack_notification: "#perf-alerts"
```

## 7. 测试集成

### 7.1 测试 Node.js 集成

创建一个测试端点来验证 Sentry 配置：

```javascript
app.get('/test-sentry', (req, res) => {
  throw new Error('Test Sentry integration!');
});
```

### 7.2 测试 Go 集成

在 captchax 项目中添加测试端点：

```go
router.GET("/test-sentry", func(c *gin.Context) {
    panic("Test Sentry integration!")
})
```

## 8. 最佳实践

1. **环境隔离**：为不同环境（dev/staging/prod）使用不同的 Sentry 项目
2. **采样策略**：生产环境降低采样率以节省成本
3. **标签使用**：充分利用标签（tags）来分类错误
4. **发布管理**：每次部署都创建新的 release 并上传源码映射
5. **告警优化**：避免告警疲劳，只设置重要的告警规则

## 9. 故障排除

### 9.1 错误没有上报

- 检查 DSN 是否正确
- 验证环境变量是否加载
- 查看控制台是否有 Sentry 初始化日志

### 9.2 源码映射不工作

- 确认源码映射已上传到正确的 release
- 检查文件路径是否匹配

---

## 完整配置文件索引

- Node.js Sentry 配置：`src/backend/config/sentry.js`
- Node.js 主入口：`src/index.js`
- Go Sentry 配置：`captchax/internal/sentry/sentry.go`
- Go 主入口：`captchax/cmd/server/main.go`
- Go 配置文件：`captchax/config/config.yaml`
- 环境变量示例：`.env.production`、`.env.staging`
