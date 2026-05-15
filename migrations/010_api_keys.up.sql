-- Migration: Create API Keys Table
-- This migration creates the api_keys table for managing API authentication

CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    hashed_key VARCHAR(64) NOT NULL UNIQUE,
    permissions JSONB NOT NULL DEFAULT '["read"]',
    rate_limit INTEGER DEFAULT 100,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    plan VARCHAR(50) DEFAULT 'FREE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_api_keys_owner ON api_keys(owner);
CREATE INDEX idx_api_keys_hashed_key ON api_keys(hashed_key);
CREATE INDEX idx_api_keys_is_active ON api_keys(is_active);
CREATE INDEX idx_api_keys_created_at ON api_keys(created_at);

COMMENT ON TABLE api_keys IS 'Stores API keys for external access';
COMMENT ON COLUMN api_keys.hashed_key IS 'SHA-256 hash of the API key for security';
COMMENT ON COLUMN api_keys.permissions IS 'JSON array of permissions: read, write, admin';
