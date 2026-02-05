-- ============================================================================
-- DROP OLD DISPUTE TABLES - Cleanup Script
-- ============================================================================
-- Use this to remove the old multi-table dispute system if it was created
-- Keep only the single 'disputes' table
-- ============================================================================

-- Drop tables in correct order (respecting foreign key constraints)

-- 1. Drop views first (they depend on tables)
DROP VIEW IF EXISTS dispute_stats_by_category CASCADE;
DROP VIEW IF EXISTS high_risk_users CASCADE;
DROP VIEW IF EXISTS dispute_resolution_summary CASCADE;
DROP VIEW IF EXISTS active_disputes CASCADE;

-- 2. Drop triggers and functions
DROP TRIGGER IF EXISTS update_reputation_on_resolution ON disputes CASCADE;
DROP TRIGGER IF EXISTS dispute_update_timestamp ON disputes CASCADE;
DROP FUNCTION IF EXISTS update_user_reputation_on_resolution() CASCADE;
DROP FUNCTION IF EXISTS update_dispute_timestamp() CASCADE;

-- 3. Drop tables (in reverse order of dependencies)
DROP TABLE IF EXISTS dispute_appeals CASCADE;
DROP TABLE IF EXISTS dispute_user_reputation CASCADE;
DROP TABLE IF EXISTS dispute_escalation_history CASCADE;
DROP TABLE IF EXISTS dispute_metrics CASCADE;
DROP TABLE IF EXISTS dispute_resolutions CASCADE;
DROP TABLE IF EXISTS dispute_communications CASCADE;
DROP TABLE IF EXISTS dispute_evidence CASCADE;

-- Note: Keep the 'disputes' table - this is the main table we're using
-- If you want to drop disputes table as well (WARNING - deletes all data):
-- DROP TABLE IF EXISTS disputes CASCADE;

-- ============================================================================
-- VERIFICATION - Check remaining tables
-- ============================================================================

-- Run this query to verify only 'disputes' table remains:
/*
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'dispute%'
ORDER BY table_name;

-- Expected output:
-- disputes
*/
