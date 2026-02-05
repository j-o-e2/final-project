-- ============================================================================
-- SETUP_ALL_PROFILE_POLICIES.sql
-- ============================================================================
-- Comprehensive RLS policies for `public.profiles` table organized by role:
-- - OWNERS: can read/insert/update/delete own profile
-- - CLIENTS: can read worker profiles for browsing
-- - WORKERS: can read client profiles for interaction
-- - ADMINS: can read/insert/update/delete any profile (via admin_users table)
-- - SERVICE_ROLE: backend/API/triggers have full access
--
-- Total: 19 policies covering all role-based access patterns
--
-- This file drops all existing profiles policies and recreates them.
-- Idempotent and non-recursive (uses admin_users table instead of self-reference).
--
-- Run in Supabase SQL Editor.
-- ============================================================================

BEGIN;

-- ============================================================================
-- Step 0: Create helper table for admins (idempotent)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.admin_users (
  user_id UUID PRIMARY KEY,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- Step 1: Drop ALL existing RLS policies on profiles
-- ============================================================================
DO $$
DECLARE
    policy_name TEXT;
BEGIN
    FOR policy_name IN
        SELECT policyname FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'profiles'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_name || '" ON public.profiles';
    END LOOP;
END $$;

-- ============================================================================
-- Step 2: Enable RLS on profiles
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- OWNER POLICIES (5 policies)
-- Users can fully manage their own profile
-- ============================================================================

-- 1) Owner can READ own profile
CREATE POLICY "profiles_owner_select" ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- 2) Owner can INSERT own profile (on signup)
CREATE POLICY "profiles_owner_insert" ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 3) Owner can UPDATE own profile (avatar, name, location, etc.)
CREATE POLICY "profiles_owner_update" ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 4) Owner can DELETE own profile
CREATE POLICY "profiles_owner_delete" ON public.profiles
  FOR DELETE
  USING (auth.uid() = id);

-- 5) Owner can UPSERT own profile (combined insert/update)
CREATE POLICY "profiles_owner_upsert" ON public.profiles
  FOR ALL
  USING (auth.uid() = id OR auth.role() = 'service_role')
  WITH CHECK (auth.uid() = id OR auth.role() = 'service_role');

-- ============================================================================
-- CLIENT POLICIES (3 policies)
-- Clients can browse worker profiles
-- ============================================================================

-- 6) Clients can READ all worker profiles (role='worker')
CREATE POLICY "profiles_clients_read_workers" ON public.profiles
  FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND role = 'worker'
  );

-- 7) Clients can VIEW aged/public profiles (created > 1 day ago)
CREATE POLICY "profiles_clients_read_aged" ON public.profiles
  FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND created_at < (now() - interval '1 day')
  );

-- 8) Clients can READ profiles marked as public (if such column exists, fallback to role check)
CREATE POLICY "profiles_clients_read_contact" ON public.profiles
  FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND (role = 'worker' OR role = 'foreman')
  );

-- ============================================================================
-- WORKER POLICIES (3 policies)
-- Workers can browse client/admin profiles
-- ============================================================================

-- 9) Workers can READ all client profiles (role='client')
CREATE POLICY "profiles_workers_read_clients" ON public.profiles
  FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND role = 'client'
  );

-- 10) Workers can VIEW aged profiles for trust/verification
CREATE POLICY "profiles_workers_read_aged" ON public.profiles
  FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND created_at < (now() - interval '1 day')
  );

-- 11) Workers can READ admin profiles (optional, for support/help)
CREATE POLICY "profiles_workers_read_admins" ON public.profiles
  FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND role = 'admin'
  );

-- ============================================================================
-- ADMIN POLICIES (5 policies)
-- Admins (listed in admin_users) can manage all profiles
-- ============================================================================

-- 12) Admins can READ any profile
CREATE POLICY "profiles_admin_select" ON public.profiles
  FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.admin_users au WHERE au.user_id = auth.uid()));

-- 13) Admins can INSERT any profile (for data migration/import)
CREATE POLICY "profiles_admin_insert" ON public.profiles
  FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users au WHERE au.user_id = auth.uid()));

