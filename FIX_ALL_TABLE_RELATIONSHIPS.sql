-- ============================================================================
-- Fix Services and Job Applications Table Relationships
-- ============================================================================
-- This SQL ensures services and job_applications tables have proper
-- foreign key constraints and relationships to the profiles table
--
-- Run this in Supabase SQL Editor
--
-- ============================================================================

BEGIN;

-- ============================================================================
-- Step 1: Fix Services Table Relationships
-- ============================================================================

-- Add FK constraint for provider_id if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'services_provider_id_fkey'
        AND table_name = 'services'
    ) THEN
        ALTER TABLE public.services 
        ADD CONSTRAINT services_provider_id_fkey 
        FOREIGN KEY (provider_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Create indexes on services for common queries
CREATE INDEX IF NOT EXISTS idx_services_provider_id ON public.services(provider_id);
CREATE INDEX IF NOT EXISTS idx_services_created_at ON public.services(created_at DESC);

-- Create RLS policies for services table if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'Users can read all services'
        AND tablename = 'services'
    ) THEN
        CREATE POLICY "Users can read all services" ON public.services
        FOR SELECT
        USING (true);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'Users can insert own services'
        AND tablename = 'services'
    ) THEN
        CREATE POLICY "Users can insert own services" ON public.services
        FOR INSERT
        WITH CHECK (auth.uid() = provider_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'Users can update own services'
        AND tablename = 'services'
    ) THEN
        CREATE POLICY "Users can update own services" ON public.services
        FOR UPDATE
        USING (auth.uid() = provider_id)
        WITH CHECK (auth.uid() = provider_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'Users can delete own services'
        AND tablename = 'services'
    ) THEN
        CREATE POLICY "Users can delete own services" ON public.services
        FOR DELETE
        USING (auth.uid() = provider_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'Service role full access to services'
        AND tablename = 'services'
    ) THEN
        CREATE POLICY "Service role full access to services" ON public.services
        FOR ALL
        USING (auth.role() = 'service_role')
        WITH CHECK (auth.role() = 'service_role');
    END IF;
END $$;

-- ============================================================================
-- Step 2: Fix Job Applications Table Relationships
-- ============================================================================

-- Add FK constraint for provider_id if it doesn't exist
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
    END IF;
END $$;

-- Add FK constraint for job_id if it doesn't exist
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
    END IF;
END $$;

-- Create indexes on job_applications for common queries
CREATE INDEX IF NOT EXISTS idx_job_applications_provider_id ON public.job_applications(provider_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_job_id ON public.job_applications(job_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_status ON public.job_applications(status);
CREATE INDEX IF NOT EXISTS idx_job_applications_created_at ON public.job_applications(created_at DESC);

-- Create RLS policies for job_applications table if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'Users can read own job applications'
        AND tablename = 'job_applications'
    ) THEN
        CREATE POLICY "Users can read own job applications" ON public.job_applications
        FOR SELECT
        USING (
            auth.uid() = provider_id 
            OR auth.uid() = (SELECT client_id FROM public.jobs WHERE jobs.id = job_applications.job_id)
        );
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'Users can insert job applications'
        AND tablename = 'job_applications'
    ) THEN
        CREATE POLICY "Users can insert job applications" ON public.job_applications
        FOR INSERT
        WITH CHECK (auth.uid() = provider_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'Users can update own job applications'
        AND tablename = 'job_applications'
    ) THEN
        CREATE POLICY "Users can update own job applications" ON public.job_applications
        FOR UPDATE
        USING (
            auth.uid() = provider_id 
            OR auth.uid() = (SELECT client_id FROM public.jobs WHERE jobs.id = job_applications.job_id)
        )
        WITH CHECK (
            auth.uid() = provider_id 
            OR auth.uid() = (SELECT client_id FROM public.jobs WHERE jobs.id = job_applications.job_id)
        );
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'Users can delete own job applications'
        AND tablename = 'job_applications'
    ) THEN
        CREATE POLICY "Users can delete own job applications" ON public.job_applications
        FOR DELETE
        USING (auth.uid() = provider_id);
    END IF;
END $$;

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
    END IF;
END $$;

-- ============================================================================
-- Step 3: Fix Jobs Table Relationships
-- ============================================================================

-- Add FK constraint for client_id if it doesn't exist
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
    END IF;
END $$;

-- Create indexes on jobs for common queries
CREATE INDEX IF NOT EXISTS idx_jobs_client_id ON public.jobs(client_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON public.jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON public.jobs(created_at DESC);

-- Create RLS policies for jobs table if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'Users can read all jobs'
        AND tablename = 'jobs'
    ) THEN
        CREATE POLICY "Users can read all jobs" ON public.jobs
        FOR SELECT
        USING (true);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'Users can insert own jobs'
        AND tablename = 'jobs'
    ) THEN
        CREATE POLICY "Users can insert own jobs" ON public.jobs
        FOR INSERT
        WITH CHECK (auth.uid() = client_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'Users can update own jobs'
        AND tablename = 'jobs'
    ) THEN
        CREATE POLICY "Users can update own jobs" ON public.jobs
        FOR UPDATE
        USING (auth.uid() = client_id)
        WITH CHECK (auth.uid() = client_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'Users can delete own jobs'
        AND tablename = 'jobs'
    ) THEN
        CREATE POLICY "Users can delete own jobs" ON public.jobs
        FOR DELETE
        USING (auth.uid() = client_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'Service role full access to jobs'
        AND tablename = 'jobs'
    ) THEN
        CREATE POLICY "Service role full access to jobs" ON public.jobs
        FOR ALL
        USING (auth.role() = 'service_role')
        WITH CHECK (auth.role() = 'service_role');
    END IF;
END $$;

COMMIT;

-- ============================================================================
-- Verification
-- ============================================================================
SELECT 'All table relationships configured!' AS status;

-- Check services foreign keys
SELECT 
  constraint_name,
  table_name,
  column_name
FROM information_schema.key_column_usage
WHERE table_name = 'services'
AND constraint_name LIKE '%_fkey'
ORDER BY column_name;

-- Check job_applications foreign keys
SELECT 
  constraint_name,
  table_name,
  column_name
FROM information_schema.key_column_usage
WHERE table_name = 'job_applications'
AND constraint_name LIKE '%_fkey'
ORDER BY column_name;

-- Check jobs foreign keys
SELECT 
  constraint_name,
  table_name,
  column_name
FROM information_schema.key_column_usage
WHERE table_name = 'jobs'
AND constraint_name LIKE '%_fkey'
ORDER BY column_name;

-- Check all indexes
SELECT 
  tablename,
  indexname
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('services', 'job_applications', 'jobs')
ORDER BY tablename, indexname;

-- Check RLS policies count
SELECT 
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE tablename IN ('services', 'job_applications', 'jobs')
GROUP BY tablename
ORDER BY tablename;
