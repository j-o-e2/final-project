-- ============================================================================
-- QUICK FIX: Remove Duplicate Emails from Profiles Table
-- ============================================================================
-- Copy and paste this ENTIRE file into Supabase SQL Editor
-- No need to run line by line - execute the whole thing
-- ============================================================================

BEGIN;

-- STEP 1: Show duplicates (informational - see what will be deleted)
-- Uncomment to see duplicates before deleting
-- SELECT email, COUNT(*) as count 
-- FROM public.profiles 
-- WHERE email IS NOT NULL 
-- GROUP BY email 
-- HAVING COUNT(*) > 1
-- ORDER BY count DESC;

-- STEP 2: DELETE all but the oldest profile for each email
DELETE FROM public.profiles p1
WHERE EXISTS (
  SELECT 1 FROM public.profiles p2
  WHERE p1.email = p2.email
  AND p1.email IS NOT NULL
  AND p2.created_at < p1.created_at
);

-- STEP 3: Ensure UNIQUE constraint exists
-- Drop and recreate to ensure it's correct
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_email_key;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_email_key UNIQUE (email);

-- STEP 4: Create index for email lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- STEP 5: Commit the changes
COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES (run these separately to confirm the fix)
-- ============================================================================

-- Check no duplicates remain
-- SELECT email, COUNT(*) as count 
-- FROM public.profiles 
-- WHERE email IS NOT NULL 
-- GROUP BY email 
-- HAVING COUNT(*) > 1;

-- See all profiles
-- SELECT id, email, full_name, role, created_at 
-- FROM public.profiles 
-- ORDER BY created_at DESC;

-- Count total profiles
-- SELECT COUNT(*) as total_profiles FROM public.profiles;
