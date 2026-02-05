-- Migration: ensure jobs.status CHECK constraint allows the correct canonical values
-- This will:
-- 1) Normalize common alias values to canonical names
-- 2) Remove any existing jobs_status_check_new constraint and add a new constraint allowing the canonical list

-- 1) Normalize common aliases and trim whitespace
UPDATE jobs
SET status = lower(trim(status))
WHERE status IS NOT NULL;

UPDATE jobs
SET status = 'closed'
WHERE lower(trim(status)) IN ('close');

UPDATE jobs
SET status = 'completed'
WHERE lower(trim(status)) IN ('complete');

UPDATE jobs
SET status = 'approved'
WHERE lower(trim(status)) IN ('approve');

-- 2) Coerce any unexpected values to 'open' as a safe fallback
UPDATE jobs
SET status = 'open'
WHERE lower(trim(status)) NOT IN ('open','approved','cancelled','rejected','reopen','completed','closed');

-- 3) Replace constraint (drop if exists then add)
ALTER TABLE jobs
  DROP CONSTRAINT IF EXISTS jobs_status_check_new;

ALTER TABLE jobs
  ADD CONSTRAINT jobs_status_check_new
  CHECK (status IN ('open','approved','cancelled','rejected','reopen','completed','closed'));
