-- Migration: Add 'rejected' to job_applications.status allowed values with named CHECK constraint
-- This script drops any existing CHECK constraint on job_applications.status that matches the current "status IN (...)" pattern
-- then adds a named constraint `job_applications_status_check` that includes 'rejected'.

BEGIN;

DO $$
DECLARE
  c RECORD;
  def TEXT;
BEGIN
  FOR c IN
    SELECT con.oid, con.conname, pg_get_constraintdef(con.oid) AS def
    FROM pg_constraint con
    WHERE con.conrelid = 'public.job_applications'::regclass
      AND con.contype = 'c'
  LOOP
    -- Only drop constraints that reference the status column in an IN list
    IF c.def ILIKE '%status IN (%' OR c.def ILIKE '%status = ANY(%' THEN
      EXECUTE format('ALTER TABLE public.job_applications DROP CONSTRAINT IF EXISTS %I', c.conname);
    END IF;
  END LOOP;
END$$;

-- Add a named check constraint with the desired allowed values (including 'rejected')
-- Ensure any previously created named constraint is removed so this migration is idempotent
ALTER TABLE public.job_applications
  DROP CONSTRAINT IF EXISTS job_applications_status_check;

ALTER TABLE public.job_applications
  ADD CONSTRAINT job_applications_status_check
  CHECK (status IN ('pending','accepted','rejected','withdrawn'));

COMMIT;

-- Note: If you are running this in an environment where current rows may violate the new constraint,
-- run a quick audit first and update rows as needed before applying the constraint:
-- SELECT id, status FROM public.job_applications WHERE status NOT IN ('pending','accepted','rejected','withdrawn');
-- Update any unexpected statuses to one of the allowed values before applying this migration.
