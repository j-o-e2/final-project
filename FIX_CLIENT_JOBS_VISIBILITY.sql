-- ============================================================================
-- FIX_CLIENT_JOBS_VISIBILITY.sql
-- ============================================================================
-- Fixes the error: "Could not find relationship between 'job_applications' 
-- and 'profiles' in the schema cache"
--
-- The issue occurs when a client tries to query their own jobs with expanded
-- job_applications and nested profiles. PostgREST needs:
--
-- 1. Proper FK constraints (should exist from FIX_ALL_TABLE_RELATIONSHIPS.sql)
-- 2. RLS policies allowing clients to read job_applications for their own jobs
-- 3. RLS policies allowing clients/providers to read profiles via FK traversal
--
-- This file ensures all these conditions are met.
--
-- Run in Supabase SQL Editor after other table setup is complete.
-- ============================================================================

BEGIN;

-- ============================================================================
-- Step 1: Verify FK constraints exist
-- ============================================================================

-- Verify job_applications_provider_id_fkey exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'job_applications_provider_id_fkey'
        AND table_name = 'job_applications'
    ) THEN
        ALTER TABLE public.job_applications 
        ADD CONSTRAINT job_applications_provider_id_fkey 
        FOREIGN KEY (provider_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
        RAISE NOTICE 'Created job_applications_provider_id_fkey';
    ELSE
        RAISE NOTICE 'job_applications_provider_id_fkey already exists';
    END IF;
END $$;

-- Verify job_applications_job_id_fkey exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'job_applications_job_id_fkey'
        AND table_name = 'job_applications'
    ) THEN
        ALTER TABLE public.job_applications 
        ADD CONSTRAINT job_applications_job_id_fkey 
        FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE;
        RAISE NOTICE 'Created job_applications_job_id_fkey';
    ELSE
        RAISE NOTICE 'job_applications_job_id_fkey already exists';
    END IF;
END $$;

-- Verify jobs_client_id_fkey exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'jobs_client_id_fkey'
        AND table_name = 'jobs'
    ) THEN
        ALTER TABLE public.jobs 
        ADD CONSTRAINT jobs_client_id_fkey 
        FOREIGN KEY (client_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
        RAISE NOTICE 'Created jobs_client_id_fkey';
    ELSE
        RAISE NOTICE 'jobs_client_id_fkey already exists';
    END IF;
END $$;

-- ============================================================================
-- Step 2: Ensure RLS policies allow nested relationship queries
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Step 3: Verify critical RLS policies for client visibility
-- ============================================================================

-- Policy: Clients can read their own jobs (required for base query)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'Clients can read own jobs' 
        AND tablename = 'jobs'
    ) THEN
        CREATE POLICY "Clients can read own jobs" ON public.jobs
            FOR SELECT
            USING (auth.uid() = client_id);
        RAISE NOTICE 'Created: Clients can read own jobs policy';
    ELSE
        RAISE NOTICE 'Policy exists: Clients can read own jobs';
    END IF;
END $$;

-- Policy: Clients can read job_applications for their own jobs (required for nested expand)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'Clients can read applications for their jobs' 
        AND tablename = 'job_applications'
    ) THEN
        CREATE POLICY "Clients can read applications for their jobs" ON public.job_applications
            FOR SELECT
            USING (auth.uid() = (SELECT client_id FROM public.jobs WHERE jobs.id = job_applications.job_id));
        RAISE NOTICE 'Created: Clients can read applications for their jobs policy';
    ELSE
        RAISE NOTICE 'Policy exists: Clients can read applications for their jobs';
    END IF;
END $$;

-- Policy: Providers can read their own job_applications (required for nested profiles expand)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'Providers can read their job applications' 
        AND tablename = 'job_applications'
    ) THEN
        CREATE POLICY "Providers can read their job applications" ON public.job_applications
            FOR SELECT
            USING (auth.uid() = provider_id);
        RAISE NOTICE 'Created: Providers can read their job applications policy';
    ELSE
        RAISE NOTICE 'Policy exists: Providers can read their job applications';
    END IF;
END $$;

-- Policy: Allow reading profiles when they are part of job_applications FK traversal
-- This is needed when clients read job_applications which reference profiles via provider_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'Authenticated can read provider profiles' 
        AND tablename = 'profiles'
    ) THEN
        CREATE POLICY "Authenticated can read provider profiles" ON public.profiles
            FOR SELECT
            USING (auth.role() = 'authenticated' AND role = 'worker');
        RAISE NOTICE 'Created: Authenticated can read provider profiles policy';
    ELSE
        RAISE NOTICE 'Policy exists: Authenticated can read provider profiles';
    END IF;
END $$;

-- Policy: Service role needs full access for internal joins
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'Service role full access to job_applications' 
        AND tablename = 'job_applications'
    ) THEN
        CREATE POLICY "Service role full access to job_applications" ON public.job_applications
            FOR ALL
            USING (auth.role() = 'service_role')
            WITH CHECK (auth.role() = 'service_role');
        RAISE NOTICE 'Created: Service role full access to job_applications';
    ELSE
        RAISE NOTICE 'Policy exists: Service role full access to job_applications';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'Service role full access to profiles' 
        AND tablename = 'profiles'
    ) THEN
        CREATE POLICY "Service role full access to profiles" ON public.profiles
            FOR ALL
            USING (auth.role() = 'service_role')
            WITH CHECK (auth.role() = 'service_role');
        RAISE NOTICE 'Created: Service role full access to profiles';
    ELSE
        RAISE NOTICE 'Policy exists: Service role full access to profiles';
    END IF;
END $$;

COMMIT;

-- ============================================================================
-- Verification Queries
-- ============================================================================

SELECT '=== FOREIGN KEY CONSTRAINTS ===' AS section;
SELECT 
    constraint_name,
    table_name,
    column_name,
    (SELECT table_name FROM information_schema.constraint_column_usage ccu 
     WHERE ccu.constraint_name = kcu.constraint_name AND kcu.table_schema = 'public') as references_table
FROM information_schema.key_column_usage kcu
WHERE kcu.table_schema = 'public'
    AND kcu.table_name IN ('jobs', 'job_applications', 'profiles')
    AND kcu.column_name IN ('client_id', 'provider_id', 'job_id')
ORDER BY kcu.table_name, kcu.column_name;

SELECT '' AS blank;
SELECT '=== JOB_APPLICATIONS RLS POLICIES ===' AS section;
SELECT policyname, permissive, cmd, qual
FROM pg_policies
WHERE tablename = 'job_applications'
ORDER BY policyname;

SELECT '' AS blank;
SELECT '=== JOBS RLS POLICIES ===' AS section;
SELECT policyname, permissive, cmd, qual
FROM pg_policies
WHERE tablename = 'jobs'
ORDER BY policyname;

SELECT '' AS blank;
SELECT 'All checks complete. Clients should now be able to query their own jobs with expanded job_applications and provider profiles.' AS result;

