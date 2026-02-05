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
--   - First run CLEANUP_ORPHANED_DATA.sql to delete them.
-- ============================================================================

BEGIN;

-- =========================
-- 0) Drop existing FK constraints and indexes (if any)
-- =========================
-- We drop constraints/indexes first so we can recreate them cleanly.
-- THIS IS DESTRUCTIVE: ensure you have backups and have run
-- `CLEANUP_ORPHANED_DATA.sql` before running this script.

-- Diagnostics: report orphan counts before modifying constraints
DO $$
DECLARE
  cnt_jobs_orphans int := 0;
  cnt_ja_provider_orphans int := 0;
  cnt_ja_job_orphans int := 0;
  cnt_services_orphans int := 0;
BEGIN
  EXECUTE 'SELECT count(*) FROM public.jobs j LEFT JOIN public.profiles p ON j.client_id = p.id WHERE j.client_id IS NOT NULL AND p.id IS NULL' INTO cnt_jobs_orphans;
  EXECUTE 'SELECT count(*) FROM public.job_applications ja LEFT JOIN public.profiles p ON ja.provider_id = p.id WHERE ja.provider_id IS NOT NULL AND p.id IS NULL' INTO cnt_ja_provider_orphans;
  EXECUTE 'SELECT count(*) FROM public.job_applications ja LEFT JOIN public.jobs j ON ja.job_id = j.id WHERE ja.job_id IS NOT NULL AND j.id IS NULL' INTO cnt_ja_job_orphans;
  EXECUTE 'SELECT count(*) FROM public.services s LEFT JOIN public.profiles p ON s.provider_id = p.id WHERE s.provider_id IS NOT NULL AND p.id IS NULL' INTO cnt_services_orphans;

  RAISE NOTICE 'Orphan counts before changes: jobs=% , job_applications(provider)=% , job_applications(job)=% , services=%', cnt_jobs_orphans, cnt_ja_provider_orphans, cnt_ja_job_orphans, cnt_services_orphans;

  IF cnt_jobs_orphans > 0 OR cnt_ja_provider_orphans > 0 OR cnt_ja_job_orphans > 0 OR cnt_services_orphans > 0 THEN
    RAISE WARNING 'Orphaned rows detected. Please run CLEANUP_ORPHANED_DATA.sql before adding constraints. Proceeding may fail.';
  END IF;
END $$;

-- Drop constraints/indexes with notices
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'job_applications_provider_id_fkey' AND table_name = 'job_applications') THEN
    EXECUTE 'ALTER TABLE public.job_applications DROP CONSTRAINT job_applications_provider_id_fkey';
    RAISE NOTICE 'Dropped constraint job_applications_provider_id_fkey';
  ELSE
    RAISE NOTICE 'Constraint job_applications_provider_id_fkey not present';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'job_applications_job_id_fkey' AND table_name = 'job_applications') THEN
    EXECUTE 'ALTER TABLE public.job_applications DROP CONSTRAINT job_applications_job_id_fkey';
    RAISE NOTICE 'Dropped constraint job_applications_job_id_fkey';
  ELSE
    RAISE NOTICE 'Constraint job_applications_job_id_fkey not present';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'jobs_client_id_fkey' AND table_name = 'jobs') THEN
    EXECUTE 'ALTER TABLE public.jobs DROP CONSTRAINT jobs_client_id_fkey';
    RAISE NOTICE 'Dropped constraint jobs_client_id_fkey';
  ELSE
    RAISE NOTICE 'Constraint jobs_client_id_fkey not present';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'services_provider_id_fkey' AND table_name = 'services') THEN
    EXECUTE 'ALTER TABLE public.services DROP CONSTRAINT services_provider_id_fkey';
    RAISE NOTICE 'Dropped constraint services_provider_id_fkey';
  ELSE
    RAISE NOTICE 'Constraint services_provider_id_fkey not present';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'bookings_client_id_fkey' AND table_name = 'bookings') THEN
    EXECUTE 'ALTER TABLE public.bookings DROP CONSTRAINT bookings_client_id_fkey';
    RAISE NOTICE 'Dropped constraint bookings_client_id_fkey';
  ELSE
    RAISE NOTICE 'Constraint bookings_client_id_fkey not present';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_jobs_client_id') THEN
    EXECUTE 'DROP INDEX public.idx_jobs_client_id';
    RAISE NOTICE 'Dropped index idx_jobs_client_id';
  ELSE
    RAISE NOTICE 'Index idx_jobs_client_id not present';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_job_applications_provider_id') THEN
    EXECUTE 'DROP INDEX public.idx_job_applications_provider_id';
    RAISE NOTICE 'Dropped index idx_job_applications_provider_id';
  ELSE
    RAISE NOTICE 'Index idx_job_applications_provider_id not present';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_job_applications_job_id') THEN
    EXECUTE 'DROP INDEX public.idx_job_applications_job_id';
    RAISE NOTICE 'Dropped index idx_job_applications_job_id';
  ELSE
    RAISE NOTICE 'Index idx_job_applications_job_id not present';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_services_provider_id') THEN
    EXECUTE 'DROP INDEX public.idx_services_provider_id';
    RAISE NOTICE 'Dropped index idx_services_provider_id';
  ELSE
    RAISE NOTICE 'Index idx_services_provider_id not present';
  END IF;
