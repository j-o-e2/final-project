-- Migration: add contact reveal columns (if missing), backfill, and create corrected RLS policy
BEGIN;

-- 1) Add reveal columns if they don't exist
ALTER TABLE IF EXISTS public.job_applications
  ADD COLUMN IF NOT EXISTS client_contact_revealed BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE IF EXISTS public.bookings
  ADD COLUMN IF NOT EXISTS provider_contact_revealed BOOLEAN NOT NULL DEFAULT FALSE;

-- 2) Backfill existing accepted/approved rows so current relationships reveal contact
UPDATE public.job_applications
SET client_contact_revealed = TRUE
WHERE status = 'accepted';

UPDATE public.bookings
SET provider_contact_revealed = TRUE
WHERE status IN ('approved', 'accepted');

-- 3) Ensure RLS on profiles and create a SELECT policy that uses the correct jobs poster column
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;

-- Create the SELECT policy dynamically depending on whether the jobs table uses
-- `client_id` or `poster_id` as the column that references the profile who posted the job.
DO $$
DECLARE
  job_poster_col TEXT;
  sql TEXT;
BEGIN
  SELECT column_name INTO job_poster_col
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'jobs' AND column_name IN ('client_id', 'poster_id')
  LIMIT 1;

  IF job_poster_col IS NULL THEN
    RAISE EXCEPTION 'Neither client_id nor poster_id column found on public.jobs';
  END IF;

  -- Build the CREATE POLICY statement using the detected column name
  -- Auto-reveal: contact details visible after acceptance (no separate reveal flag check needed)
  sql := format($pol$
    CREATE POLICY profiles_contact_reveal_access
      ON public.profiles
      FOR SELECT
      USING (
        auth.uid() = id
        OR EXISTS (
          SELECT 1 FROM public.job_applications ja
          JOIN public.jobs j ON j.id = ja.job_id
          WHERE (
            (ja.provider_id = auth.uid() AND j.%I = public.profiles.id AND ja.status = 'accepted')
            OR (j.%I = auth.uid() AND ja.provider_id = public.profiles.id AND ja.status = 'accepted')
          )
        )
        OR EXISTS (
          SELECT 1 FROM public.bookings b
          JOIN public.services s ON s.id = b.service_id
          WHERE (
            (b.client_id = auth.uid() AND s.provider_id = public.profiles.id AND b.status IN ('approved','accepted'))
            OR (s.provider_id = auth.uid() AND b.client_id = public.profiles.id AND b.status IN ('approved','accepted'))
          )
        )
      );
  $pol$, job_poster_col, job_poster_col);

  EXECUTE 'DROP POLICY IF EXISTS profiles_contact_reveal_access ON public.profiles';
  EXECUTE sql;
END
$$;

-- 4) Ensure providers can set `client_contact_revealed` on their own applications
-- This policy is explicit and avoids referencing the jobs table column name.
ALTER TABLE IF EXISTS public.job_applications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS job_applications_provider_reveal ON public.job_applications;
CREATE POLICY job_applications_provider_reveal
  ON public.job_applications
  FOR UPDATE
  USING (auth.uid() = provider_id)
  WITH CHECK (auth.uid() = provider_id);

COMMIT;