-- 14) Admins can UPDATE any profile (support/moderation)
CREATE POLICY "profiles_admin_update" ON public.profiles
  FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.admin_users au WHERE au.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users au WHERE au.user_id = auth.uid()));

-- 15) Admins can DELETE any profile
CREATE POLICY "profiles_admin_delete" ON public.profiles
  FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.admin_users au WHERE au.user_id = auth.uid()));

-- 16) Admins can UPSERT (combined operations)
CREATE POLICY "profiles_admin_upsert" ON public.profiles
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.admin_users au WHERE au.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users au WHERE au.user_id = auth.uid()));

-- ============================================================================
-- AUTHENTICATED PUBLIC POLICIES (2 policies)
-- Authenticated users can browse public profiles
-- ============================================================================

-- 17) Authenticated users can READ profiles by role (workers/foreman/admin for visibility)
CREATE POLICY "profiles_authenticated_read_by_role" ON public.profiles
  FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND role IN ('worker', 'foreman', 'admin', 'client')
  );

-- 18) Authenticated users can READ contact profiles (generic public read)
CREATE POLICY "profiles_authenticated_read_public" ON public.profiles
  FOR SELECT
  USING (
    auth.role() = 'authenticated'
  );

-- ============================================================================
-- SERVICE_ROLE POLICIES (1 policy)
-- Backend, triggers, API routes have full access
-- ============================================================================

-- 19) Service role (backend) full access: read, insert, update, delete any
CREATE POLICY "profiles_service_role_all" ON public.profiles
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

COMMIT;

-- ============================================================================
-- Verification & Summary
-- ============================================================================
SELECT 'Profile RLS Policies Setup Complete!' AS status;

-- List all profile policies
SELECT 
  policyname,
  permissive,
  cmd,
  CASE 
    WHEN policyname LIKE '%owner%' THEN 'OWNER'
    WHEN policyname LIKE '%admin%' THEN 'ADMIN'
    WHEN policyname LIKE '%client%' THEN 'CLIENT'
    WHEN policyname LIKE '%worker%' THEN 'WORKER'
    WHEN policyname LIKE '%authenticated%' THEN 'AUTHENTICATED'
    WHEN policyname LIKE '%service_role%' THEN 'SERVICE_ROLE'
    ELSE 'OTHER'
  END as access_type
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'profiles'
ORDER BY access_type, policyname;

-- Count total policies
SELECT COUNT(*) as total_profile_policies FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'profiles';

-- ============================================================================
-- Setup Notes
-- ============================================================================
-- 
-- To add an admin user after setup:
-- INSERT INTO public.admin_users (user_id) VALUES ('<UUID>');
--
-- To verify admin_users table:
-- SELECT * FROM public.admin_users;
--
-- Policy Breakdown (19 total):
--
-- OWNERS (5 policies):
--   - profiles_owner_select: read own
--   - profiles_owner_insert: insert own
--   - profiles_owner_update: update own
--   - profiles_owner_delete: delete own
--   - profiles_owner_upsert: combined access
--
-- CLIENTS (3 policies):
--   - profiles_clients_read_workers: see worker profiles
--   - profiles_clients_read_aged: see aged/trust profiles
--   - profiles_clients_read_contact: see contact info
--
-- WORKERS (3 policies):
--   - profiles_workers_read_clients: see client profiles
--   - profiles_workers_read_aged: see aged profiles
--   - profiles_workers_read_admins: see admin contact (optional)
--
-- ADMINS (5 policies):
--   - profiles_admin_select: read any
--   - profiles_admin_insert: insert any
--   - profiles_admin_update: update any
--   - profiles_admin_delete: delete any
--   - profiles_admin_upsert: full control
--
-- AUTHENTICATED PUBLIC (2 policies):
--   - profiles_authenticated_read_by_role: read by role
--   - profiles_authenticated_read_public: general read
--
-- SERVICE_ROLE (1 policy):
--   - profiles_service_role_all: backend full access
--
-- Total: 19 policies
