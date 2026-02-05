-- ============================================================================
-- FIX_TABLE_RELATIONSHIPS_SAFE.sql
-- ============================================================================
-- Safe, idempotent script to add foreign-key constraints + indexes + 
-- minimal RLS policies so PostgREST/Supabase schema cache can discover relationships.
--
-- Instructions: Paste and run the whole file in Supabase SQL Editor.
--
-- IMPORTANT NOTE:
-- This file does NOT insert placeholder profiles because `profiles` has a FK constraint
-- to `auth.users`. Only real auth users have profiles. Instead, this script:
-- 1) Adds FK constraints between jobs/services/job_applications and profiles.
-- 2) Creates helpful indexes.
-- 3) Creates minimal RLS policies for reads/inserts.
--
-- If you have orphaned references (e.g., jobs.client_id not in profiles):
--   - First delete those orphaned rows, OR
--   - Create real auth users first and then create their profiles, OR
--   - Contact Supabase support to temporarily disable the auth FK constraint.
-- ============================================================================

BEGIN;

-- =========================
-- 1) Add FK constraints (only if column exists and constraint missing)
-- =========================
-- These ensure that jobs, services, and job_applications can only reference
-- profiles that actually exist, allowing PostgREST to discover relationships.

-- jobs -> profiles (client_id)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='jobs' AND column_name='client_id'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'jobs_client_id_fkey' AND table_name = 'jobs') THEN
        EXECUTE 'ALTER TABLE public.jobs ADD CONSTRAINT jobs_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.profiles(id) ON DELETE CASCADE';
        RAISE NOTICE 'Added constraint jobs_client_id_fkey';
    ELSE
      RAISE NOTICE 'Constraint jobs_client_id_fkey already exists';
    END IF;
  ELSE
    RAISE NOTICE 'Column jobs.client_id does not exist, skipping';
  END IF;
END $$;

-- jobs -> profiles (poster_id)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='jobs' AND column_name='poster_id'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'jobs_poster_id_fkey' AND table_name = 'jobs') THEN
        EXECUTE 'ALTER TABLE public.jobs ADD CONSTRAINT jobs_poster_id_fkey FOREIGN KEY (poster_id) REFERENCES public.profiles(id) ON DELETE CASCADE';
        RAISE NOTICE 'Added constraint jobs_poster_id_fkey';
    ELSE
      RAISE NOTICE 'Constraint jobs_poster_id_fkey already exists';
    END IF;
  ELSE
    RAISE NOTICE 'Column jobs.poster_id does not exist, skipping';
  END IF;
END $$;

-- job_applications -> profiles (provider_id)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='job_applications' AND column_name='provider_id'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'job_applications_provider_id_fkey' AND table_name = 'job_applications') THEN
        EXECUTE 'ALTER TABLE public.job_applications ADD CONSTRAINT job_applications_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.profiles(id) ON DELETE CASCADE';
        RAISE NOTICE 'Added constraint job_applications_provider_id_fkey';
    ELSE
      RAISE NOTICE 'Constraint job_applications_provider_id_fkey already exists';
    END IF;
  ELSE
    RAISE NOTICE 'Column job_applications.provider_id does not exist, skipping';
  END IF;
END $$;

-- job_applications -> jobs (job_id)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='job_applications' AND column_name='job_id'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'job_applications_job_id_fkey' AND table_name = 'job_applications') THEN
        EXECUTE 'ALTER TABLE public.job_applications ADD CONSTRAINT job_applications_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE';
        RAISE NOTICE 'Added constraint job_applications_job_id_fkey';
    ELSE
      RAISE NOTICE 'Constraint job_applications_job_id_fkey already exists';
    END IF;
  ELSE
    RAISE NOTICE 'Column job_applications.job_id does not exist, skipping';
  END IF;
END $$;

-- services -> profiles (provider_id)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='services' AND column_name='provider_id'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'services_provider_id_fkey' AND table_name = 'services') THEN
        EXECUTE 'ALTER TABLE public.services ADD CONSTRAINT services_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.profiles(id) ON DELETE CASCADE';
        RAISE NOTICE 'Added constraint services_provider_id_fkey';
    ELSE
      RAISE NOTICE 'Constraint services_provider_id_fkey already exists';
    END IF;
  ELSE
    RAISE NOTICE 'Column services.provider_id does not exist, skipping';
  END IF;
END $$;

-- =========================
-- 2) Create helpful indexes
-- =========================
CREATE INDEX IF NOT EXISTS idx_jobs_client_id ON public.jobs(client_id);
CREATE INDEX IF NOT EXISTS idx_jobs_poster_id ON public.jobs(poster_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_provider_id ON public.job_applications(provider_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_job_id ON public.job_applications(job_id);
CREATE INDEX IF NOT EXISTS idx_services_provider_id ON public.services(provider_id);

-- =========================
-- 3) Minimal RLS policies to allow reads/inserts (idempotent)
-- =========================

-- Enable RLS where present
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='jobs') THEN
    EXECUTE 'ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='job_applications') THEN
    EXECUTE 'ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='services') THEN
    EXECUTE 'ALTER TABLE public.services ENABLE ROW LEVEL SECURITY';
  END IF;
END $$;

