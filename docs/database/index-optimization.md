# 数据库索引设计与优化建议

## 概述

本文档提供数据库索引设计的最佳实践和优化建议，帮助提升查询性能。

---

## 索引设计原则

### 1. 选择性原则

- **高选择性列优先**：索引列的值分布越分散，选择性越高，效果越好
- **避免低选择性列**：如性别、状态等低选择性列单独建索引效果差
- **组合索引顺序**：将高选择性列放在前面

### 2. 查询覆盖原则

- **覆盖索引**：包含查询所需的所有列，避免回表
- **最左前缀原则**：组合索引从最左边开始使用
- **避免 SELECT ***：只查询需要的列

### 3. 写入性能权衡

- **索引数量控制**：每个索引都会增加 INSERT/UPDATE/DELETE 的开销
- **批量操作优化**：大量数据导入时先删除索引，导入完成后再重建
- **索引维护成本**：定期分析索引使用情况，删除无用索引

---

## 查询模式分析

### 核心查询类型

| 查询类型 | 示例 | 索引设计建议 |
|---------|------|------------|
| 精确匹配 | `WHERE email = 'xxx'` | 单列索引 |
| 范围查询 | `WHERE created_at > '2024-01-01'` | B-tree 索引 |
| 多条件 | `WHERE role = 'admin' AND is_active = true` | 组合索引 |
| 模糊搜索 | `WHERE name LIKE '张%'` | 前缀索引 |
| 全文搜索 | `WHERE body @@ '关键词'` | GIN 索引 |
| 数组查询 | `WHERE channels @> ARRAY['email']` | GIN 索引 |

---

## 核心表索引设计

### 1. users 表

**查询模式**：
- `SELECT * FROM users WHERE email = 'xxx'` - 登录查询
- `SELECT * FROM users WHERE is_active = true` - 获取活跃用户
- `SELECT * FROM users WHERE role = 'admin'` - 按角色筛选
- `SELECT * FROM users ORDER BY created_at DESC` - 按时间排序

**索引策略**：

```sql
-- 主键索引（自动创建）
PRIMARY KEY (id)

-- 精确匹配：邮箱登录查询
CREATE INDEX idx_users_email ON users(email);

-- 组合索引：活跃用户 + 角色筛选
CREATE INDEX idx_users_active_role ON users(is_active, role);

-- 部分索引：仅索引活跃用户
CREATE INDEX idx_users_email_active ON users(email) WHERE is_active = true;

-- 排序索引：按创建时间倒序
CREATE INDEX idx_users_created_at ON users(created_at DESC);

-- 外键索引：会话关联
CREATE INDEX idx_users_reset_token ON users(reset_token) WHERE reset_token IS NOT NULL;
```

**优化建议**：
- 邮箱是登录凭证，必须唯一索引
- `is_active` 列使用部分索引，减少索引大小
- 组合索引考虑查询频率和选择性

---

### 2. sessions 表

**查询模式**：
- `SELECT * FROM sessions WHERE token = 'xxx'` - 令牌验证
- `SELECT * FROM sessions WHERE user_id = 'xxx' AND expires_at > NOW()` - 获取用户有效会话
- `DELETE FROM sessions WHERE expires_at < NOW()` - 清理过期会话

**索引策略**：

```sql
-- 主键索引（自动创建）
PRIMARY KEY (id)

-- 令牌查询：精确匹配
CREATE INDEX idx_sessions_token ON sessions(token);

-- 用户会话查询：组合索引
CREATE INDEX idx_sessions_user_active ON sessions(user_id, expires_at) 
WHERE is_revoked = false;

-- 过期会话清理：部分索引
CREATE INDEX idx_sessions_expired ON sessions(expires_at) 
WHERE expires_at < CURRENT_TIMESTAMP;

-- 活动追踪：最后活动时间
CREATE INDEX idx_sessions_last_activity ON sessions(last_activity);
```

**优化建议**：
- Token 使用精确匹配，创建索引
- 定期清理过期会话，使用部分索引提高清理效率
- 会话表写入频繁，注意索引维护开销

---

### 3. notifications 表

**查询模式**：
- `SELECT * FROM notifications WHERE user_id = 'xxx' AND status = 'unread'` - 获取未读通知
- `SELECT * FROM notifications WHERE user_id = 'xxx' ORDER BY created_at DESC` - 按时间排序
- `DELETE FROM notifications WHERE expires_at < NOW()` - 清理过期通知

**索引策略**：

```sql
-- 主键索引（自动创建）
PRIMARY KEY (id)

-- 用户通知查询：组合索引
CREATE INDEX idx_notifications_user_status ON notifications(user_id, status);

-- 用户通知排序：组合索引
CREATE INDEX idx_notifications_user_created ON notifications(user_id, created_at DESC);

-- 通知类型查询
CREATE INDEX idx_notifications_type ON notifications(type);

-- 过期通知清理：部分索引
CREATE INDEX idx_notifications_expired ON notifications(expires_at) 
WHERE expires_at IS NOT NULL AND expires_at < CURRENT_TIMESTAMP;

-- 批量标记已读
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read) 
WHERE is_read = false;
```

