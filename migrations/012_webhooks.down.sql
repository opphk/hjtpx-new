-- Migration: Drop Webhooks Tables
-- Rollback migration to remove webhooks tables

DROP INDEX IF EXISTS idx_webhook_deliveries_status;
DROP INDEX IF EXISTS idx_webhook_deliveries_created_at;
DROP INDEX IF EXISTS idx_webhook_deliveries_webhook;
DROP TABLE IF EXISTS webhook_deliveries;

DROP INDEX IF EXISTS idx_webhooks_created_at;
DROP INDEX IF EXISTS idx_webhooks_is_active;
DROP INDEX IF EXISTS idx_webhooks_owner;
DROP TABLE IF EXISTS webhooks;
