# 数据库设计规范

## 概述

本文档定义了 HJTPX 项目的数据库设计规范，包括命名规范、字段类型选择指南、约束设计规范等，确保数据库设计的一致性和可维护性。

---

## 1. 命名规范

### 1.1 表命名规范

**基本原则**：
- 使用英文单词或通用缩写
- 使用小写字母
- 使用下划线分隔单词
- 使用复数形式表示实体集合
- 保持简洁但具有描述性

**命名模式**：

```
[模块_]表名
```

**示例**：

| 业务含义 | 表名 | 说明 |
|---------|------|------|
| 用户表 | `users` | 核心用户表 |
| 用户会话 | `sessions` | 用户会话表 |
| 用户角色关联 | `user_roles` | 多对多关联表 |
| 登录历史 | `login_history` | 登录记录表 |
| 审计日志 | `audit_logs` | 审计日志表 |
| 通知 | `notifications` | 通知消息表 |

**禁止**：
- ❌ `User`、`UserInfo`、`tbl_user` - 大小写不一致
- ❌ `userloginhistory` - 无分隔符
- ❌ `t_user` - 匈牙利命名法
- ❌ `users_info_logs` - 多重分隔符

### 1.2 字段命名规范

**基本原则**：
- 使用小写字母
- 使用下划线分隔单词
- 保持简洁但具有描述性
- 避免使用数据库关键字

**通用字段命名**：

| 字段含义 | 字段名 | 说明 |
|---------|--------|------|
| 主键 | `id` | UUID 类型 |
| 外键 | `{表名}_id` | 如 `user_id` |
| 创建时间 | `created_at` | 自动设置 |
| 更新时间 | `updated_at` | 自动更新 |
| 删除时间 | `deleted_at` | 软删除 |
| 名称 | `name` | 通用名称字段 |
| 标题 | `title` | 用于内容标题 |
| 描述 | `description` | 用于内容描述 |
| 状态 | `status` | 状态枚举 |
| 排序 | `sort_order` | 排序字段 |
| 元数据 | `metadata` | JSON 格式 |
| IP 地址 | `ip_address` | 使用 INET 类型 |

**示例**：

```sql
-- 正确示例
id UUID PRIMARY KEY
user_id UUID REFERENCES users(id)
email VARCHAR(255)
created_at TIMESTAMP
is_active BOOLEAN
status VARCHAR(20)
metadata JSONB

-- 错误示例
ID - 大小写不一致
UserId - 驼峰命名
userId - 混合命名
createdAt - 驼峰命名
user_name_id - 过度描述
```

### 1.3 索引命名规范

**命名模式**：

```
[idx_]{表名}_{索引列1}[_{索引列2}...][_{额外描述}]
```

**示例**：

```sql
-- 单列索引
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_sessions_token ON sessions(token);

-- 组合索引
CREATE INDEX idx_notifications_user_status ON notifications(user_id, status);
CREATE INDEX idx_audit_logs_user_created ON audit_logs(user_id, created_at DESC);

-- 部分索引
CREATE INDEX idx_users_active ON users(email) WHERE is_active = true;

-- 外键索引
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
```

**禁止**：
- ❌ `index_1`、`index_2` - 无描述性
- ❌ `idx_users_email_unique` - unique 重复

### 1.4 约束命名规范

**命名模式**：

| 约束类型 | 命名模式 | 示例 |
|---------|---------|------|
| 主键 | `pk_{表名}` | `pk_users` |
| 外键 | `fk_{表名}_{参照表名}` | `fk_sessions_users` |
| 唯一约束 | `uq_{表名}_{字段名}` | `uq_users_email` |
| 检查约束 | `chk_{表名}_{条件简述}` | `chk_users_status` |

**示例**：

```sql
-- 主键约束
ALTER TABLE users ADD CONSTRAINT pk_users PRIMARY KEY (id);

-- 外键约束
ALTER TABLE sessions ADD CONSTRAINT fk_sessions_users 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- 唯一约束
ALTER TABLE users ADD CONSTRAINT uq_users_email UNIQUE (email);

-- 检查约束
ALTER TABLE presence ADD CONSTRAINT chk_presence_status 
CHECK (status IN ('online', 'away', 'busy', 'offline'));
```

### 1.5 触发器命名规范

**命名模式**：

```
{trig}_{表名}_{触发操作}
```

**示例**：

```sql
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

---

## 2. 字段类型选择指南

### 2.1 标识符类型

**UUID**：

```sql
-- 推荐：用于主键和外键
id UUID PRIMARY KEY DEFAULT gen_random_uuid()

