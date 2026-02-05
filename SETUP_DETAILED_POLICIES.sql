-- ============================================================================
-- Setup Detailed RLS Policies for Jobs, Services, Job Applications
-- ============================================================================
-- Run AFTER profiles RLS and FK constraints are in place.
-- Ensures clients can view/manage their own jobs; workers can view/manage
-- their own services and their job applications. Service role has full access.
-- ============================================================================

BEGIN;

-- Jobs policies: explicit, non-recursive
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Clients can read own jobs' AND tablename = 'jobs') THEN
    CREATE POLICY "Clients can read own jobs" ON public.jobs
      FOR SELECT
      USING (auth.uid() = client_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Clients can insert jobs' AND tablename = 'jobs') THEN
    CREATE POLICY "Clients can insert jobs" ON public.jobs
      FOR INSERT
      WITH CHECK (auth.uid() = client_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Clients can update own jobs' AND tablename = 'jobs') THEN
    CREATE POLICY "Clients can update own jobs" ON public.jobs
      FOR UPDATE
      USING (auth.uid() = client_id)
      WITH CHECK (auth.uid() = client_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Clients can delete own jobs' AND tablename = 'jobs') THEN
    CREATE POLICY "Clients can delete own jobs" ON public.jobs
      FOR DELETE
      USING (auth.uid() = client_id);
  END IF;
END $$;

-- Workers: allow workers to read all jobs (so they can apply) but not modify
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Workers can read all jobs' AND tablename = 'jobs') THEN
    CREATE POLICY "Workers can read all jobs" ON public.jobs
      FOR SELECT
      USING (auth.role() = 'authenticated' );
  END IF;
END $$;

-- Services policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Workers can read all services' AND tablename = 'services') THEN
    CREATE POLICY "Workers can read all services" ON public.services
      FOR SELECT
      USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Workers can insert services' AND tablename = 'services') THEN
    CREATE POLICY "Workers can insert services" ON public.services
      FOR INSERT
      WITH CHECK (auth.uid() = provider_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Workers can update own services' AND tablename = 'services') THEN
    CREATE POLICY "Workers can update own services" ON public.services
      FOR UPDATE
      USING (auth.uid() = provider_id)
      WITH CHECK (auth.uid() = provider_id);
  END IF;
END $$;

-- Job applications policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Providers can read their job applications' AND tablename = 'job_applications') THEN
    CREATE POLICY "Providers can read their job applications" ON public.job_applications
      FOR SELECT
      USING (auth.uid() = provider_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Clients can read applications for their jobs' AND tablename = 'job_applications') THEN
    CREATE POLICY "Clients can read applications for their jobs" ON public.job_applications
      FOR SELECT
      USING (auth.uid() = (SELECT client_id FROM public.jobs WHERE jobs.id = job_applications.job_id));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Providers can insert job applications' AND tablename = 'job_applications') THEN
    CREATE POLICY "Providers can insert job applications" ON public.job_applications
      FOR INSERT
      WITH CHECK (auth.uid() = provider_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Providers can update own job applications' AND tablename = 'job_applications') THEN
    CREATE POLICY "Providers can update own job applications" ON public.job_applications
      FOR UPDATE
      USING (auth.uid() = provider_id)
      WITH CHECK (auth.uid() = provider_id);
  END IF;
END $$;

-- Service role full access (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access to jobs' AND tablename = 'jobs') THEN
    CREATE POLICY "Service role full access to jobs" ON public.jobs
      FOR ALL
      USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access to services' AND tablename = 'services') THEN
    CREATE POLICY "Service role full access to services" ON public.services
      FOR ALL
      USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access to job_applications' AND tablename = 'job_applications') THEN
    CREATE POLICY "Service role full access to job_applications" ON public.job_applications
      FOR ALL
      USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

COMMIT;

-- Verification queries
-- SELECT * FROM pg_policies WHERE tablename IN ('jobs','services','job_applications') ORDER BY tablename, policyname;