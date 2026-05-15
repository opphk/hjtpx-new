# 数据库设计文档

## 概述

本文档描述 HJTPX 项目的完整数据库设计，包括 ER 图、数据字典、索引设计和优化建议。

## 数据库信息

| 属性 | 值 |
|------|-----|
| 数据库类型 | PostgreSQL |
| 最低版本 | PostgreSQL 12+ |
| 字符编码 | UTF8 |
| 排序规则 | zh_CN.UTF-8 |
| 时区 | Asia/Shanghai |

---

## ER 图（实体关系图）

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                    用户管理模块                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌──────────────┐         ┌──────────────┐         ┌──────────────┐            │
│  │    roles     │         │ permissions  │         │    users     │            │
│  ├──────────────┤         ├──────────────┤         ├──────────────┤            │
│  │ id (PK)      │         │ id (PK)      │         │ id (PK)      │            │
│  │ name         │◄───────►│ name         │         │ email        │            │
│  │ description  │         │ description  │         │ username     │            │
│  │ created_at   │         │ created_at   │         │ name         │            │
│  │ updated_at   │         │ updated_at   │         │ password     │            │
│  └──────┬───────┘         └──────┬───────┘         │ role         │            │
│         │                       │                 │ is_active    │            │
│         │  N:M                  │                 │ deleted_at   │            │
│         ▼                       ▼                 │ created_at   │            │
│  ┌──────────────────────────────┐                 │ updated_at   │            │
│  │    role_permissions          │                 └──────┬───────┘            │
│  ├──────────────────────────────┤                        │                    │
│  │ role_id (FK)                 │                        │ 1:N                │
│  │ permission_id (FK)           │                        ▼                    │
│  │ created_at                   │              ┌──────────────────┐          │
│  └──────────────────────────────┘              │    sessions      │          │
│                                                ├──────────────────┤          │
│  ┌──────────────┐                              │ id (PK)          │          │
│  │ user_roles   │         ┌──────────────┐      │ user_id (FK)     │          │
│  ├──────────────┤         │   presence   │      │ token            │          │
│  │ user_id (FK) │◄────────┤              │      │ expires_at       │          │
│  │ role_id (FK) │         ├──────────────┤      │ device_info      │          │
│  │ created_at   │         │ id (PK)      │      │ ip_address       │          │
│  └──────────────┘         │ user_id (FK) │      │ user_agent       │          │
│                           │ socket_id    │      │ is_revoked       │          │
│                           │ status       │      │ last_activity    │          │
│                           │ last_seen_at │      │ is_current       │          │
│                           │ device_info  │      │ created_at       │          │
│                           │ metadata     │      └──────────────────┘          │
│                           └──────────────┘                                    │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                                    安全审计模块                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐ │
│  │ audit_logs   │    │    csrf_     │    │   security_  │    │   account_   │ │
│  │              │    │   tokens     │    │   events     │    │    locks     │ │
│  ├──────────────┤    ├──────────────┤    ├──────────────┤    ├──────────────┤ │
│  │ id (PK)      │    │ id (PK)      │    │ id (PK)      │    │ id (PK)      │ │
│  │ user_id (FK) │    │ user_id (FK) │    │ event_type   │    │ user_id (FK) │ │
│  │ action       │    │ session_id   │    │ user_id (FK) │    │ locked_at    │ │
│  │ resource_type│    │ token_hash   │    │ ip_address   │    │ lock_reason  │ │
│  │ resource_id  │    │ expires_at   │    │ severity     │    │ failed_attempts│ │
│  │ ip_address   │    │ created_at   │    │ resolved     │    │ locked_until │ │
│  │ created_at   │    └──────────────┘    │ created_at   │    │ unlocked_at  │ │
│  └──────────────┘                        └──────────────┘    └──────────────┘ │
│                                                                                 │
│  ┌──────────────┐    ┌──────────────┐                                          │
│  │ login_       │    │ login_       │                                          │
│  │ history      │    │ attempts     │                                          │
│  ├──────────────┤    ├──────────────┤                                          │
│  │ id (PK)      │    │ id (PK)      │                                          │
│  │ user_id (FK) │    │ email        │                                          │
│  │ action       │    │ ip_address   │                                          │
│  │ ip_address   │    │ attempted_at │                                          │
│  │ success      │    │ success      │                                          │
│  │ created_at   │    └──────────────┘                                          │
│  └──────────────┘                                                           │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                                    通知消息模块                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌──────────────┐                                                            │
│  │notifications │                                                            │
│  ├──────────────┤                                                            │
│  │ id (PK)      │                                                            │
│  │ user_id (FK) │◄────── users(id)                                           │
│  │ type         │                                                            │
│  │ title        │                                                            │
│  │ message      │                                                            │
│  │ data         │                                                            │
│  │ priority     │                                                            │
│  │ status       │                                                            │
│  │ is_read      │                                                            │
│  │ read_at      │                                                            │
│  │ expires_at   │                                                            │
│  │ action_url   │                                                            │
│  │ channels     │                                                            │
│  │ created_at   │                                                            │
│  └──────────────┘                                                            │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                                    分析统计模块                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │ user_events  │  │api_performance│ │feature_usage │  │ page_views  │        │
│  ├──────────────┤  ├──────────────┤  ├──────────────┤  ├──────────────┤        │
│  │ id (PK)      │  │ id (PK)      │  │ id (PK)      │  │ id (PK)      │        │
│  │ user_id (FK) │  │ endpoint     │  │ feature_name │  │ user_id (FK) │        │
│  │ event_type   │  │ method       │  │ action       │  │ page_path    │        │
│  │ event_data   │  │ duration_ms  │  │ user_id (FK) │  │ referrer     │        │
│  │ ip_address   │  │ status_code  │  │ usage_count  │  │ session_id   │        │
│  │ created_at   │  │ created_at   │  │ created_at   │  │ time_on_page │        │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘        │
│                                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                          │
│  │ analytics_   │  │  anomalies    │  │ user_        │                          │
│  │ daily_summary│  │              │  │ engagement   │                          │
│  ├──────────────┤  ├──────────────┤  ├──────────────┤                          │
│  │ id (PK)      │  │ id (PK)      │  │ id (PK)      │                          │
│  │ date         │  │ anomaly_type │  │ user_id (FK) │                          │
│  │ total_users  │  │ severity     │  │ session_id  │                          │
│  │ active_users │  │ description   │  │ page_views   │                          │
│  │ new_users    │  │ metric_value │  │ clicks       │                          │
│  │ total_events │  │ threshold    │  │ duration_sec │                          │
│  │ metadata     │  │ detected_at   │  │ engagement   │                          │
│  └──────────────┘  └──────────────┘  └──────────────┘                          │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                                    系统基础模块                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌──────────────┐         ┌──────────────┐         ┌──────────────┐            │
│  │ presence_    │         │ migrations   │         │   captchas   │            │
│  │ history      │         ├──────────────┤         ├──────────────┤            │
│  ├──────────────┤         │ id (PK)      │         │ id (PK)      │            │
│  │ id (PK)      │         │ version      │         │ type         │            │
│  │ user_id (FK) │         │ name         │         │ data         │            │
│  │ action       │         │ applied_at   │         │ expires_at   │            │
│  │ status       │         │ status       │         │ verified     │            │
│  │ duration_sec │         └──────────────┘         │ created_at   │            │
│  │ created_at   │                                    └──────────────┘            │
│  └──────────────┘                                                            │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 数据字典