-- 优点：
-- 1. 全局唯一性
-- 2. 分布式环境友好
-- 3. 安全性高（不可预测）
-- 4. 无需数据库序列

-- 缺点：
-- 1. 存储空间较大（16字节 vs 4字节整数）
-- 2. 索引性能略低
-- 3. 可读性差
```

**自增整数**：

```sql
-- 用于：迁移追踪、日志 ID 等
id SERIAL PRIMARY KEY

-- 优点：
-- 1. 存储空间小（4字节）
-- 2. 索引性能高
-- 3. 可读性好

-- 缺点：
-- 1. 分布式环境需序列
-- 2. 合并数据困难
```

### 2.2 字符串类型

**VARCHAR(n)**：

```sql
-- 推荐：用于有长度限制的字符串
email VARCHAR(255)          -- 邮箱
name VARCHAR(100)           -- 名称
title VARCHAR(200)          -- 标题
phone VARCHAR(20)           -- 电话号码

-- 注意：
-- 1. 根据实际需求设置合理长度
-- 2. VARCHAR(255) 是常用选择
-- 3. 避免使用过大的长度限制
```

**TEXT**：

```sql
-- 用于：无长度限制的文本
description TEXT           -- 描述
content TEXT              -- 内容
user_agent TEXT           -- User-Agent

-- 注意：
-- 1. 无长度限制
-- 2. 索引受限（需表达式索引）
-- 3. 适合大文本存储
```

**CHAR(n)**：

```sql
-- 不推荐：用于固定长度的字符串
-- 用途有限，仅在以下场景使用：
code CHAR(6)              -- 固定长度验证码
country_code CHAR(2)      -- 国家代码

-- 注意：不足部分用空格填充
```

### 2.3 数值类型

**整数类型**：

| 类型 | 范围 | 存储空间 | 适用场景 |
|------|------|---------|---------|
| SMALLINT | -32,768 ~ 32,767 | 2 字节 | 小范围计数 |
| INTEGER | -2B ~ 2B | 4 字节 | 通用整数 |
| BIGINT | -9E ~ 9E | 8 字节 | 大范围计数 |
| SERIAL | 1 ~ 2B | 4 字节 | 自增主键 |
| BIGSERIAL | 1 ~ 9E | 8 字节 | 大表自增主键 |

```sql
-- 示例
age SMALLINT              -- 年龄（0-150）
count INTEGER             -- 数量
user_count BIGINT         -- 大表计数
id SERIAL                 -- 自增 ID
```

**小数类型**：

```sql
-- DECIMAL(p, s)：精确小数
-- p: 总位数, s: 小数位数
price DECIMAL(10, 2)      -- 价格（最大 99999999.99）
latitude DECIMAL(9, 6)    -- 纬度
longitude DECIMAL(9, 6)   -- 经度

-- NUMERIC：等同于 DECIMAL
ratio NUMERIC(5, 4)       -- 比率

-- 注意：
-- 1. 货币计算使用 DECIMAL
-- 2. 避免使用 FLOAT/DOUBLE（有精度问题）
```

**浮点类型**：

```sql
-- REAL：4字节浮点
score REAL                -- 评分

-- DOUBLE PRECISION：8字节浮点
distance DOUBLE PRECISION -- 距离

-- 注意：仅在精度要求不高时使用
```

### 2.4 日期时间类型

**TIMESTAMP**：

```sql
-- 带时区的时间戳
created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP

-- 推荐用于：
-- 1. 需要跨时区处理的时间
-- 2. 日志和审计时间
-- 3. 需要精确到毫秒的时间
```

**TIMESTAMPTZ**（别名）：

```sql
-- TIMESTAMP WITH TIME ZONE 的简写
updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
```

**DATE**：

```sql
-- 仅日期
birth_date DATE           -- 出生日期
start_date DATE           -- 开始日期

-- 用于：不需要时间的日期存储
```

**TIME**：

```sql
-- 仅时间
work_start TIME           -- 工作开始时间
work_end TIME             -- 工作结束时间

-- 用于：不需要日期的时间存储
```

**INTERVAL**：

```sql
-- 时间间隔
duration INTERVAL         -- 持续时间
valid_for INTERVAL        -- 有效期

-- 用于：时间加减计算
```

### 2.5 布尔类型

```sql
-- 布尔值
is_active BOOLEAN DEFAULT true
is_verified BOOLEAN DEFAULT false
is_deleted BOOLEAN DEFAULT false

