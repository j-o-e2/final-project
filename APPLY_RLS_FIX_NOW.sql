-- ============================================================================
-- CRITICAL: RLS FIX + AUTO-CREATE TRIGGER FOR PROFILES TABLE
-- ============================================================================
-- This SQL:
-- 1. Fixes infinite recursion error in RLS policies
-- 2. Adds trigger to auto-create profiles when users sign up
-- 3. Allows login, profile reads, email confirmation, and admin dashboard
--
-- HOW TO RUN:
-- 1. Go to Supabase Dashboard → SQL Editor
-- 2. Create a new query
-- 3. Copy and paste the entire content of this file
-- 4. Click "Run"
-- 5. Refresh your app in browser and try signing up / logging in
--
-- ============================================================================

BEGIN;

-- ============================================================================
-- PART 1: FIX RLS POLICIES (remove recursion)
-- ============================================================================

-- Step 1: Disable RLS temporarily to allow policy updates
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL existing policies on profiles (they may have recursion issues)
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can create own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "User can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Service role can do anything" ON public.profiles;
DROP POLICY IF EXISTS "Allow admin access" ON public.profiles;
DROP POLICY IF EXISTS "Service role full access" ON public.profiles;

-- Step 3: Re-enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Step 4: Create simple, non-recursive policies

-- Policy 1: Users can read their own profile (no self-join, no recursion)
CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Policy 2: Users can insert their own profile
CREATE POLICY "Users can create own profile" ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Policy 3: Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy 4: Service role (used by Supabase functions, triggers, admin APIs) can do anything
-- This allows server-side code with service_role key to manage all profiles
CREATE POLICY "Service role full access" ON public.profiles
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================================
-- PART 2: ADD AUTO-CREATE PROFILE TRIGGER ON SIGNUP
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_profile_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'client')
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_profile_on_signup();

COMMIT;

-- Verification queries (optional - run these after to check everything)
-- SELECT * FROM pg_policies WHERE tablename = 'profiles' ORDER BY policyname;
-- SELECT trigger_name, event_manipulation FROM information_schema.triggers WHERE trigger_name = 'on_auth_user_created';