END $$;

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

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='bookings' AND column_name='client_id'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'bookings_client_id_fkey' AND table_name = 'bookings') THEN
        EXECUTE 'ALTER TABLE public.bookings ADD CONSTRAINT bookings_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.profiles(id) ON DELETE CASCADE';
        RAISE NOTICE 'Added constraint bookings_client_id_fkey';
    ELSE
      RAISE NOTICE 'Constraint bookings_client_id_fkey already exists';
    END IF;
  ELSE
    RAISE NOTICE 'Column bookings.client_id does not exist, skipping';
  END IF;
END $$;

-- messages -> profiles (sender_id, recipient_id)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='messages' AND column_name='sender_id'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'messages_sender_id_fkey' AND table_name = 'messages') THEN
        EXECUTE 'ALTER TABLE public.messages ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE';
        RAISE NOTICE 'Added constraint messages_sender_id_fkey';
    ELSE
      RAISE NOTICE 'Constraint messages_sender_id_fkey already exists';
    END IF;
  ELSE
    RAISE NOTICE 'Column messages.sender_id does not exist, skipping';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='messages' AND column_name='recipient_id'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'messages_recipient_id_fkey' AND table_name = 'messages') THEN
        EXECUTE 'ALTER TABLE public.messages ADD CONSTRAINT messages_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES public.profiles(id) ON DELETE CASCADE';
        RAISE NOTICE 'Added constraint messages_recipient_id_fkey';
    ELSE
      RAISE NOTICE 'Constraint messages_recipient_id_fkey already exists';
    END IF;
  ELSE
    RAISE NOTICE 'Column messages.recipient_id does not exist, skipping';
  END IF;
END $$;

-- reviews -> profiles/jobs/bookings (reviewer_id, reviewee_id, job_id, booking_id)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='reviews' AND column_name='reviewer_id'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'reviews_reviewer_id_fkey' AND table_name = 'reviews') THEN
        EXECUTE 'ALTER TABLE public.reviews ADD CONSTRAINT reviews_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES public.profiles(id) ON DELETE CASCADE';
        RAISE NOTICE 'Added constraint reviews_reviewer_id_fkey';
    ELSE
      RAISE NOTICE 'Constraint reviews_reviewer_id_fkey already exists';
    END IF;
  ELSE
    RAISE NOTICE 'Column reviews.reviewer_id does not exist, skipping';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='reviews' AND column_name='reviewee_id'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'reviews_reviewee_id_fkey' AND table_name = 'reviews') THEN
        EXECUTE 'ALTER TABLE public.reviews ADD CONSTRAINT reviews_reviewee_id_fkey FOREIGN KEY (reviewee_id) REFERENCES public.profiles(id) ON DELETE CASCADE';
        RAISE NOTICE 'Added constraint reviews_reviewee_id_fkey';
    ELSE
      RAISE NOTICE 'Constraint reviews_reviewee_id_fkey already exists';
    END IF;
  ELSE
    RAISE NOTICE 'Column reviews.reviewee_id does not exist, skipping';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='reviews' AND column_name='job_id'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'reviews_job_id_fkey' AND table_name = 'reviews') THEN
        EXECUTE 'ALTER TABLE public.reviews ADD CONSTRAINT reviews_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE SET NULL';
        RAISE NOTICE 'Added constraint reviews_job_id_fkey';
    ELSE
      RAISE NOTICE 'Constraint reviews_job_id_fkey already exists';
    END IF;
  ELSE
    RAISE NOTICE 'Column reviews.job_id does not exist, skipping';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='reviews' AND column_name='booking_id'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'reviews_booking_id_fkey' AND table_name = 'reviews') THEN
        EXECUTE 'ALTER TABLE public.reviews ADD CONSTRAINT reviews_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE SET NULL';
        RAISE NOTICE 'Added constraint reviews_booking_id_fkey';
    ELSE
      RAISE NOTICE 'Constraint reviews_booking_id_fkey already exists';
    END IF;
  ELSE
    RAISE NOTICE 'Column reviews.booking_id does not exist, skipping';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='reviews' AND column_name='client_id'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'reviews_client_id_fkey' AND table_name = 'reviews') THEN
        EXECUTE 'ALTER TABLE public.reviews ADD CONSTRAINT reviews_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.profiles(id) ON DELETE CASCADE';
        RAISE NOTICE 'Added constraint reviews_client_id_fkey';
    ELSE
      RAISE NOTICE 'Constraint reviews_client_id_fkey already exists';
    END IF;
  ELSE
    RAISE NOTICE 'Column reviews.client_id does not exist, skipping';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='reviews' AND column_name='provider_id'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'reviews_provider_id_fkey' AND table_name = 'reviews') THEN
        EXECUTE 'ALTER TABLE public.reviews ADD CONSTRAINT reviews_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.profiles(id) ON DELETE CASCADE';
        RAISE NOTICE 'Added constraint reviews_provider_id_fkey';
    ELSE
      RAISE NOTICE 'Constraint reviews_provider_id_fkey already exists';
    END IF;
  ELSE
    RAISE NOTICE 'Column reviews.provider_id does not exist, skipping';
  END IF;