-- 注意：
-- 1. 避免使用 0/1 替代
-- 2. 避免使用 ENUM('true', 'false')
-- 3. 默认值要明确
```

### 2.6 JSON 类型

**JSONB**：

```sql
-- 二进制 JSON，支持索引
metadata JSONB DEFAULT '{}'
event_data JSONB DEFAULT '{}'

-- 优点：
-- 1. 支持索引
-- 2. 查询性能好
-- 3. 无重复解析

-- 使用场景：
-- 1. 灵活的结构化数据
-- 2. 配置信息
-- 3. 扩展字段
```

**JSON**：

```sql
-- JSON 文本
raw_data JSON

-- 适用场景：
-- 1. 仅存储和返回，不查询
-- 2. 数据量小的场景
```

### 2.7 网络地址类型

```sql
-- IPv4/IPv6 地址
ip_address INET

-- MAC 地址
mac_address MACADDR

-- CIDR 范围
ip_range CIDR

-- 优点：
-- 1. IP 计算和比较
-- 2. 子网掩码操作
-- 3. IP 地址类型检查
```

### 2.8 数组类型

```sql
-- PostgreSQL 原生数组
tags VARCHAR(50)[]
channels VARCHAR(20)[] DEFAULT ARRAY['in_app']

-- 适用场景：
-- 1. 多值属性
-- 2. 标签系统
-- 3. 通知渠道

-- 注意：
-- 1. 使用 GIN 索引优化查询
-- 2. 避免过大数组
```

### 2.9 枚举类型

**数据库 ENUM**：

```sql
-- 创建枚举类型
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'banned');
CREATE TYPE priority AS ENUM ('low', 'normal', 'high', 'urgent');

-- 使用枚举
status user_status DEFAULT 'active'
priority priority DEFAULT 'normal'

-- 优点：
-- 1. 数据完整性
-- 2. 类型检查
-- 3. 可读性好

-- 缺点：
-- 1. 修改需要 ALTER TYPE
-- 2. 跨数据库迁移复杂
```

**VARCHAR 替代**：

```sql
-- 简单场景使用 VARCHAR
status VARCHAR(20) CHECK (status IN ('active', 'inactive', 'banned'))

-- 适用场景：
-- 1. 值可能变化
-- 2. 不需要类型严格检查
```

---

## 3. 约束设计规范

### 3.1 主键约束

**原则**：

```sql
-- 规则 1：每个表必须有主键
-- 规则 2：主键值必须唯一
-- 规则 3：主键值不能为空
-- 规则 4：主键值不应包含业务含义

-- 推荐：使用 UUID 作为主键
id UUID PRIMARY KEY DEFAULT gen_random_uuid()

-- 不推荐：复合主键
PRIMARY KEY (user_id, role_id)  -- 应使用外键关联表
```

### 3.2 外键约束

**原则**：

```sql
-- 规则 1：外键必须引用主键
-- 规则 2：考虑级联删除的影响
-- 规则 3：必要时添加索引

-- 推荐：明确指定删除规则
user_id UUID REFERENCES users(id) ON DELETE CASCADE

-- 常用删除规则：
-- CASCADE：级联删除
-- SET NULL：设为 NULL
-- SET DEFAULT：设为默认值
-- RESTRICT：阻止删除
-- NO ACTION：延迟检查（默认）
```

**示例**：

```sql
-- 会话表：用户删除时删除会话
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    ...
);

-- 通知表：用户删除时删除通知
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    ...
);

-- 审计日志表：保留审计记录
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    ...
);
```

### 3.3 唯一约束

**原则**：

```sql
-- 规则 1：确保数据唯一性
-- 规则 2：允许 NULL 值（单列唯一约束）
-- 规则 3：一个表可有多个唯一约束

-- 示例
email VARCHAR(255) UNIQUE
ALTER TABLE users ADD CONSTRAINT uq_users_email UNIQUE (email);

-- 复合唯一约束
ALTER TABLE role_permissions ADD CONSTRAINT uq_role_permissions 
UNIQUE (role_id, permission_id);
```

### 3.4 检查约束

**原则**：

```sql
-- 规则 1：验证数据有效性
-- 规则 2：保持约束简单
-- 规则 3：在应用层也做验证

-- 示例：状态值检查
ALTER TABLE presence ADD CONSTRAINT chk_presence_status 
CHECK (status IN ('online', 'away', 'busy', 'offline'));

-- 示例：数值范围检查
ALTER TABLE login_attempts ADD CONSTRAINT chk_login_attempts_attempts 
CHECK (failed_attempts >= 0 AND failed_attempts <= 10);

