-- 004_add_required_skills.sql
-- Add the `required_skills` column to the `jobs` table if it's missing.
-- This script is idempotent and safe to run multiple times.
-- Run in Supabase SQL editor or via psql. Backup your DB before running in production.

BEGIN;

-- 1) Add column if it does not exist
ALTER TABLE IF EXISTS jobs
  ADD COLUMN IF NOT EXISTS required_skills TEXT[];

-- 2) Initialize existing NULL values to an empty array
UPDATE jobs
SET required_skills = '{}'::text[]
WHERE required_skills IS NULL;

-- 3) Ensure a default (so new inserts without the column get an empty array)
ALTER TABLE jobs
  ALTER COLUMN required_skills SET DEFAULT '{}'::text[];

-- 4) Optionally make it NOT NULL (commented out - enable after you confirm data)
-- ALTER TABLE jobs
--   ALTER COLUMN required_skills SET NOT NULL;

COMMIT;

-- NOTES:
-- - If your RLS policies or insert logic require a specific column name (poster_id vs foreman_id),
--   adjust them consistently. This script only ensures `required_skills` exists as a text[] column.
-- - If you prefer the column to be non-nullable, uncomment the ALTER TABLE ... SET NOT NULL step
--   after verifying no NULLs remain and testing in staging.