### 1. users（用户表）

**描述**：存储用户账户信息和认证详情。

**主键**：`id`

**外键**：
- 无直接外键依赖

**索引**：
- `idx_users_email` (email)
- `idx_users_role` (role)
- `idx_users_created_at` (created_at DESC)
- `idx_users_is_active` (is_active)
- `idx_users_email_active` (email, is_active) WHERE is_active = true

| 字段名 | 数据类型 | 约束 | 默认值 | 描述 |
|--------|----------|------|--------|------|
| id | UUID | PRIMARY KEY | gen_random_uuid() | 用户唯一标识符 |
| email | VARCHAR(255) | UNIQUE, NOT NULL | - | 用户邮箱地址 |
| username | VARCHAR(255) | - | - | 用户名（可选） |
| name | VARCHAR(255) | NOT NULL | - | 用户显示名称 |
| password | VARCHAR(255) | NOT NULL | - | bcrypt 加密密码 |
| role | VARCHAR(50) | - | 'user' | 用户角色：admin/moderator/user/guest |
| is_active | BOOLEAN | - | true | 账户是否激活 |
| deleted_at | TIMESTAMP | - | - | 软删除时间戳 |
| reset_token | VARCHAR(255) | - | - | 密码重置令牌 |
| reset_token_expires | TIMESTAMP | - | - | 重置令牌过期时间 |
| created_at | TIMESTAMP | - | CURRENT_TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | - | CURRENT_TIMESTAMP | 更新时间 |

**触发器**：`update_users_updated_at` - 更新 `updated_at` 时间戳

**注释**：
- `role`：用户角色枚举值
  - `admin`：管理员，拥有完全访问权限
  - `moderator`：版主，拥有内容管理权限
  - `user`：普通用户，拥有基础访问权限
  - `guest`：访客，仅有只读权限
- `is_active`：软删除标志，禁用的用户无法登录
- `deleted_at`：软删除时间，为 NULL 表示未删除

---

### 2. sessions（会话表）

**描述**：管理用户认证会话和令牌。

**主键**：`id`

**外键**：
- `user_id` → `users(id)` ON DELETE CASCADE

**索引**：
- `idx_sessions_user_id` (user_id)
- `idx_sessions_token` (token)
- `idx_sessions_expires_at` (expires_at)
- `idx_sessions_is_revoked` (is_revoked)
- `idx_sessions_last_activity` (last_activity)
- `idx_sessions_is_current` (is_current)
- `idx_sessions_active` (user_id, expires_at) WHERE is_revoked = false AND expires_at > CURRENT_TIMESTAMP

