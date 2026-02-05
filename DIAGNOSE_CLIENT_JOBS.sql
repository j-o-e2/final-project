-- ============================================================================
-- DIAGNOSE_CLIENT_JOBS.sql
-- ============================================================================
-- Run this in Supabase SQL Editor to diagnose why clients can't see their jobs.
-- Replace 'YOUR_USER_ID_HERE' with your actual auth.users.id (find it in Supabase Auth tab)
--
-- Instructions:
-- 1. Go to Supabase > SQL Editor
-- 2. Copy-paste this entire script
-- 3. Replace 'YOUR_USER_ID_HERE' with your user ID
-- 4. Run it and check the output

-- First, list all jobs and their client_id values (sample of first 20)
SELECT '=== JOBS TABLE SAMPLE (first 20 rows) ===' AS section;
SELECT id, title, client_id, created_at 
FROM public.jobs 
ORDER BY created_at DESC 
LIMIT 20;

SELECT '' AS blank;

-- Count how many jobs have NULL client_id (orphaned)
SELECT '=== NULL client_id COUNT ===' AS section;
SELECT COUNT(*) as jobs_with_null_client_id FROM public.jobs WHERE client_id IS NULL;

SELECT '' AS blank;

-- Show RLS policies on jobs table
SELECT '=== RLS POLICIES ON jobs TABLE ===' AS section;
SELECT policyname, roles, qual, with_check 
FROM pg_policies 
WHERE tablename = 'jobs' 
ORDER BY policyname;

SELECT '' AS blank;

-- Test: check if RLS is enabled on jobs
SELECT '=== RLS ENABLED ===' AS section;
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'jobs';

SELECT '' AS blank;

-- Test query: manually select jobs for a specific user (replace YOUR_USER_ID_HERE)
-- This simulates what the client dashboard should see
SELECT '=== TEST QUERY: Jobs for user (replace YOUR_USER_ID_HERE with your auth.users.id) ===' AS section;
-- SELECT id, title, client_id FROM public.jobs WHERE client_id = 'YOUR_USER_ID_HERE';
-- ^ Uncomment and replace YOUR_USER_ID_HERE to test

SELECT '' AS blank;
SELECT 'Steps to fix:' AS help;
SELECT '1. Check if RLS policies exist (see POLICIES output above)' AS step1;
SELECT '2. If missing, run: FIX_TABLE_RELATIONSHIPS_CORRECTED.sql' AS step2;
SELECT '3. If jobs have NULL client_id, check the job-posting code' AS step3;
SELECT '4. Uncomment the test query above, replace YOUR_USER_ID_HERE, and run again' AS step4;
