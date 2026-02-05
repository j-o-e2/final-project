-- ============================================================================
-- COMPLETE RLS POLICY RESET: Drop ALL + Create exactly 4 policies
-- ============================================================================
-- This will:
-- 1. Disable RLS temporarily
-- 2. DROP ALL existing policies (clean slate)
-- 3. Re-enable RLS
-- 4. Create exactly 4 non-recursive policies
-- 5. Show verification output
--
-- Run this SINGLE query in Supabase SQL Editor
--
-- ============================================================================

-- Step 1: Disable RLS (allows clean policy removal)
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Step 2: Get list of all current policies before dropping (for reference)
SELECT 'Current policies before drop:' AS status;
SELECT policyname FROM pg_policies WHERE tablename = 'profiles';

-- Step 3: DROP ALL policies (using dynamic SQL to be thorough)
DO $$
DECLARE
    policy_name TEXT;
BEGIN
    FOR policy_name IN
        SELECT policyname FROM pg_policies WHERE tablename = 'profiles'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_name || '" ON public.profiles';
        RAISE NOTICE 'Dropped policy: %', policy_name;
    END LOOP;
END $$;

-- Step 4: Re-enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Step 5: Create exactly 4 essential RLS policies
-- ============================================================================

-- Policy 1: Users can SELECT/READ their own profile
CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Policy 2: Users can INSERT their own profile
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Policy 3: Users can UPDATE their own profile
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy 4: Service role (backend/API) has full access
CREATE POLICY "Service role full access" ON public.profiles
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================================
-- Verification: Show exactly what was created
-- ============================================================================
SELECT 'Verification - Total policies created:' AS status;
SELECT COUNT(*) as total_policies FROM pg_policies WHERE tablename = 'profiles';

SELECT 'Policy details:' AS status;
SELECT policyname, permissive, roles, qual, with_check 
FROM pg_policies 
WHERE tablename = 'profiles' 
ORDER BY policyname;

SELECT 'RLS Status:' AS status;
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname='public' AND tablename='profiles';