| 字段名 | 数据类型 | 约束 | 默认值 | 描述 |
|--------|----------|------|--------|------|
| id | UUID | PRIMARY KEY | gen_random_uuid() | 会话唯一标识符 |
| user_id | UUID | REFERENCES users(id) ON DELETE CASCADE | - | 关联的用户 ID |
| token | VARCHAR(500) | NOT NULL | - | JWT 或会话令牌 |
| expires_at | TIMESTAMP | NOT NULL | - | 会话过期时间 |
| device_info | JSONB | - | - | 设备信息（操作系统、浏览器等） |
| ip_address | INET | - | - | 客户端 IP 地址 |
| user_agent | TEXT | - | - | User-Agent 字符串 |
| is_revoked | BOOLEAN | - | false | 是否已撤销 |
| last_activity | TIMESTAMP | - | CURRENT_TIMESTAMP | 最后活动时间 |
| is_current | BOOLEAN | - | false | 是否为当前会话 |
| created_at | TIMESTAMP | - | CURRENT_TIMESTAMP | 创建时间 |

**触发器**：`update_sessions_last_activity` - 更新 `last_activity` 时间戳

---

### 3. roles（角色表）

**描述**：存储系统角色定义。

**主键**：`id`

**索引**：
- `idx_roles_name` (name)

| 字段名 | 数据类型 | 约束 | 默认值 | 描述 |
|--------|----------|------|--------|------|
| id | UUID | PRIMARY KEY | gen_random_uuid() | 角色唯一标识符 |
| name | VARCHAR(50) | UNIQUE, NOT NULL | - | 角色名称 |
| description | TEXT | - | - | 角色描述 |
| created_at | TIMESTAMP | - | CURRENT_TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | - | CURRENT_TIMESTAMP | 更新时间 |

**触发器**：`update_roles_updated_at` - 更新 `updated_at` 时间戳

**默认值**：
- `admin`：管理员，拥有完全访问权限
- `moderator`：版主，拥有内容管理权限
- `user`：普通用户，拥有基础访问权限

---

### 4. permissions（权限表）

**描述**：存储系统权限定义。

**主键**：`id`

**索引**：
- `idx_permissions_name` (name)

| 字段名 | 数据类型 | 约束 | 默认值 | 描述 |
|--------|----------|------|--------|------|
| id | UUID | PRIMARY KEY | gen_random_uuid() | 权限唯一标识符 |
| name | VARCHAR(100) | UNIQUE, NOT NULL | - | 权限名称（格式：resource.action） |
| description | TEXT | - | - | 权限描述 |
| created_at | TIMESTAMP | - | CURRENT_TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | - | CURRENT_TIMESTAMP | 更新时间 |

**触发器**：`update_permissions_updated_at` - 更新 `updated_at` 时间戳

**默认值**：
- `users.read`：读取用户信息
- `users.write`：创建和更新用户
- `users.delete`：删除用户
- `posts.read`：读取帖子
- `posts.write`：创建和更新帖子
- `posts.delete`：删除帖子
- `settings.read`：读取系统设置
- `settings.write`：修改系统设置

---

### 5. role_permissions（角色权限关联表）

**描述**：角色与权限的多对多关联表。

**主键**：(role_id, permission_id)

**外键**：
- `role_id` → `roles(id)` ON DELETE CASCADE
- `permission_id` → `permissions(id)` ON DELETE CASCADE

**索引**：
- `idx_role_permissions_role_id` (role_id)
- `idx_role_permissions_permission_id` (permission_id)

| 字段名 | 数据类型 | 约束 | 默认值 | 描述 |
|--------|----------|------|--------|------|
| role_id | UUID | REFERENCES roles(id) ON DELETE CASCADE | - | 角色 ID |
| permission_id | UUID | REFERENCES permissions(id) ON DELETE CASCADE | - | 权限 ID |
| created_at | TIMESTAMP | - | CURRENT_TIMESTAMP | 创建时间 |

---

### 6. user_roles（用户角色关联表）

**描述**：用户与角色的多对多关联表。

**主键**：(user_id, role_id)

**外键**：
- `user_id` → `users(id)` ON DELETE CASCADE
- `role_id` → `roles(id)` ON DELETE CASCADE

**索引**：
- `idx_user_roles_user_id` (user_id)
- `idx_user_roles_role_id` (role_id)

| 字段名 | 数据类型 | 约束 | 默认值 | 描述 |
|--------|----------|------|--------|------|
| user_id | UUID | REFERENCES users(id) ON DELETE CASCADE | - | 用户 ID |
| role_id | UUID | REFERENCES roles(id) ON DELETE CASCADE | - | 角色 ID |
| created_at | TIMESTAMP | - | CURRENT_TIMESTAMP | 创建时间 |

---

### 7. notifications（通知表）

**描述**：存储用户通知和提醒。

**主键**：`id`

**外键**：
- `user_id` → `users(id)` ON DELETE CASCADE

