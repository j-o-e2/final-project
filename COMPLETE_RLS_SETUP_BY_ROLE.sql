-- ============================================================================
-- COMPLETE_RLS_SETUP_BY_ROLE.sql
-- ============================================================================
-- Comprehensive RLS policies organized by role:
-- - CLIENTS: can view/manage their own jobs, view services/workers, apply indirectly
-- - WORKERS: can view/apply for jobs, manage own services, manage own applications
-- - ADMINS: can view/manage everything (via admin_users table, no recursion)
-- - SERVICE_ROLE: backend/API/triggers have full access
--
-- This file creates an `admin_users` table and drops/recreates all policies
-- to ensure consistency. Idempotent and non-recursive.
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
-- Step 1: Drop ALL existing RLS policies (clean slate)
-- ============================================================================
DO $$
DECLARE
    policy_name TEXT;
    table_name TEXT;
BEGIN
    FOR table_name IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('profiles', 'jobs', 'services', 'job_applications', 'reviews')
    LOOP
        FOR policy_name IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = table_name
        LOOP
            EXECUTE 'DROP POLICY IF EXISTS "' || policy_name || '" ON public.' || table_name;
        END LOOP;
    END LOOP;
END $$;

-- ============================================================================
-- Step 2: Enable RLS on all tables
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PROFILES TABLE POLICIES
-- ============================================================================

-- PROFILES: Owner can read own
CREATE POLICY "profiles_owner_read" ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- PROFILES: Owner can insert own
CREATE POLICY "profiles_owner_insert" ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- PROFILES: Owner can update own
CREATE POLICY "profiles_owner_update" ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- PROFILES: Owner can delete own
CREATE POLICY "profiles_owner_delete" ON public.profiles
  FOR DELETE
  USING (auth.uid() = id);

-- PROFILES: Admins can read any profile
CREATE POLICY "profiles_admin_read" ON public.profiles
  FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.admin_users au WHERE au.user_id = auth.uid()));

-- PROFILES: Admins can insert
CREATE POLICY "profiles_admin_insert" ON public.profiles
  FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users au WHERE au.user_id = auth.uid()));

-- PROFILES: Admins can update any
CREATE POLICY "profiles_admin_update" ON public.profiles
  FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.admin_users au WHERE au.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users au WHERE au.user_id = auth.uid()));

-- PROFILES: Admins can delete any
CREATE POLICY "profiles_admin_delete" ON public.profiles
  FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.admin_users au WHERE au.user_id = auth.uid()));

-- PROFILES: Authenticated users can read workers (for browsing)
CREATE POLICY "profiles_workers_public_read" ON public.profiles
  FOR SELECT
  USING (auth.role() = 'authenticated' AND role = 'worker');

-- PROFILES: Authenticated users can read clients (for interaction)
CREATE POLICY "profiles_clients_public_read" ON public.profiles
  FOR SELECT
  USING (auth.role() = 'authenticated' AND role = 'client');

-- PROFILES: Service role full access
CREATE POLICY "profiles_service_role_all" ON public.profiles
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================================
-- JOBS TABLE POLICIES (Clients post jobs, workers apply)
-- ============================================================================

-- JOBS: Clients can read own jobs
CREATE POLICY "jobs_client_read_own" ON public.jobs
  FOR SELECT
  USING (auth.uid() = client_id);

-- JOBS: Clients can insert (create) jobs
CREATE POLICY "jobs_client_insert" ON public.jobs
  FOR INSERT
  WITH CHECK (auth.uid() = client_id);

-- JOBS: Clients can update own jobs
CREATE POLICY "jobs_client_update_own" ON public.jobs
  FOR UPDATE
  USING (auth.uid() = client_id)
  WITH CHECK (auth.uid() = client_id);

-- JOBS: Clients can delete own jobs
CREATE POLICY "jobs_client_delete_own" ON public.jobs
  FOR DELETE
  USING (auth.uid() = client_id);

-- JOBS: Workers can read all jobs (to browse and apply)
CREATE POLICY "jobs_workers_read_all" ON public.jobs
  FOR SELECT
  USING (auth.role() = 'authenticated' AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'worker');

-- JOBS: Admins can read any job
CREATE POLICY "jobs_admin_read" ON public.jobs
  FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.admin_users au WHERE au.user_id = auth.uid()));

-- JOBS: Admins can insert
CREATE POLICY "jobs_admin_insert" ON public.jobs
  FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users au WHERE au.user_id = auth.uid()));

-- JOBS: Admins can update any
CREATE POLICY "jobs_admin_update" ON public.jobs
  FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.admin_users au WHERE au.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users au WHERE au.user_id = auth.uid()));

