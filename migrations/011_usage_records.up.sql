-- Migration: Create Usage Records Table
-- This migration creates the usage_records table for tracking API usage

CREATE TABLE IF NOT EXISTS usage_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    status_code INTEGER NOT NULL,
    response_time INTEGER NOT NULL,
    request_size BIGINT DEFAULT 0,
    response_size BIGINT DEFAULT 0,
    user_agent TEXT,
    ip_address INET,
    request_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_usage_records_api_key ON usage_records(api_key_id);
CREATE INDEX idx_usage_records_endpoint ON usage_records(endpoint);
CREATE INDEX idx_usage_records_created_at ON usage_records(created_at);
CREATE INDEX idx_usage_records_api_key_created ON usage_records(api_key_id, created_at);

COMMENT ON TABLE usage_records IS 'Stores API usage records for analytics and billing';
COMMENT ON COLUMN usage_records.response_time IS 'Response time in milliseconds';