**索引**：
- `idx_notifications_user_id` (user_id)
- `idx_notifications_user_status` (user_id, status)
- `idx_notifications_user_created` (user_id, created_at DESC)
- `idx_notifications_type` (type)
- `idx_notifications_expires_at` (expires_at)
- `idx_notifications_status` (status)
- `idx_notifications_is_read` (is_read)
- `idx_notifications_ttl` (expires_at) WHERE expires_at IS NOT NULL

| 字段名 | 数据类型 | 约束 | 默认值 | 描述 |
|--------|----------|------|--------|------|
| id | UUID | PRIMARY KEY | gen_random_uuid() | 通知唯一标识符 |
| user_id | UUID | REFERENCES users(id) ON DELETE CASCADE | - | 关联的用户 ID |
| type | VARCHAR(50) | NOT NULL | 'info' | 通知类型 |
| title | VARCHAR(200) | NOT NULL | - | 通知标题 |
| message | TEXT | NOT NULL | - | 通知内容 |
| data | JSONB | - | '{}' | 额外数据 |
| priority | VARCHAR(20) | - | 'normal' | 优先级 |
| status | VARCHAR(20) | - | 'unread' | 状态 |
| is_read | BOOLEAN | - | false | 是否已读 |
| read_at | TIMESTAMP | - | - | 阅读时间 |
| expires_at | TIMESTAMP | - | - | 过期时间 |
| action_url | VARCHAR(500) | - | - | 操作链接 |
| action_label | VARCHAR(50) | - | - | 操作标签 |
| channels | VARCHAR(50)[] | - | ARRAY['in_app'] | 通知渠道 |
| metadata | JSONB | - | '{}' | 元数据 |
| created_at | TIMESTAMP | - | CURRENT_TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | - | CURRENT_TIMESTAMP | 更新时间 |

**触发器**：`update_notifications_updated_at` - 更新 `updated_at` 时间戳

**枚举值**：
- `type`：info, success, warning, error, system, message, reminder, alert
- `priority`：low, normal, high, urgent
- `status`：unread, read, archived
- `channels`：in_app, email, sms, push

---

### 8. login_history（登录历史表）

**描述**：记录用户登录活动历史。

**主键**：`id`

**外键**：
- `user_id` → `users(id)` ON DELETE CASCADE

**索引**：
- `idx_login_history_user_id` (user_id)
- `idx_login_history_created_at` (created_at DESC)
- `idx_login_history_action` (action)
- `idx_login_history_success` (success)
- `idx_login_history_ip` (ip_address)

| 字段名 | 数据类型 | 约束 | 默认值 | 描述 |
|--------|----------|------|--------|------|
| id | UUID | PRIMARY KEY | gen_random_uuid() | 记录唯一标识符 |
| user_id | UUID | REFERENCES users(id) ON DELETE CASCADE | - | 关联的用户 ID |
| action | VARCHAR(50) | NOT NULL | - | 操作类型：login/logout/password_reset |
| ip_address | INET | - | - | 客户端 IP 地址 |
| user_agent | TEXT | - | - | User-Agent 字符串 |
| device_info | JSONB | - | - | 设备信息 |
| success | BOOLEAN | - | true | 是否成功 |
| created_at | TIMESTAMP | - | CURRENT_TIMESTAMP | 创建时间 |

---

### 9. login_attempts（登录尝试表）

**描述**：记录登录尝试，用于账户锁定和暴力破解防护。

**主键**：`id`

**索引**：
- `idx_login_attempts_email` (email)
- `idx_login_attempts_ip` (ip_address)
- `idx_login_attempts_time` (attempted_at DESC)
- `idx_login_attempts_success` (success)

| 字段名 | 数据类型 | 约束 | 默认值 | 描述 |
|--------|----------|------|--------|------|
| id | UUID | PRIMARY KEY | gen_random_uuid() | 记录唯一标识符 |
| email | VARCHAR(255) | NOT NULL | - | 尝试登录的邮箱 |
| ip_address | INET | - | - | 客户端 IP 地址 |
| attempted_at | TIMESTAMP | - | CURRENT_TIMESTAMP | 尝试时间 |
| success | BOOLEAN | - | false | 是否成功 |

---

### 10. presence（在线状态表）

**描述**：跟踪用户实时在线状态。

**主键**：`id`

**外键**：
- `user_id` → `users(id)` ON DELETE CASCADE

**索引**：
- `idx_presence_user_id` (user_id)
- `idx_presence_socket_id` (socket_id)
- `idx_presence_status` (status)
- `idx_presence_last_seen` (last_seen_at DESC)
- `idx_presence_online` (status) WHERE status = 'online'

**约束**：
- UNIQUE(user_id, socket_id)