-- JOBS: Admins can delete any
CREATE POLICY "jobs_admin_delete" ON public.jobs
  FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.admin_users au WHERE au.user_id = auth.uid()));

-- JOBS: Service role full access
CREATE POLICY "jobs_service_role_all" ON public.jobs
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================================
-- SERVICES TABLE POLICIES (Workers offer services, clients browse)
-- ============================================================================

-- SERVICES: Workers can read own services
CREATE POLICY "services_worker_read_own" ON public.services
  FOR SELECT
  USING (auth.uid() = provider_id);

-- SERVICES: Workers can insert own services
CREATE POLICY "services_worker_insert" ON public.services
  FOR INSERT
  WITH CHECK (auth.uid() = provider_id);

-- SERVICES: Workers can update own services
CREATE POLICY "services_worker_update_own" ON public.services
  FOR UPDATE
  USING (auth.uid() = provider_id)
  WITH CHECK (auth.uid() = provider_id);

-- SERVICES: Workers can delete own services
CREATE POLICY "services_worker_delete_own" ON public.services
  FOR DELETE
  USING (auth.uid() = provider_id);

-- SERVICES: Clients can read all services (to browse)
CREATE POLICY "services_client_read_all" ON public.services
  FOR SELECT
  USING (auth.role() = 'authenticated' AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'client');

-- SERVICES: Authenticated users can read all services
CREATE POLICY "services_public_read" ON public.services
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- SERVICES: Admins can read any service
CREATE POLICY "services_admin_read" ON public.services
  FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.admin_users au WHERE au.user_id = auth.uid()));

-- SERVICES: Admins can insert
CREATE POLICY "services_admin_insert" ON public.services
  FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users au WHERE au.user_id = auth.uid()));

-- SERVICES: Admins can update any
CREATE POLICY "services_admin_update" ON public.services
  FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.admin_users au WHERE au.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users au WHERE au.user_id = auth.uid()));

-- SERVICES: Admins can delete any
CREATE POLICY "services_admin_delete" ON public.services
  FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.admin_users au WHERE au.user_id = auth.uid()));

-- SERVICES: Service role full access
CREATE POLICY "services_service_role_all" ON public.services
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================================
-- JOB_APPLICATIONS TABLE POLICIES (Workers apply, clients review)
-- ============================================================================

-- JOB_APPLICATIONS: Workers can read own applications
CREATE POLICY "job_applications_worker_read_own" ON public.job_applications
  FOR SELECT
  USING (auth.uid() = provider_id);

-- JOB_APPLICATIONS: Workers can insert own applications
CREATE POLICY "job_applications_worker_insert" ON public.job_applications
  FOR INSERT
  WITH CHECK (auth.uid() = provider_id);

-- JOB_APPLICATIONS: Workers can update own applications
CREATE POLICY "job_applications_worker_update_own" ON public.job_applications
  FOR UPDATE
  USING (auth.uid() = provider_id)
  WITH CHECK (auth.uid() = provider_id);

-- JOB_APPLICATIONS: Workers can delete own applications
CREATE POLICY "job_applications_worker_delete_own" ON public.job_applications
  FOR DELETE
  USING (auth.uid() = provider_id);

-- JOB_APPLICATIONS: Clients can read applications for their jobs
CREATE POLICY "job_applications_client_read_own" ON public.job_applications
  FOR SELECT
  USING (auth.uid() = (SELECT client_id FROM public.jobs WHERE id = job_applications.job_id));

-- JOB_APPLICATIONS: Clients can update applications for their jobs (accept/reject)
CREATE POLICY "job_applications_client_update_own" ON public.job_applications
  FOR UPDATE
  USING (auth.uid() = (SELECT client_id FROM public.jobs WHERE id = job_applications.job_id))
  WITH CHECK (auth.uid() = (SELECT client_id FROM public.jobs WHERE id = job_applications.job_id));

-- JOB_APPLICATIONS: Admins can read any application
CREATE POLICY "job_applications_admin_read" ON public.job_applications
  FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.admin_users au WHERE au.user_id = auth.uid()));

-- JOB_APPLICATIONS: Admins can insert
CREATE POLICY "job_applications_admin_insert" ON public.job_applications
  FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users au WHERE au.user_id = auth.uid()));

-- JOB_APPLICATIONS: Admins can update any
CREATE POLICY "job_applications_admin_update" ON public.job_applications
  FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.admin_users au WHERE au.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users au WHERE au.user_id = auth.uid()));