-- Jobs: allow owners to read/insert/update/delete (check both columns if exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Owners can read own jobs' AND tablename = 'jobs') THEN
    RAISE NOTICE 'Job owner policies already exist';
  ELSE
    -- Select uses either client_id or poster_id
    CREATE POLICY "Owners can read own jobs" ON public.jobs FOR SELECT
      USING ( (coalesce(client_id::text, '') = auth.uid()::text) OR (coalesce(poster_id::text, '') = auth.uid()::text) OR auth.role() = 'service_role');

    CREATE POLICY "Owners can insert jobs" ON public.jobs FOR INSERT
      WITH CHECK ( (coalesce(client_id::text, '') = auth.uid()::text) OR (coalesce(poster_id::text, '') = auth.uid()::text) OR auth.role() = 'service_role');

    CREATE POLICY "Owners can update own jobs" ON public.jobs FOR UPDATE
      USING ( (coalesce(client_id::text, '') = auth.uid()::text) OR (coalesce(poster_id::text, '') = auth.uid()::text) OR auth.role() = 'service_role')
      WITH CHECK ( (coalesce(client_id::text, '') = auth.uid()::text) OR (coalesce(poster_id::text, '') = auth.uid()::text) OR auth.role() = 'service_role');

    CREATE POLICY "Owners can delete own jobs" ON public.jobs FOR DELETE
      USING ( (coalesce(client_id::text, '') = auth.uid()::text) OR (coalesce(poster_id::text, '') = auth.uid()::text) OR auth.role() = 'service_role');
  END IF;
END $$;

-- Job applications: allow providers to read/insert their applications and allow job owners to read applications for their jobs
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Providers or job owners can read job_applications' AND tablename = 'job_applications') THEN
    CREATE POLICY "Providers or job owners can read job_applications" ON public.job_applications FOR SELECT
      USING ( auth.uid() = provider_id OR auth.uid() = (SELECT coalesce(client_id, poster_id) FROM public.jobs WHERE jobs.id = job_applications.job_id) OR auth.role() = 'service_role');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Providers can insert job_applications' AND tablename = 'job_applications') THEN
    CREATE POLICY "Providers can insert job_applications" ON public.job_applications FOR INSERT
      WITH CHECK ( auth.uid() = provider_id OR auth.role() = 'service_role');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Providers can update own job_applications' AND tablename = 'job_applications') THEN
    CREATE POLICY "Providers can update own job_applications" ON public.job_applications FOR UPDATE
      USING ( auth.uid() = provider_id OR auth.role() = 'service_role')
      WITH CHECK ( auth.uid() = provider_id OR auth.role() = 'service_role');
  END IF;
END $$;

-- Services: allow providers to manage their services
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Providers can manage services' AND tablename = 'services') THEN
    CREATE POLICY "Providers can manage services" ON public.services FOR ALL
      USING ( auth.uid() = provider_id OR auth.role() = 'service_role')
      WITH CHECK ( auth.uid() = provider_id OR auth.role() = 'service_role');
  END IF;
END $$;

COMMIT;

-- =========================
-- Verification: list created constraints and policies
-- =========================

SELECT '=== CONSTRAINTS: jobs, job_applications, services ===' AS section;
SELECT constraint_name, table_name, column_name
FROM information_schema.key_column_usage
WHERE table_schema = 'public'
  AND table_name IN ('jobs','job_applications','services')
  AND constraint_name LIKE '%_fkey'
ORDER BY table_name, column_name;

SELECT '' AS blank;
SELECT '=== POLICIES ON jobs/job_applications/services ===' AS section;
SELECT tablename, policyname FROM pg_policies WHERE tablename IN ('jobs','job_applications','services') ORDER BY tablename, policyname;

SELECT '' AS blank;
SELECT '=== ORPHANED REFERENCES (if any, DELETE these rows) ===' AS note;

-- offending jobs.client_id or poster_id not in profiles
SELECT DISTINCT j.client_id as missing_profile_id, 'jobs.client_id' as column_ref, COUNT(*) as row_count
FROM public.jobs j 
WHERE j.client_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = j.client_id) 
GROUP BY j.client_id;

SELECT DISTINCT j.poster_id as missing_profile_id, 'jobs.poster_id' as column_ref, COUNT(*) as row_count
FROM public.jobs j 
WHERE j.poster_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = j.poster_id) 
GROUP BY j.poster_id;

-- offending job_applications.provider_id not in profiles
SELECT DISTINCT ja.provider_id as missing_profile_id, 'job_applications.provider_id' as column_ref, COUNT(*) as row_count
FROM public.job_applications ja 
WHERE ja.provider_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = ja.provider_id) 
GROUP BY ja.provider_id;

-- offending job_applications.job_id not in jobs
SELECT DISTINCT ja.job_id as missing_job_id, 'job_applications.job_id' as column_ref, COUNT(*) as row_count
FROM public.job_applications ja 
WHERE ja.job_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = ja.job_id) 
GROUP BY ja.job_id;

-- offending services.provider_id not in profiles
SELECT DISTINCT s.provider_id as missing_profile_id, 'services.provider_id' as column_ref, COUNT(*) as row_count
FROM public.services s 
WHERE s.provider_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = s.provider_id) 
GROUP BY s.provider_id;

SELECT '' AS blank;
SELECT 'FIX_TABLE_RELATIONSHIPS_SAFE.sql completed.' AS status;
SELECT 'If you see orphaned references above, delete those rows before retrying constraints.' AS note;
