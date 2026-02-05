-- Migration: allow 'admin' users to view jobs and job_applications via RLS
-- Run this in Supabase SQL editor or psql as a privileged user.

BEGIN;

-- Jobs: drop existing select policy and recreate to include admins
DROP POLICY IF EXISTS "Anyone can view open jobs" ON public.jobs;

CREATE POLICY "Anyone can view open jobs" ON public.jobs
  FOR SELECT
  USING (
    status = 'open'
    OR auth.uid() = client_id
    OR EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Job applications: drop existing select policy and recreate to include admins
DROP POLICY IF EXISTS "Users can view their own job_applications" ON public.job_applications;

CREATE POLICY "Users can view their own job_applications" ON public.job_applications
  FOR SELECT
  USING (
    auth.uid() = provider_id
    OR auth.uid() IN (SELECT client_id FROM public.jobs WHERE id = job_id)
    OR EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

COMMIT;

-- After running this migration, authenticated users whose profile.role = 'admin' will be
-- allowed to SELECT across the jobs and job_applications tables (for admin dashboard use).