-- JOB_APPLICATIONS: Admins can delete any
CREATE POLICY "job_applications_admin_delete" ON public.job_applications
  FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.admin_users au WHERE au.user_id = auth.uid()));

-- JOB_APPLICATIONS: Service role full access
CREATE POLICY "job_applications_service_role_all" ON public.job_applications
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================================
-- REVIEWS TABLE POLICIES (Clients and workers review each other)
-- ============================================================================

-- REVIEWS: Reviewers can read own reviews
CREATE POLICY "reviews_reviewer_read_own" ON public.reviews
  FOR SELECT
  USING (auth.uid() = reviewer_id);

-- REVIEWS: Reviewee can read reviews about them
CREATE POLICY "reviews_reviewee_read" ON public.reviews
  FOR SELECT
  USING (auth.uid() = reviewee_id);

-- REVIEWS: Users involved in transaction can read (client, provider)
CREATE POLICY "reviews_involved_read" ON public.reviews
  FOR SELECT
  USING (
    auth.uid() = reviewer_id
    OR auth.uid() = reviewee_id
    OR auth.uid() = client_id
    OR auth.uid() = provider_id
  );

-- REVIEWS: Users can insert own reviews (they are the reviewer)
CREATE POLICY "reviews_reviewer_insert" ON public.reviews
  FOR INSERT
  WITH CHECK (auth.uid() = reviewer_id);

-- REVIEWS: Users can update own reviews
CREATE POLICY "reviews_reviewer_update_own" ON public.reviews
  FOR UPDATE
  USING (auth.uid() = reviewer_id)
  WITH CHECK (auth.uid() = reviewer_id);

-- REVIEWS: Users can delete own reviews
CREATE POLICY "reviews_reviewer_delete_own" ON public.reviews
  FOR DELETE
  USING (auth.uid() = reviewer_id);

-- REVIEWS: Admins can read any review
CREATE POLICY "reviews_admin_read" ON public.reviews
  FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.admin_users au WHERE au.user_id = auth.uid()));

-- REVIEWS: Admins can insert
CREATE POLICY "reviews_admin_insert" ON public.reviews
  FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users au WHERE au.user_id = auth.uid()));

-- REVIEWS: Admins can update any
CREATE POLICY "reviews_admin_update" ON public.reviews
  FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.admin_users au WHERE au.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users au WHERE au.user_id = auth.uid()));

-- REVIEWS: Admins can delete any
CREATE POLICY "reviews_admin_delete" ON public.reviews
  FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.admin_users au WHERE au.user_id = auth.uid()));

-- REVIEWS: Service role full access
CREATE POLICY "reviews_service_role_all" ON public.reviews
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

COMMIT;

-- ============================================================================
-- Verification & Summary
-- ============================================================================
SELECT 'RLS Policies Setup Complete!' AS status;

-- List all policies by table
SELECT 
  tablename,
  policyname,
  permissive,
  cmd,
  CASE 
    WHEN policyname LIKE '%admin%' THEN 'ADMIN'
    WHEN policyname LIKE '%client%' THEN 'CLIENT'
    WHEN policyname LIKE '%worker%' THEN 'WORKER'
    WHEN policyname LIKE '%owner%' THEN 'OWNER'
    WHEN policyname LIKE '%service_role%' THEN 'SERVICE_ROLE'
    WHEN policyname LIKE '%public%' THEN 'PUBLIC'
    ELSE 'OTHER'
  END as role_type
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, role_type, policyname;

-- Count policies by table
SELECT 
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public' AND tablename IN ('profiles', 'jobs', 'services', 'job_applications', 'reviews')
GROUP BY tablename
ORDER BY tablename;

-- ============================================================================
-- Setup Notes
-- ============================================================================
-- To add an admin user after setup:
-- INSERT INTO public.admin_users (user_id) VALUES ('<UUID>');
--
-- Policy breakdown by role:
-- CLIENTS (role='client'):
--   - Profiles: read/insert/update/delete own
--   - Jobs: create, read own, update own, delete own
--   - Job Applications: read applications for their jobs, update (accept/reject)
--   - Services: read all (browse)
--   - Reviews: create reviews, read own/others' reviews
--
-- WORKERS (role='worker'):
--   - Profiles: read/insert/update/delete own
--   - Jobs: read all (browse), apply via applications
--   - Services: create, read own, update own, delete own
--   - Job Applications: create, read own, update own, delete own
--   - Reviews: create reviews, read own/others' reviews
--
-- ADMINS (in admin_users table):
--   - All tables: full CRUD access (read/insert/update/delete all)
--
-- SERVICE_ROLE (backend):
--   - All tables: full CRUD access (for triggers, migrations, API logic)
