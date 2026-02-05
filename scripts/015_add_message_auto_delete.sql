-- Migration: Add delete_at column to messages table for auto-deletion feature
-- Description: Adds a delete_at timestamp that tracks when each message should auto-delete (1 hour after creation)
-- Created: 2025-12-01

BEGIN;

-- Add delete_at column if it doesn't exist
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS delete_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW() + INTERVAL '1 hour';

-- Create index on delete_at for efficient cleanup queries
CREATE INDEX IF NOT EXISTS idx_messages_delete_at ON messages(delete_at);

COMMIT;
