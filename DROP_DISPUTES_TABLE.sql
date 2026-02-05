-- ============================================================================
-- SAFELY DROP DISPUTES TABLE
-- ============================================================================
-- This script safely removes the disputes table with all constraints
-- Run this ONLY if you want to completely remove the dispute system
-- ============================================================================

-- Step 1: Check if disputes table exists and show row count
SELECT 
  tablename,
  (SELECT COUNT(*) FROM disputes) as row_count
FROM pg_tables 
WHERE tablename = 'disputes' AND schemaname = 'public';

-- Step 2: Drop all indexes related to disputes
DROP INDEX IF EXISTS idx_disputes_status CASCADE;
DROP INDEX IF EXISTS idx_disputes_complainant CASCADE;
DROP INDEX IF EXISTS idx_disputes_respondent CASCADE;
DROP INDEX IF EXISTS idx_disputes_assigned_admin CASCADE;
DROP INDEX IF EXISTS idx_disputes_created_at CASCADE;
DROP INDEX IF EXISTS idx_disputes_severity CASCADE;
DROP INDEX IF EXISTS idx_disputes_job CASCADE;
DROP INDEX IF EXISTS idx_disputes_booking CASCADE;

-- Step 3: Drop the disputes table (this will also drop any foreign key constraints pointing to it)
DROP TABLE IF EXISTS disputes CASCADE;

-- Step 4: Verify table is dropped
SELECT 
  'Success: disputes table has been removed'
WHERE NOT EXISTS (
  SELECT 1 FROM pg_tables 
  WHERE tablename = 'disputes' AND schemaname = 'public'
);

-- Step 5: If you want to verify what was removed, check the message
-- If the table existed and had data, it's now completely removed
-- All indexes and constraints are also removed

-- ============================================================================
-- NOTES:
-- ============================================================================
-- 1. This is a PERMANENT operation - all dispute data will be lost
-- 2. The CASCADE option removes any dependent objects
-- 3. If you later want to recreate the disputes table, run DISPUTE_RESOLUTION_SYSTEM.sql
-- 4. No backups are created - ensure you have a backup if needed
-- ============================================================================