-- 示例：日期逻辑检查
ALTER TABLE sessions ADD CONSTRAINT chk_sessions_expires 
CHECK (expires_at > created_at);
```

### 3.5 非空约束

**原则**：

```sql
-- 规则 1：必填字段使用 NOT NULL
-- 规则 2：可选字段允许 NULL
-- 规则 3：NOT NULL 可提高查询性能

-- 示例
email VARCHAR(255) NOT NULL           -- 必须有邮箱
name VARCHAR(255) NOT NULL           -- 必须有名称
phone VARCHAR(20)                     -- 可选电话号码
deleted_at TIMESTAMP                  -- 可选的删除时间
```

### 3.6 默认值约束

**原则**：

```sql
-- 规则 1：提供合理的默认值
-- 规则 2：默认值不应违反业务规则
-- 规则 3：显式设置默认值

-- 示例
is_active BOOLEAN DEFAULT true
role VARCHAR(50) DEFAULT 'user'
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
status VARCHAR(20) DEFAULT 'pending'
priority VARCHAR(20) DEFAULT 'normal'
```

---

## 4. 索引设计规范

### 4.1 索引创建原则

**何时创建索引**：

```sql
-- 1. 主键和外键自动创建索引
-- 2. WHERE 子句频繁使用的列
-- 3. JOIN 条件中使用的列
-- 4. ORDER BY 子句中的列
-- 5. SELECT 中 DISTINCT 使用的列
-- 6. 高选择性的列
```

**何时避免索引**：

```sql
-- 1. 低选择性列（性别、状态等）
-- 2. 频繁更新的列
-- 3. 小表（< 1000 行）
-- 4. 只写入不查询的表
```

### 4.2 索引类型选择

| 索引类型 | 使用场景 |
|---------|---------|
| B-tree | 默认，适合等值和范围查询 |
| Hash | 仅适合等值查询，性能高 |
| GiST | 几何数据、全文搜索 |
| GIN | JSONB、数组、全文搜索 |
| BRIN | 大表按块索引，时序数据 |

```sql
-- B-tree（默认）
CREATE INDEX idx_users_email ON users(email);

-- 部分索引
CREATE INDEX idx_users_active ON users(email) WHERE is_active = true;

-- 复合索引
CREATE INDEX idx_orders_status_date ON orders(status, created_at);

-- GIN 索引
CREATE INDEX idx_products_tags ON products USING GIN (tags);
CREATE INDEX idx_config_data ON config USING GIN (data jsonb_path_ops);

-- BRIN 索引
CREATE INDEX idx_logs_created ON logs USING BRIN (created_at);
```

### 4.3 索引维护

```sql
-- 定期分析索引
ANALYZE users;

-- 查看索引使用情况
SELECT * FROM pg_stat_user_indexes WHERE idx_scan = 0;

-- 删除未使用的索引
DROP INDEX IF EXISTS idx_unused_index;

-- 重建膨胀的索引
REINDEX INDEX CONCURRENTLY idx_users_email;
```

---

## 5. 触发器设计规范

### 5.1 更新时间戳触发器

```sql
-- 标准更新时间戳函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 应用到表
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

### 5.2 审计触发器

```sql
-- 记录变更历史
CREATE OR REPLACE FUNCTION log_presence_change()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO presence_history (user_id, action, status)
        VALUES (NEW.user_id, 'login', NEW.status);
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO presence_history (user_id, action, status)
        VALUES (OLD.user_id, 'logout', OLD.status);
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status IS DISTINCT FROM NEW.status THEN
            INSERT INTO presence_history (user_id, action, status)
            VALUES (NEW.user_id, 'status_change', NEW.status);
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## 6. 表设计规范

### 6.1 表创建原则

```sql
-- 规则 1：表名使用复数形式
-- 规则 2：使用 IF NOT EXISTS 防止重复创建
-- 规则 3：添加表注释
-- 规则 4：使用模式（schema）组织表

-- 示例
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE users IS '用户账户信息表';
COMMENT ON COLUMN users.email IS '用户邮箱地址，用于登录';
```

### 6.2 软删除设计

```sql
-- 推荐：使用 deleted_at 实现软删除
deleted_at TIMESTAMP  -- NULL 表示未删除，非 NULL 表示已删除

-- 查询未删除记录
SELECT * FROM users WHERE deleted_at IS NULL;

-- 软删除记录
UPDATE users SET deleted_at = CURRENT_TIMESTAMP WHERE id = 'xxx';

-- 部分索引优化
CREATE INDEX idx_users_active ON users(email) WHERE deleted_at IS NULL;
```

### 6.3 多对多关系设计

```sql
-- 使用关联表
CREATE TABLE user_roles (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, role_id)
);

