-- Rollback Migration: Collaboration and Presence Schema
-- Created: 2026-05-15
-- Description: Remove tables for real-time collaboration, presence tracking, comments, and notifications

DROP TABLE IF EXISTS user_mentions CASCADE;
DROP TABLE IF EXISTS notification_preferences CASCADE;
DROP TABLE IF EXISTS message_reads CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS thread_participants CASCADE;
DROP TABLE IF EXISTS message_threads CASCADE;
DROP TABLE IF EXISTS document_cursors CASCADE;
DROP TABLE IF EXISTS document_operations CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS room_members CASCADE;
DROP TABLE IF EXISTS collaboration_rooms CASCADE;
DROP TABLE IF EXISTS presence_tracking CASCADE;
