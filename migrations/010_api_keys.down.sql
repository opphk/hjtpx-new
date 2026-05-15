-- Migration: Drop API Keys Table
-- Rollback migration to remove api_keys table

DROP INDEX IF EXISTS idx_api_keys_created_at;
DROP INDEX IF EXISTS idx_api_keys_is_active;
DROP INDEX IF EXISTS idx_api_keys_hashed_key;
DROP INDEX IF EXISTS idx_api_keys_owner;
DROP TABLE IF EXISTS api_keys;
