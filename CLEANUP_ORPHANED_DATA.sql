-- ============================================================================
-- CLEANUP_ORPHANED_DATA.sql
-- ============================================================================
-- Removes rows with orphaned foreign-key references so FK constraints can be added.
-- 
-- This script:
-- 1) Deletes job_applications referencing non-existent jobs
-- 2) Deletes job_applications with provider_id not in profiles
-- 3) Deletes services with provider_id not in profiles
-- 4) Deletes jobs with client_id not in profiles
--
-- Run this FIRST, then run FIX_TABLE_RELATIONSHIPS_SAFE.sql
-- ============================================================================

BEGIN;

-- =========================
-- Step 1: Delete orphaned job_applications
-- =========================

-- job_applications referencing non-existent jobs
DO $$
BEGIN
  DELETE FROM public.job_applications
  WHERE job_id IS NOT NULL 
    AND NOT EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_applications.job_id);
  RAISE NOTICE 'Deleted job_applications with non-existent job_id';
END $$;

-- job_applications with provider_id not in profiles
DO $$
BEGIN
  DELETE FROM public.job_applications
  WHERE provider_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = job_applications.provider_id);
  RAISE NOTICE 'Deleted job_applications with non-existent provider_id';
END $$;

-- =========================
-- Step 2: Delete orphaned services
-- =========================

DO $$
BEGIN
  DELETE FROM public.services
  WHERE provider_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = services.provider_id);
  RAISE NOTICE 'Deleted services with non-existent provider_id';
END $$;

-- =========================
-- Step 3: Delete orphaned jobs
-- =========================

DO $$
BEGIN
  DELETE FROM public.jobs
  WHERE client_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = jobs.client_id);
  RAISE NOTICE 'Deleted jobs with non-existent client_id';
END $$;

COMMIT;

-- =========================
-- Verification: show remaining orphaned references
-- =========================

SELECT '=== VERIFICATION: Remaining Orphaned References ===' AS section;

SELECT COUNT(*) as orphaned_job_applications_by_job_id
FROM public.job_applications
WHERE job_id IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_applications.job_id);

SELECT COUNT(*) as orphaned_job_applications_by_provider_id
FROM public.job_applications
WHERE provider_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = job_applications.provider_id);

SELECT COUNT(*) as orphaned_services_by_provider_id
FROM public.services
WHERE provider_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = services.provider_id);

SELECT COUNT(*) as orphaned_jobs_by_client_id
FROM public.jobs
WHERE client_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = jobs.client_id);

SELECT '' AS blank;
SELECT 'CLEANUP_ORPHANED_DATA.sql completed.' AS status;
SELECT 'If any counts above are > 0, there are still orphaned rows. Review and delete manually if needed.' AS note;
SELECT 'Next: Run FIX_TABLE_RELATIONSHIPS_SAFE.sql' AS next_step;