END $$;

-- =========================
-- 2) Create helpful indexes
-- =========================
CREATE INDEX IF NOT EXISTS idx_jobs_client_id ON public.jobs(client_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_provider_id ON public.job_applications(provider_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_job_id ON public.job_applications(job_id);
CREATE INDEX IF NOT EXISTS idx_services_provider_id ON public.services(provider_id);
CREATE INDEX IF NOT EXISTS idx_bookings_client_id ON public.bookings(client_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON public.messages(recipient_id);

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
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='bookings') THEN
    EXECUTE 'ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='messages') THEN
    EXECUTE 'ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY';
  END IF;
END $$;

-- Jobs: allow owners to read/insert/update/delete own jobs
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Owners can read own jobs' AND tablename = 'jobs') THEN
    RAISE NOTICE 'Job owner policies already exist';
  ELSE
    -- Select uses client_id
    CREATE POLICY "Owners can read own jobs" ON public.jobs FOR SELECT
      USING ( auth.uid() = client_id OR auth.role() = 'service_role');

    CREATE POLICY "Owners can insert jobs" ON public.jobs FOR INSERT
      WITH CHECK ( auth.uid() = client_id OR auth.role() = 'service_role');

    CREATE POLICY "Owners can update own jobs" ON public.jobs FOR UPDATE
      USING ( auth.uid() = client_id OR auth.role() = 'service_role')
      WITH CHECK ( auth.uid() = client_id OR auth.role() = 'service_role');

    CREATE POLICY "Owners can delete own jobs" ON public.jobs FOR DELETE
      USING ( auth.uid() = client_id OR auth.role() = 'service_role');
  END IF;
END $$;

-- Job applications: allow providers to read/insert their applications and allow job owners to read applications for their jobs
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Providers or job owners can read job_applications' AND tablename = 'job_applications') THEN
    CREATE POLICY "Providers or job owners can read job_applications" ON public.job_applications FOR SELECT
      USING ( auth.uid() = provider_id OR auth.uid() = (SELECT client_id FROM public.jobs WHERE jobs.id = job_applications.job_id) OR auth.role() = 'service_role');
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

-- Bookings: allow clients to read their bookings
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Clients can read own bookings' AND tablename = 'bookings') THEN
    CREATE POLICY "Clients can read own bookings" ON public.bookings FOR SELECT
      USING ( auth.uid() = client_id OR auth.role() = 'service_role');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Clients can insert bookings' AND tablename = 'bookings') THEN
    CREATE POLICY "Clients can insert bookings" ON public.bookings FOR INSERT
      WITH CHECK ( auth.uid() = client_id OR auth.role() = 'service_role');
  END IF;
END $$;

-- Messages: allow sender/recipient to read messages, sender to insert
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Sender or recipient can read messages' AND tablename = 'messages') THEN
    CREATE POLICY "Sender or recipient can read messages" ON public.messages FOR SELECT
      USING ( auth.uid() = sender_id OR auth.uid() = recipient_id OR auth.role() = 'service_role');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Sender can insert messages' AND tablename = 'messages') THEN
    CREATE POLICY "Sender can insert messages" ON public.messages FOR INSERT
      WITH CHECK ( auth.uid() = sender_id OR auth.role() = 'service_role');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Sender can update own messages' AND tablename = 'messages') THEN
    CREATE POLICY "Sender can update own messages" ON public.messages FOR UPDATE
      USING ( auth.uid() = sender_id OR auth.role() = 'service_role')
      WITH CHECK ( auth.uid() = sender_id OR auth.role() = 'service_role');
  END IF;
END $$;

-- Reviews: enable RLS and allow reviewers to insert and read reviews
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='reviews') THEN
    EXECUTE 'ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can read reviews' AND tablename = 'reviews') THEN
    CREATE POLICY "Anyone can read reviews" ON public.reviews FOR SELECT
      USING ( auth.role() = 'authenticated' OR auth.role() = 'service_role' );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can insert reviews' AND tablename = 'reviews') THEN
    CREATE POLICY "Authenticated users can insert reviews" ON public.reviews FOR INSERT
      WITH CHECK ( auth.uid() = reviewer_id OR auth.role() = 'service_role' );
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
SELECT 'FIX_TABLE_RELATIONSHIPS_SAFE.sql completed successfully!' AS status;
SELECT 'Clients can now create jobs and see them in their dashboard.' AS next_step;
SELECT 'Workers can now create services and see them in their dashboard.' AS next_step2;
