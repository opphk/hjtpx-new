-- Migration: Drop Usage Records Table
-- Rollback migration to remove usage_records table

DROP INDEX IF EXISTS idx_usage_records_api_key_created;
DROP INDEX IF EXISTS idx_usage_records_created_at;
DROP INDEX IF EXISTS idx_usage_records_endpoint;
DROP INDEX IF EXISTS idx_usage_records_api_key;
DROP TABLE IF EXISTS usage_records;