**优化建议**：
- 通知表查询频繁，合理使用组合索引
- 过期通知定期清理，避免数据膨胀
- 使用部分索引减少索引大小

---

### 4. login_history 表

**查询模式**：
- `SELECT * FROM login_history WHERE user_id = 'xxx' ORDER BY created_at DESC` - 用户登录历史
- `SELECT * FROM login_history WHERE ip_address = 'xxx'` - IP 地址查询
- `SELECT COUNT(*) FROM login_history WHERE created_at > NOW() - INTERVAL '1 hour'` - 登录统计

**索引策略**：

```sql
-- 主键索引（自动创建）
PRIMARY KEY (id)

-- 用户登录历史：组合索引
CREATE INDEX idx_login_history_user_created ON login_history(user_id, created_at DESC);

-- IP 地址安全查询
CREATE INDEX idx_login_history_ip ON login_history(ip_address);

-- 登录统计：按时间排序
CREATE INDEX idx_login_history_created ON login_history(created_at DESC);

-- 登录结果查询
CREATE INDEX idx_login_history_success ON login_history(success);
```

**优化建议**：
- 登录历史表数据量大，考虑分区
- 使用 BRIN 索引替代 B-tree 索引（按块存储）
- 定期归档历史数据

---

### 5. audit_logs 表

**查询模式**：
- `SELECT * FROM audit_logs WHERE user_id = 'xxx' ORDER BY created_at DESC` - 用户审计日志
- `SELECT * FROM audit_logs WHERE action = 'login' AND created_at > NOW() - INTERVAL '7 days'` - 行为审计
- `SELECT * FROM audit_logs WHERE resource_type = 'users' AND resource_id = 'xxx'` - 资源变更查询

**索引策略**：

```sql
-- 主键索引（自动创建）
PRIMARY KEY (id)

-- 用户审计日志：组合索引
CREATE INDEX idx_audit_logs_user_created ON audit_logs(user_id, created_at DESC);

-- 行为审计：组合索引
CREATE INDEX idx_audit_logs_action_created ON audit_logs(action, created_at DESC);

-- 资源变更查询：组合索引
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);

-- 时间范围查询：BRIN 索引（适合大表）
CREATE INDEX idx_audit_logs_created_brin ON audit_logs USING BRIN (created_at);

-- 响应状态查询
CREATE INDEX idx_audit_logs_status ON audit_logs(response_status) 
WHERE response_status >= 400;
```

**优化建议**：
- 审计日志表数据量大，使用 BRIN 索引
- 按时间分区存储，提高查询性能
- 使用部分索引过滤错误日志

---

## 高级索引策略

### 1. 部分索引

**适用场景**：
- 查询条件固定（如 `is_active = true`）
- 需要排除大部分数据
- 索引列选择性低

**示例**：

```sql
-- 活跃用户索引
CREATE INDEX idx_users_active ON users(email) 
WHERE is_active = true;

-- 未读通知索引
CREATE INDEX idx_notifications_unread ON notifications(user_id, created_at) 
WHERE is_read = false;

-- 错误日志索引
CREATE INDEX idx_api_perf_errors ON api_performance(endpoint, created_at) 
WHERE status_code >= 400;
```

### 2. 表达式索引

**适用场景**：
- 查询中使用函数或表达式
- 需要对计算结果建立索引

**示例**：

```sql
-- 邮箱域名查询
CREATE INDEX idx_users_email_domain ON users(LOWER(SUBSTRING(email FROM POSITION('@' IN email) + 1)));

-- 日期查询
CREATE INDEX idx_user_events_date ON user_events(DATE(created_at));

-- JSON 字段查询
CREATE INDEX idx_user_events_type ON user_events((event_data->>'type'));
```

### 3. 复合索引设计

**设计原则**：
1. 将等值查询列放在前面
2. 将范围查询列放在最后
3. 考虑查询的最左前缀

**示例**：

```sql
-- 查询：WHERE user_id = 'xxx' AND status = 'unread' AND created_at > 'xxx'
-- 错误设计：(created_at, status, user_id)
-- 正确设计：(user_id, status, created_at)
CREATE INDEX idx_notifications_user_status_created 
ON notifications(user_id, status, created_at);
```

### 4. GIN 索引

**适用场景**：
- JSONB 字段全文搜索
- 数组字段包含查询
- 全文搜索

**示例**：

```sql
-- JSONB 字段索引
CREATE INDEX idx_notifications_data ON notifications USING GIN (data);

-- 数组字段索引
CREATE INDEX idx_notifications_channels ON notifications USING GIN (channels);

-- 全文搜索索引
CREATE INDEX idx_page_views_search ON page_views USING GIN (to_tsvector('english', page_path));
```

---

## 索引维护

### 1. 分析和统计

