-- Migration: allow 'admin' as a valid value for profiles.role
-- Run this in Supabase SQL editor or psql as a privileged user.

BEGIN;

-- Drop the existing check constraint (name may differ; this uses the commonly-seen name).
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Recreate the check constraint to include 'admin'
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role = ANY (ARRAY['worker'::text, 'client'::text, 'admin'::text]));

COMMIT;

-- After running this migration you can safely update profiles.role to 'admin'.
-- Example:
-- UPDATE public.profiles SET role = 'admin' WHERE email = 'your-email@example.com';