| 字段名 | 数据类型 | 约束 | 默认值 | 描述 |
|--------|----------|------|--------|------|
| id | UUID | PRIMARY KEY | gen_random_uuid() | 记录唯一标识符 |
| user_id | UUID | REFERENCES users(id) ON DELETE CASCADE | - | 用户 ID |
| socket_id | VARCHAR(255) | - | - | WebSocket 连接 ID |
| status | VARCHAR(20) | DEFAULT 'online' | 'online' | 在线状态 |
| last_seen_at | TIMESTAMP | - | CURRENT_TIMESTAMP | 最后可见时间 |
| ip_address | INET | - | - | 客户端 IP 地址 |
| user_agent | TEXT | - | - | User-Agent 字符串 |
| device_info | JSONB | - | - | 设备信息 |
| current_page | VARCHAR(500) | - | - | 当前页面 URL |
| metadata | JSONB | - | '{}' | 元数据 |
| created_at | TIMESTAMP | - | CURRENT_TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | - | CURRENT_TIMESTAMP | 更新时间 |

**状态枚举**：online, away, busy, offline

**触发器**：
- `update_presence_updated_at` - 更新 `updated_at` 时间戳
- `presence_change_trigger` - 记录状态变更到 `presence_history`

---

### 11. presence_history（在线状态历史表）

**描述**：记录用户在线状态变更历史。

**主键**：`id`

**外键**：
- `user_id` → `users(id)` ON DELETE CASCADE

**索引**：
- `idx_presence_history_user_id` (user_id)
- `idx_presence_history_action` (action)
- `idx_presence_history_created_at` (created_at DESC)

| 字段名 | 数据类型 | 约束 | 默认值 | 描述 |
|--------|----------|------|--------|------|
| id | UUID | PRIMARY KEY | gen_random_uuid() | 记录唯一标识符 |
| user_id | UUID | REFERENCES users(id) ON DELETE CASCADE | - | 用户 ID |
| action | VARCHAR(50) | NOT NULL | - | 操作类型：login/logout/status_change |
| status | VARCHAR(20) | NOT NULL | - | 变更后的状态 |
| duration_seconds | INTEGER | - | - | 在线持续时间（秒） |
| ip_address | INET | - | - | 客户端 IP 地址 |
| created_at | TIMESTAMP | - | CURRENT_TIMESTAMP | 创建时间 |

---

### 12. user_events（用户事件表）

**描述**：跟踪用户活动事件。

**主键**：`id`

**外键**：
- `user_id` → `users(id)` ON DELETE SET NULL

**索引**：
- `idx_user_events_user_id` (user_id)
- `idx_user_events_event_type` (event_type)
- `idx_user_events_created_at` (created_at DESC)
- `idx_user_events_user_type` (user_id, event_type)
- `idx_user_events_date` (DATE(created_at))

| 字段名 | 数据类型 | 约束 | 默认值 | 描述 |
|--------|----------|------|--------|------|
| id | UUID | PRIMARY KEY | gen_random_uuid() | 事件唯一标识符 |
| user_id | UUID | REFERENCES users(id) ON DELETE SET NULL | - | 用户 ID（可为空） |
| event_type | VARCHAR(100) | NOT NULL | - | 事件类型 |
| event_data | JSONB | - | '{}' | 事件数据 |
| ip_address | INET | - | - | 客户端 IP 地址 |
| user_agent | TEXT | - | - | User-Agent 字符串 |
| created_at | TIMESTAMP | - | CURRENT_TIMESTAMP | 创建时间 |

---

### 13. api_performance（API 性能表）

**描述**：记录 API 响应时间和性能指标。

**主键**：`id`

**外键**：
- `user_id` → `users(id)` ON DELETE SET NULL

**索引**：
- `idx_api_perf_endpoint` (endpoint)
- `idx_api_perf_method` (method)
- `idx_api_perf_created_at` (created_at DESC)
- `idx_api_perf_status` (status_code)
- `idx_api_perf_duration` (duration_ms)
- `idx_api_perf_endpoint_method` (endpoint, method)
- `idx_api_perf_user` (user_id)

| 字段名 | 数据类型 | 约束 | 默认值 | 描述 |
|--------|----------|------|--------|------|
| id | UUID | PRIMARY KEY | gen_random_uuid() | 记录唯一标识符 |
| endpoint | VARCHAR(500) | NOT NULL | - | API 端点路径 |
| method | VARCHAR(10) | NOT NULL | - | HTTP 方法 |
| duration_ms | INTEGER | NOT NULL | - | 响应时间（毫秒） |
| status_code | INTEGER | - | - | HTTP 状态码 |
| user_id | UUID | REFERENCES users(id) ON DELETE SET NULL | - | 用户 ID（可为空） |
| ip_address | INET | - | - | 客户端 IP 地址 |
| request_size | INTEGER | - | - | 请求大小（字节） |
| response_size | INTEGER | - | - | 响应大小（字节） |
| created_at | TIMESTAMP | - | CURRENT_TIMESTAMP | 创建时间 |

---

### 14. analytics_daily_summary（每日分析汇总表）

**描述**：存储每日系统统计数据汇总。

**主键**：`id`

**索引**：
- `idx_analytics_daily_date` (date DESC)
- `idx_analytics_daily_users` (active_users DESC)