-- 添加索引优化查询
CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role_id);
```

---

## 7. 迁移文件规范

### 7.1 迁移命名

```
{序号}_{简短描述}.sql
序号：001, 002, 003...
描述：使用下划线分隔的英文单词
```

**示例**：
- `001_initial_schema.sql`
- `002_add_roles_and_permissions.sql`
- `003_create_notifications_table.sql`

### 7.2 迁移结构

```sql
-- Migration: 添加通知表
-- Created: 2024-01-01
-- Description: 创建通知系统相关表

-- UP 迁移：执行变更
CREATE TABLE IF NOT EXISTS notifications (
    ...
);

-- DOWN 迁移：回滚变更
-- DROP TABLE IF EXISTS notifications;
```

### 7.3 可恢复性

```sql
-- 规则 1：所有操作必须可回滚
-- 规则 2：使用 DROP ... IF EXISTS
-- 规则 3：按顺序创建，逆序删除
-- 规则 4：添加错误处理

-- UP
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    ...
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- DOWN
DROP INDEX IF EXISTS idx_users_email;
DROP TABLE IF EXISTS users;
```

---

## 8. 性能优化规范

### 8.1 查询优化

```sql
-- 规则 1：避免 SELECT *
SELECT id, email, name FROM users WHERE id = 'xxx';

-- 规则 2：使用 LIMIT 限制结果集
SELECT * FROM logs ORDER BY created_at DESC LIMIT 100;

-- 规则 3：使用 EXPLAIN 分析查询
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM users WHERE email = 'xxx';

-- 规则 4：批量操作使用事务
BEGIN;
INSERT INTO users (...) VALUES (...);
INSERT INTO user_roles (...) VALUES (...);
COMMIT;
```

### 8.2 写入优化

```sql
-- 规则 1：批量插入使用 COPY 或 INSERT 多值
INSERT INTO users (email, name) VALUES 
    ('a@test.com', 'User A'),
    ('b@test.com', 'User B'),
    ('c@test.com', 'User C');

-- 规则 2：禁用索引后批量写入
ALTER TABLE users DISABLE TRIGGER ALL;
... 批量插入 ...
ALTER TABLE users ENABLE TRIGGER ALL;
REINDEX TABLE users;

-- 规则 3：使用 PREPARED STATEMENT
PREPARE user_insert (UUID, VARCHAR, VARCHAR) AS
INSERT INTO users (id, email, name) VALUES ($1, $2, $3);
```

### 8.3 表分区

```sql
-- 规则 1：大表按时间分区
CREATE TABLE logs (
    ...
    created_at TIMESTAMP
) PARTITION BY RANGE (created_at);

-- 规则 2：按月分区
CREATE TABLE logs_2024_01 PARTITION OF logs
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
```

---

## 9. 安全规范

### 9.1 敏感数据处理

```sql
-- 规则 1：密码必须加密存储
password VARCHAR(255) NOT NULL  -- bcrypt 加密

-- 规则 2：敏感字段加密
ALTER TABLE users ADD COLUMN ssn_encrypted BYTEA;

-- 规则 3：日志脱敏
-- 应用层处理，不在数据库层存储明文敏感信息
```

### 9.2 权限控制

```sql
-- 规则 1：最小权限原则
GRANT SELECT, INSERT, UPDATE ON users TO app_user;
GRANT SELECT ON users TO readonly_user;

-- 规则 2：分离应用账号和审计账号
-- 应用账号：数据操作
-- 审计账号：只读访问
```

---

## 10. 文档规范

### 10.1 表注释

```sql
COMMENT ON TABLE users IS '用户账户信息表';
COMMENT ON COLUMN users.email IS '用户邮箱地址，用于登录认证';
COMMENT ON COLUMN users.password IS 'bcrypt 加密后的密码';
COMMENT ON COLUMN users.is_active IS '账户是否激活，false 表示已禁用';
```

### 10.2 代码文档

```sql
-- 迁移文件头部注释
-- =============================================
-- Migration: 001_initial_schema
-- Created: 2024-01-01
-- Author: dev_team
-- Description: 创建初始数据库架构
-- =============================================

-- 函数注释
COMMENT ON FUNCTION update_updated_at_column() IS 
'自动更新 updated_at 字段的触发器函数';
```

---

## 11. 版本历史

| 日期 | 版本 | 变更内容 |
|------|------|----------|
| 2026-05-15 | 1.0 | 初始数据库设计规范 |

---

## 12. 维护说明

- **文档版本**：1.0
- **最后更新**：2026-05-15
- **维护者**：HJTPX 开发团队
- **更新频率**：按需更新
