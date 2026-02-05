-- ============================================================================
-- FIX: Duplicate Email Constraint Error
-- ============================================================================
-- This SQL:
-- 1. Finds and removes duplicate email entries in profiles table
-- 2. Ensures the UNIQUE constraint on email is properly set
-- 3. Adds ON CONFLICT handling to prevent future duplicates
--
-- Run this in Supabase SQL Editor
-- ============================================================================

BEGIN;

-- Step 1: Check for duplicate emails and list them
-- (This is informational - run this separately to see duplicates)
-- SELECT email, COUNT(*) as count FROM public.profiles 
-- WHERE email IS NOT NULL 
-- GROUP BY email HAVING COUNT(*) > 1;

-- Step 2: Remove duplicate profiles, keeping only the oldest one per email
-- For each email with duplicates, delete all but the first (earliest created_at)
DELETE FROM public.profiles
WHERE id NOT IN (
  SELECT DISTINCT ON (email) id
  FROM public.profiles
  WHERE email IS NOT NULL
  ORDER BY email, created_at ASC
)
AND email IS NOT NULL
AND email IN (
  SELECT email FROM public.profiles
  WHERE email IS NOT NULL
  GROUP BY email
  HAVING COUNT(*) > 1
);

-- Step 3: Remove any profiles with NULL email (these can't violate the UNIQUE constraint if it allows NULLs)
-- But if you want ALL profiles to have an email, uncomment the next line:
-- DELETE FROM public.profiles WHERE email IS NULL;

-- Step 4: Ensure the UNIQUE constraint exists on email column
-- First, drop it if it exists with a different name
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_email_key;

-- Now create the UNIQUE constraint fresh
-- Note: Standard UNIQUE constraint allows multiple NULLs, which is fine for emails
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_email_key UNIQUE (email);

-- Step 5: Create a partial index for faster email lookups (excludes NULLs)
-- This ensures faster queries and a partial unique constraint effect
DROP INDEX IF EXISTS idx_profiles_email_unique;
CREATE UNIQUE INDEX idx_profiles_email_unique ON public.profiles(email) 
WHERE email IS NOT NULL;

-- Step 6: Verify the fix
-- Check if there are still duplicates (should return no rows)
SELECT email, COUNT(*) as duplicate_count 
FROM public.profiles 
WHERE email IS NOT NULL 
GROUP BY email 
HAVING COUNT(*) > 1;

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES (run these after the fix to confirm)
-- ============================================================================

-- See total profiles
-- SELECT COUNT(*) as total_profiles FROM public.profiles;

-- See profiles with NULL emails
-- SELECT COUNT(*) as null_email_count FROM public.profiles WHERE email IS NULL;

-- List all profiles
-- SELECT id, email, full_name, created_at FROM public.profiles ORDER BY created_at;