**约束**：
- UNIQUE(date)

| 字段名 | 数据类型 | 约束 | 默认值 | 描述 |
|--------|----------|------|--------|------|
| id | UUID | PRIMARY KEY | gen_random_uuid() | 记录唯一标识符 |
| date | DATE | NOT NULL, UNIQUE | - | 统计日期 |
| total_users | INTEGER | - | 0 | 总用户数 |
| active_users | INTEGER | - | 0 | 活跃用户数 |
| new_users | INTEGER | - | 0 | 新增用户数 |
| total_events | INTEGER | - | 0 | 总事件数 |
| total_api_calls | INTEGER | - | 0 | API 调用总数 |
| avg_response_time_ms | INTEGER | - | 0 | 平均响应时间（毫秒） |
| error_count | INTEGER | - | 0 | 错误数量 |
| cache_hit_rate | DECIMAL(5,2) | - | 0 | 缓存命中率（百分比） |
| peak_concurrent_users | INTEGER | - | 0 | 峰值并发用户数 |
| metadata | JSONB | - | '{}' | 元数据 |
| created_at | TIMESTAMP | - | CURRENT_TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | - | CURRENT_TIMESTAMP | 更新时间 |

**触发器**：`update_analytics_summary_updated_at` - 更新 `updated_at` 时间戳

---

### 15. feature_usage（功能使用表）

**描述**：跟踪功能模块使用情况。

**主键**：`id`

**外键**：
- `user_id` → `users(id)` ON DELETE SET NULL

**索引**：
- `idx_feature_usage_name` (feature_name)
- `idx_feature_usage_action` (action)
- `idx_feature_usage_user` (user_id)
- `idx_feature_usage_created` (created_at DESC)
- `idx_feature_usage_daily` (feature_name, action, created_at::DATE)

**约束**：
- UNIQUE(feature_name, action, user_id, created_at::DATE)

| 字段名 | 数据类型 | 约束 | 默认值 | 描述 |
|--------|----------|------|--------|------|
| id | UUID | PRIMARY KEY | gen_random_uuid() | 记录唯一标识符 |
| feature_name | VARCHAR(100) | NOT NULL | - | 功能名称 |
| action | VARCHAR(50) | NOT NULL | - | 操作类型 |
| user_id | UUID | REFERENCES users(id) ON DELETE SET NULL | - | 用户 ID（可为空） |
| usage_count | INTEGER | - | 1 | 使用次数 |
| metadata | JSONB | - | '{}' | 元数据 |
| created_at | TIMESTAMP | - | CURRENT_TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | - | CURRENT_TIMESTAMP | 更新时间 |

**触发器**：`update_feature_usage_updated_at` - 更新 `updated_at` 时间戳

---

### 16. page_views（页面浏览表）

**描述**：记录用户页面浏览行为。

**主键**：`id`

**外键**：
- `user_id` → `users(id)` ON DELETE SET NULL

**索引**：
- `idx_page_views_user` (user_id)
- `idx_page_views_page` (page_path)
- `idx_page_views_created` (created_at DESC)
- `idx_page_views_session` (session_id)
- `idx_page_views_device` (device_type)

| 字段名 | 数据类型 | 约束 | 默认值 | 描述 |
|--------|----------|------|--------|------|
| id | UUID | PRIMARY KEY | gen_random_uuid() | 记录唯一标识符 |
| user_id | UUID | REFERENCES users(id) ON DELETE SET NULL | - | 用户 ID（可为空） |
| page_path | VARCHAR(500) | NOT NULL | - | 页面路径 |
| referrer | TEXT | - | - | 来源页面 |
| session_id | VARCHAR(100) | - | - | 会话 ID |
| time_on_page | INTEGER | - | - | 页面停留时间（秒） |
| scroll_depth | INTEGER | - | - | 滚动深度（百分比） |
| device_type | VARCHAR(20) | - | - | 设备类型 |
| browser | VARCHAR(50) | - | - | 浏览器类型 |
| os | VARCHAR(50) | - | - | 操作系统 |
| metadata | JSONB | - | '{}' | 元数据 |
| created_at | TIMESTAMP | - | CURRENT_TIMESTAMP | 创建时间 |

---

### 17. anomalies（异常记录表）

**描述**：存储检测到的系统异常。

**主键**：`id`

**外键**：
- `resolved_by` → `users(id)` ON DELETE SET NULL

**索引**：
- `idx_anomalies_type` (anomaly_type)
- `idx_anomalies_severity` (severity)
- `idx_anomalies_detected` (detected_at DESC)
- `idx_anomalies_resolved` (resolved_at) WHERE resolved_at IS NULL

