-- ============================================================================
-- SETUP_EXTENDED_PROFILE_POLICIES.sql
-- ============================================================================
-- Idempotent setup of extended row-level security (RLS) policies for
-- `public.profiles` to cover owner access, admin access (via admin_users
-- table), role-based reads (clients/workers), and service-role access.
--
-- Notes / Constraints:
-- - Policies must not recurse by selecting from `public.profiles` inside
--   a policy condition for the same table (that causes infinite recursion).
-- - To implement admin-level checks without recursion we create a small
--   helper table `public.admin_users` which lists user ids that are admins.
-- - After running this file, add admin user ids to `public.admin_users`.
--
-- Run this in Supabase SQL Editor. This file is safe to re-run.
-- ============================================================================

BEGIN;

-- Create helper table for admin users (idempotent)
CREATE TABLE IF NOT EXISTS public.admin_users (
  user_id UUID PRIMARY KEY,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Step 0: Drop existing policies on profiles (idempotent)
DO $$
DECLARE
    policy_name TEXT;
BEGIN
    FOR policy_name IN
        SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_name || '" ON public.profiles';
    END LOOP;
END $$;

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Create extended policies (non-recursive)
-- ============================================================================

-- 1) Users can READ (SELECT) their own profile
CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- 2) Users can INSERT their own profile (on signup)
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 3) Users can UPDATE their own profile
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 4) Users can DELETE their own profile
CREATE POLICY "Users can delete own profile" ON public.profiles
  FOR DELETE
  USING (auth.uid() = id);

-- 5) Service role FULL access (backend, functions, migrations)
CREATE POLICY "Service role full access" ON public.profiles
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 6) Authenticated users can read public profiles (e.g., to show listings)
--    This allows reading profiles where the row's `role` is not 'private'.
CREATE POLICY "Authenticated users can read public profiles" ON public.profiles
  FOR SELECT
  USING (auth.role() = 'authenticated' AND (role IS NULL OR role <> 'private'));

-- 7) Admins (listed in admin_users) can READ any profile
CREATE POLICY "Admins can read any profile" ON public.profiles
  FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.admin_users au WHERE au.user_id = auth.uid()));

-- 8) Admins (listed in admin_users) can INSERT any profile (useful for migrations)
CREATE POLICY "Admins can insert profiles" ON public.profiles
  FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users au WHERE au.user_id = auth.uid()));

-- 9) Admins can UPDATE any profile
CREATE POLICY "Admins can update any profile" ON public.profiles
  FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.admin_users au WHERE au.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users au WHERE au.user_id = auth.uid()));

-- 10) Admins can DELETE any profile
CREATE POLICY "Admins can delete any profile" ON public.profiles
  FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.admin_users au WHERE au.user_id = auth.uid()));

-- 11) Clients can READ worker profiles (so clients can view providers)
CREATE POLICY "Clients can read workers" ON public.profiles
  FOR SELECT
  USING ( (role = 'worker') AND (auth.role() = 'authenticated') );

-- 12) Workers can READ client profiles (so providers can view clients they interact with)
CREATE POLICY "Workers can read clients" ON public.profiles
  FOR SELECT
  USING ( (role = 'client') AND (auth.role() = 'authenticated') );

-- 13) Allow service processes (service_role) to INSERT/UPDATE avatar/service fields
CREATE POLICY "Service role can modify avatar fields" ON public.profiles
  FOR UPDATE
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 14) Allow authenticated users to view minimal public contact fields
--     (If you want to restrict certain sensitive fields like email, handle at app layer)
CREATE POLICY "Authenticated can view contact-ish fields" ON public.profiles
  FOR SELECT
  USING (auth.role() = 'authenticated' AND (role IS NULL OR role <> 'private'));

-- 15) Allow users to upsert their profile via RPCs (managed by service role)
--     This is a permissive policy that only allows authenticated users to INSERT/UPDATE
--     their own record (duplicate of owner policies, kept for clarity).
CREATE POLICY "Users upsert own profile" ON public.profiles
  FOR ALL
  USING (auth.uid() = id OR auth.role() = 'service_role')
  WITH CHECK (auth.uid() = id OR auth.role() = 'service_role');

-- 16) (Optional) Allow authenticated users to search workers by role/location
--     This is a SELECT policy that overlaps with others; safe to keep.
CREATE POLICY "Authenticated can search workers" ON public.profiles
  FOR SELECT
  USING (auth.role() = 'authenticated' AND role = 'worker');

-- 17) (Optional) Allow read access to profiles created more than X days ago for trust
--     Example: allow anyone to read profiles older than 1 day (customize as needed)
CREATE POLICY "Public read aged profiles" ON public.profiles
  FOR SELECT
  USING ((created_at IS NOT NULL AND created_at < (now() - interval '1 day')));

COMMIT;

-- ============================================================================
-- Post-setup notes
-- ============================================================================
-- 1) To grant an admin, run:
--    INSERT INTO public.admin_users (user_id) VALUES ('<UUID of admin user>');
--
-- 2) If you prefer admins to be detected from a profile column (profiles.role = 'admin')
--    do NOT use that inside a policy for `public.profiles` (it will recurse). Instead,
--    either
--      - maintain `admin_users`, or
--      - add a PostgreSQL function owned by a privileged role that checks admin status
--        (and does not read `public.profiles`), then call that function in policies.
--
-- 3) Re-run this file whenever you need to reset policies (it's idempotent).
--
-- Verification: list policies
SELECT policyname, permissive, cmd
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'profiles'
ORDER BY policyname;
