-- ============================================================================
-- FIX_POPULATE_PROFILE_ROLES.sql
-- Populate `profiles.role` for existing users based on data in other tables.
-- Run this in Supabase SQL Editor.
-- ============================================================================

BEGIN;

-- 1) Set 'client' for any profile with jobs.client_id
UPDATE public.profiles p
SET role = 'client'
FROM (
  SELECT DISTINCT client_id AS id FROM public.jobs WHERE client_id IS NOT NULL
) j
WHERE p.id = j.id
  AND (p.role IS NULL OR p.role = '');

-- 2) Set 'worker' for any profile with services.provider_id or job_applications.provider_id
UPDATE public.profiles p
SET role = 'worker'
FROM (
  SELECT DISTINCT provider_id AS id FROM public.services WHERE provider_id IS NOT NULL
  UNION
  SELECT DISTINCT provider_id AS id FROM public.job_applications WHERE provider_id IS NOT NULL
) s
WHERE p.id = s.id
  AND (p.role IS NULL OR p.role = '');

-- 3) If profile exists in admin_users, set role = 'admin'
UPDATE public.profiles p
SET role = 'admin'
FROM public.admin_users au
WHERE p.id = au.user_id
  AND (p.role IS NULL OR p.role = '');

-- 4) For any remaining NULL roles, default to 'client'
UPDATE public.profiles
SET role = 'client'
WHERE role IS NULL OR role = '';

COMMIT;

-- Verification
SELECT id, full_name, role FROM public.profiles ORDER BY role NULLS LAST, full_name LIMIT 200;