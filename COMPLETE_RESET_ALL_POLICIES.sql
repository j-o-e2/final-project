-- ============================================================================
-- COMPLETE RESET: Drop ALL policies and recreate fresh
-- ============================================================================
-- This will:
-- 1. Disable RLS temporarily
-- 2. Drop ALL existing policies
-- 3. Re-enable RLS
-- 4. Create fresh non-recursive policies
-- 5. Setup triggers
--
-- Run this SINGLE query in Supabase SQL Editor
--
-- ============================================================================

-- Disable RLS first (allows us to drop all policies cleanly)
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Drop ALL possible policies
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can create own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "User can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Service role can do anything" ON public.profiles;
DROP POLICY IF EXISTS "Allow admin access" ON public.profiles;
DROP POLICY IF EXISTS "Service role full access" ON public.profiles;

-- Re-enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Create FRESH non-recursive policies
-- ============================================================================

CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Service role full access" ON public.profiles
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================================
-- Drop old triggers and functions
-- ============================================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;
DROP FUNCTION IF EXISTS public.create_profile_on_signup();
DROP FUNCTION IF EXISTS public.delete_profile_on_user_delete();

-- ============================================================================
-- Create auto-create profile trigger on signup
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

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_profile_on_signup();

-- ============================================================================
-- Create cascade delete trigger on user delete
-- ============================================================================

CREATE OR REPLACE FUNCTION public.delete_profile_on_user_delete()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.profiles WHERE id = OLD.id;
  RETURN OLD;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error deleting profile for user %: %', OLD.id, SQLERRM;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_deleted
  BEFORE DELETE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.delete_profile_on_user_delete();

-- ============================================================================
-- Drop backup table if it exists
-- ============================================================================

DROP TABLE IF EXISTS public.profiles_backup;

-- ============================================================================
-- DONE! Verify setup below
-- ============================================================================

SELECT 'Profiles table reset complete!' as status;
SELECT COUNT(*) as total_policies FROM pg_policies WHERE tablename = 'profiles';
SELECT trigger_name FROM information_schema.triggers WHERE trigger_name LIKE 'on_auth_user%';