| 字段名 | 数据类型 | 约束 | 默认值 | 描述 |
|--------|----------|------|--------|------|
| id | UUID | PRIMARY KEY | gen_random_uuid() | 记录唯一标识符 |
| anomaly_type | VARCHAR(50) | NOT NULL | - | 异常类型 |
| severity | VARCHAR(20) | NOT NULL | - | 严重程度 |
| description | TEXT | - | - | 异常描述 |
| affected_endpoint | VARCHAR(500) | - | - | 受影响的端点 |
| affected_users | UUID[] | - | - | 受影响用户列表 |
| metric_value | DECIMAL | - | - | 指标值 |
| threshold_value | DECIMAL | - | - | 阈值 |
| metadata | JSONB | - | '{}' | 元数据 |
| detected_at | TIMESTAMP | - | CURRENT_TIMESTAMP | 检测时间 |
| resolved_at | TIMESTAMP | - | - | 解决时间 |
| resolved_by | UUID | REFERENCES users(id) ON DELETE SET NULL | - | 解决人 |

**严重程度枚举**：low, medium, high, critical

---

### 18. user_engagement（用户参与度表）

**描述**：跟踪用户参与度指标。

**主键**：`id`

**外键**：
- `user_id` → `users(id)` ON DELETE CASCADE

**索引**：
- `idx_user_engagement_user` (user_id)
- `idx_user_engagement_session` (session_id)
- `idx_user_engagement_created` (created_at DESC)
- `idx_user_engagement_score` (engagement_score DESC)

| 字段名 | 数据类型 | 约束 | 默认值 | 描述 |
|--------|----------|------|--------|------|
| id | UUID | PRIMARY KEY | gen_random_uuid() | 记录唯一标识符 |
| user_id | UUID | REFERENCES users(id) ON DELETE CASCADE | - | 用户 ID |
| session_id | VARCHAR(100) | NOT NULL | - | 会话 ID |
| session_start | TIMESTAMP | NOT NULL | - | 会话开始时间 |
| session_end | TIMESTAMP | - | - | 会话结束时间 |
| page_views | INTEGER | - | 0 | 页面浏览数 |
| clicks | INTEGER | - | 0 | 点击次数 |
| features_used | INTEGER | - | 0 | 使用功能数 |
| duration_seconds | INTEGER | - | - | 会话持续时间（秒） |
| device_type | VARCHAR(20) | - | - | 设备类型 |
| engagement_score | DECIMAL(5,2) | - | 0 | 参与度评分 |
| metadata | JSONB | - | '{}' | 元数据 |
| created_at | TIMESTAMP | - | CURRENT_TIMESTAMP | 创建时间 |

---

### 19. csrf_tokens（CSRF 令牌表）

**描述**：存储 CSRF 防护令牌。

**主键**：`id`

**外键**：
- `user_id` → `users(id)` ON DELETE CASCADE

**索引**：
- `idx_csrf_tokens_user_id` (user_id)
- `idx_csrf_tokens_expires` (expires_at)
- `idx_csrf_tokens_session` (session_id)

**约束**：
- UNIQUE(user_id, session_id)

| 字段名 | 数据类型 | 约束 | 默认值 | 描述 |
|--------|----------|------|--------|------|
| id | UUID | PRIMARY KEY | gen_random_uuid() | 令牌唯一标识符 |
| user_id | UUID | REFERENCES users(id) ON DELETE CASCADE | - | 用户 ID |
| session_id | VARCHAR(255) | NOT NULL | - | 会话 ID |
| token_hash | VARCHAR(255) | NOT NULL | - | 令牌哈希值 |
| expires_at | TIMESTAMP | NOT NULL | - | 过期时间 |
| created_at | TIMESTAMP | - | CURRENT_TIMESTAMP | 创建时间 |

---

### 20. audit_logs（审计日志表）

**描述**：记录系统操作审计日志。

**主键**：`id`

**外键**：
- `user_id` → `users(id)` ON DELETE SET NULL

**索引**：
- `idx_audit_logs_user_id` (user_id)
- `idx_audit_logs_action` (action)
- `idx_audit_logs_created_at` (created_at DESC)
- `idx_audit_logs_resource` (resource_type, resource_id)

| 字段名 | 数据类型 | 约束 | 默认值 | 描述 |
|--------|----------|------|--------|------|
| id | UUID | PRIMARY KEY | gen_random_uuid() | 日志唯一标识符 |
| user_id | UUID | REFERENCES users(id) ON DELETE SET NULL | - | 用户 ID（可为空） |
| action | VARCHAR(100) | NOT NULL | - | 操作类型 |
| resource_type | VARCHAR(50) | - | - | 资源类型 |
| resource_id | VARCHAR(100) | - | - | 资源 ID |
| ip_address | VARCHAR(45) | - | - | 客户端 IP 地址 |
| user_agent | TEXT | - | - | User-Agent 字符串 |
| request_data | JSONB | - | - | 请求数据 |
| response_status | INTEGER | - | - | 响应状态码 |
| created_at | TIMESTAMP | - | CURRENT_TIMESTAMP | 创建时间 |

---

### 21. security_events（安全事件表）

**描述**：记录安全相关事件。

**主键**：`id`

**外键**：
- `user_id` → `users(id)` ON DELETE SET NULL

