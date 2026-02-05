-- Migration: Add is_read column to messages table for unread tracking
-- Description: Adds an is_read boolean column (default false) used by the app to track unread messages
-- Created: 2025-12-01

BEGIN;

ALTER TABLE messages
ADD COLUMN IF NOT EXISTS is_read boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_messages_is_read ON messages(is_read);

COMMIT;