```sql
-- 分析表和索引统计信息
ANALYZE users;

-- 分析特定索引
ANALYZE VERBOSE users;

-- 查看表统计信息
SELECT 
    schemaname,
    tablename,
    n_tup_ins as inserts,
    n_tup_upd as updates,
    n_tup_del as deletes,
    n_live_tup as live_tuples,
    n_dead_tup as dead_tuples
FROM pg_stat_user_tables
WHERE tablename = 'users';
```

### 2. 索引使用统计

```sql
-- 查看索引使用情况
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan as number_of_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
JOIN pg_index USING (indexrelid)
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
```

### 3. 未使用索引识别

```sql
-- 识别从未使用的索引
SELECT 
    schemaname || '.' || tablename as table,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND indexrelid NOT IN (
    SELECT conindid FROM pg_constraint WHERE contype IN ('p', 'u')
  )
ORDER BY pg_relation_size(indexrelid) DESC;
```

### 4. 索引重建

```sql
-- 重建单个索引
REINDEX INDEX CONCURRENTLY idx_users_email;

-- 重建表的所有索引
REINDEX TABLE CONCURRENTLY users;

-- 重建整个数据库的索引
REINDEX DATABASE hjtpx;
```

---

## 性能监控

### 1. 慢查询监控

```sql
-- 启用慢查询日志（需在 postgresql.conf 中配置）
-- log_min_duration_statement = 1000  -- 记录超过 1 秒的查询

-- 查看最近的重查询
SELECT 
    query,
    calls,
    mean_time,
    total_time,
    rows
FROM pg_stat_statements
ORDER BY total_time DESC
LIMIT 10;
```

### 2. EXPLAIN 分析

```sql
-- 分析查询计划
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT * FROM users 
WHERE email = 'test@example.com' 
AND is_active = true;

-- 查看是否使用索引
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM sessions 
WHERE user_id = 'xxx' 
AND expires_at > CURRENT_TIMESTAMP;
```

### 3. 索引推荐

```sql
-- 基于查询统计推荐索引
SELECT 
    'CREATE INDEX CONCURRENTLY idx_' || substr(query, 1, 30) || '_recommended ON ' ||
    tables.schemaname || '.' || tables.tablename ||
    ' (' || string_agg(columns.column_name, ', ') || ');' as recommended_index
FROM pg_stat_statements
JOIN LATERAL unnest(string_to_array(regexp_replace(query, '.*FROM\s+(\w+)', '\1'), ' ')) as tbl(text) ON true
JOIN pg_catalog.pg_namespace nsp ON nsp.nspname = 'public'
JOIN pg_catalog.pg_class tables ON tables.relname = tbl.text AND tables.relnamespace = nsp.oid
JOIN information_schema.columns columns ON columns.table_schema = nsp.nspname AND columns.table_name = tables.relname
WHERE tables.relkind = 'r'
GROUP BY query, tables.schemaname, tables.tablename
ORDER BY pg_stat_statements.total_time DESC
LIMIT 10;
```

---

## 分区表策略

### 时间序列分区

```sql
-- 创建分区表
CREATE TABLE api_performance (
    id UUID DEFAULT gen_random_uuid(),
    endpoint VARCHAR(500) NOT NULL,
    duration_ms INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) PARTITION BY RANGE (created_at);

-- 创建月度分区
CREATE TABLE api_performance_2024_01 PARTITION OF api_performance
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE api_performance_2024_02 PARTITION OF api_performance
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

-- 自动创建分区的函数
CREATE OR REPLACE FUNCTION create_monthly_partition()
RETURNS void AS $$
DECLARE
    start_date DATE;
    end_date DATE;
    partition_name TEXT;
BEGIN
    start_date := DATE_TRUNC('month', CURRENT_DATE);
    end_date := start_date + INTERVAL '1 month';
    partition_name := 'api_performance_' || TO_CHAR(start_date, 'YYYY_MM');
    
    EXECUTE format(
        'CREATE TABLE IF NOT EXISTS %I PARTITION OF api_performance 
         FOR VALUES FROM (%L) TO (%L)',
        partition_name, start_date, end_date
    );
END;
$$ LANGUAGE plpgsql;
```

---

## 最佳实践总结

### 索引创建 checklist

- [ ] 确认查询频率高
- [ ] 评估索引对写入性能的影响
- [ ] 考虑使用部分索引减少大小
- [ ] 组合索引遵循最左前缀原则
- [ ] 定期分析索引使用情况
- [ ] 删除未使用的索引

### 监控指标

| 指标 | 目标值 | 告警阈值 |
|------|--------|----------|
| 索引扫描比例 | > 95% | < 80% |
| 慢查询数量 | < 10/天 | > 50/天 |
| 未使用索引数量 | 0 | > 5 |
| 索引膨胀率 | < 10% | > 30% |
| 查询响应时间 P95 | < 100ms | > 500ms |

---

## 版本历史

| 日期 | 版本 | 变更内容 |
|------|------|----------|
| 2026-05-15 | 1.0 | 初始索引设计文档 |
| 2026-05-15 | 1.1 | 添加高级索引策略和维护建议 |

---

## 维护说明

- **文档版本**：1.1
- **最后更新**：2026-05-15
- **维护者**：HJTPX 开发团队