**索引**：
- `idx_security_events_type` (event_type)
- `idx_security_events_user` (user_id)
- `idx_security_events_severity` (severity)
- `idx_security_events_created` (created_at DESC)
- `idx_security_events_resolved` (resolved)

| 字段名 | 数据类型 | 约束 | 默认值 | 描述 |
|--------|----------|------|--------|------|
| id | UUID | PRIMARY KEY | gen_random_uuid() | 事件唯一标识符 |
| event_type | VARCHAR(50) | NOT NULL | - | 事件类型 |
| user_id | UUID | REFERENCES users(id) ON DELETE SET NULL | - | 用户 ID（可为空） |
| ip_address | VARCHAR(45) | - | - | 客户端 IP 地址 |
| user_agent | TEXT | - | - | User-Agent 字符串 |
| details | JSONB | - | - | 事件详情 |
| severity | VARCHAR(20) | - | 'low' | 严重程度 |
| resolved | BOOLEAN | - | false | 是否已解决 |
| created_at | TIMESTAMP | - | CURRENT_TIMESTAMP | 创建时间 |

---

### 22. account_locks（账户锁定表）

**描述**：管理账户锁定状态。

**主键**：`id`

**外键**：
- `user_id` → `users(id)` ON DELETE CASCADE
- `unlocked_by` → `users(id)` ON DELETE SET NULL

**索引**：
- `idx_account_locks_user_id` (user_id)
- `idx_account_locks_locked_until` (locked_until)
- `idx_account_locks_active` (user_id) WHERE locked_until > CURRENT_TIMESTAMP OR unlocked_at IS NULL

| 字段名 | 数据类型 | 约束 | 默认值 | 描述 |
|--------|----------|------|--------|------|
| id | UUID | PRIMARY KEY | gen_random_uuid() | 记录唯一标识符 |
| user_id | UUID | NOT NULL, REFERENCES users(id) ON DELETE CASCADE | - | 用户 ID |
| locked_at | TIMESTAMP | - | CURRENT_TIMESTAMP | 锁定时间 |
| lock_reason | VARCHAR(255) | - | - | 锁定原因 |
| failed_attempts | INTEGER | - | 0 | 失败尝试次数 |
| locked_until | TIMESTAMP | - | - | 锁定截止时间 |
| unlocked_at | TIMESTAMP | - | - | 解锁时间 |
| unlocked_by | UUID | REFERENCES users(id) ON DELETE SET NULL | - | 解锁人 |

---

### 23. migrations（迁移追踪表）

**描述**：追踪数据库迁移状态。

**主键**：`id`

**索引**：
- `idx_migrations_version` (version)

**约束**：
- UNIQUE(version)

| 字段名 | 数据类型 | 约束 | 默认值 | 描述 |
|--------|----------|------|--------|------|
| id | SERIAL | PRIMARY KEY | - | 自动递增 ID |
| version | INTEGER | NOT NULL, UNIQUE | - | 迁移版本号 |
| name | VARCHAR(255) | NOT NULL | - | 迁移文件名 |
| type | VARCHAR(20) | NOT NULL | 'up' | 迁移类型：up/down |
| applied_at | TIMESTAMP | - | CURRENT_TIMESTAMP | 应用时间 |
| execution_time_ms | INTEGER | - | - | 执行时间（毫秒） |
| status | VARCHAR(20) | - | 'success' | 状态：success/failed |
| checksum | VARCHAR(64) | - | - | 迁移文件校验和 |
| error_message | TEXT | - | - | 错误信息 |

---

## 表关系总结

### 核心模块关系

| 关系 | 类型 | 说明 |
|------|------|------|
| users → sessions | 1:N | 一个用户可以有多个会话 |
| users → roles → permissions | N:M | 通过 user_roles 和 role_permissions 实现 |
| users → notifications | 1:N | 一个用户可以收到多条通知 |
| users → login_history | 1:N | 一个用户可以有多条登录记录 |
| users → presence | 1:N | 一个用户可以有多条在线状态记录 |
| users → presence_history | 1:N | 一个用户可以有多条状态变更记录 |
| users → user_events | 1:N | 一个用户可以触发多个事件 |
| users → page_views | 1:N | 一个用户可以浏览多个页面 |
| users → audit_logs | 1:N | 一个用户可以产生多条审计日志 |
| users → account_locks | 1:N | 一个用户可以有多个锁定记录 |

---

## 版本历史

| 日期 | 版本 | 变更内容 |
|------|------|----------|
| 2026-05-14 | 1.0 | 初始数据库架构设计 |
| 2026-05-15 | 1.1 | 完善用户管理、权限、通知、登录历史等表 |
| 2026-05-15 | 1.2 | 添加在线状态、事件追踪、分析汇总等功能 |
| 2026-05-15 | 1.3 | 添加安全相关表（审计日志、安全事件、CSRF 等） |

---

## 维护说明

- **文档版本**：1.3
- **最后更新**：2026-05-15
- **维护者**：HJTPX 开发团队
- **更新频率**：随数据库迁移更新
