-- Performance Optimization Indexes
-- Run this migration to add performance-critical indexes

-- User table indexes for common queries
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_email_role ON users(email, role);

-- Composite index for listing users with pagination
CREATE INDEX IF NOT EXISTS idx_users_list ON users(created_at DESC, id);

-- Notifications table indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Sessions table indexes (if using database sessions)
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- Index for slow query analysis (query statistics)
CREATE INDEX IF NOT EXISTS idx_query_stats_execution_time ON query_stats(execution_time DESC);

-- Partial indexes for commonly accessed data
CREATE INDEX IF NOT EXISTS idx_users_active ON users(id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(id) WHERE is_read = FALSE;

-- Composite index for complex queries
CREATE INDEX IF NOT EXISTS idx_users_search ON users(name, email, role);

-- Index for date range queries
CREATE INDEX IF NOT EXISTS idx_users_created_range ON users(created_at) 
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days';

-- Analyze tables to update statistics
ANALYZE users;
ANALYZE notifications;
ANALYZE sessions;
