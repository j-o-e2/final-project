-- ============================================================================
-- SAFE RESET: Backup data, drop and recreate profiles table
-- ============================================================================
-- This safely preserves existing profile data while fixing the table
-- Run this if you're still getting "relation profiles does not exist" errors
--
-- HOW TO RUN:
-- 1. Go to Supabase Dashboard → SQL Editor
-- 2. Create a new query
-- 3. Copy and paste this entire file
-- 4. Click "Run"
-- 5. Test signup with a new email
--
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Back up existing profile data to a temporary table
-- ============================================================================
CREATE TABLE public.profiles_backup AS SELECT * FROM public.profiles;

-- ============================================================================
-- STEP 2: Drop all triggers (they reference the old table)
-- ============================================================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;

-- ============================================================================
-- STEP 3: Drop all functions
-- ============================================================================
DROP FUNCTION IF EXISTS public.create_profile_on_signup();
DROP FUNCTION IF EXISTS public.delete_profile_on_user_delete();

-- ============================================================================
-- STEP 4: Drop the old table (but keep the backup)
-- ============================================================================
DROP TABLE IF EXISTS public.profiles CASCADE;

-- ============================================================================
-- STEP 5: Recreate the table from scratch
-- ============================================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'client' CHECK (role IN ('worker', 'client', 'admin')),
  avatar_url TEXT,
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_profiles_role ON public.profiles(role);

-- Grant permissions to anon and authenticated users (important!)
GRANT ALL ON public.profiles TO anon, authenticated;

-- ============================================================================
-- STEP 6: Enable RLS
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 7: Create RLS policies (simple, non-recursive)
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
-- STEP 8: Recreate the auto-create trigger
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
-- STEP 9: Recreate the cascade delete trigger
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
-- STEP 10: Restore the backed-up data (if it exists and is valid)
-- Remove duplicate emails - keep only the most recent profile per email
-- ============================================================================
-- Use a temporary table to deduplicate first, then insert
CREATE TEMP TABLE profiles_deduped AS
SELECT DISTINCT ON (email) id, email, full_name, phone, role, avatar_url, location, created_at, updated_at
FROM public.profiles_backup
ORDER BY email, created_at DESC;

-- Insert deduplicated data, skip any conflicts on id
INSERT INTO public.profiles (id, email, full_name, phone, role, avatar_url, location, created_at, updated_at)
SELECT id, email, full_name, phone, role, avatar_url, location, created_at, updated_at
FROM profiles_deduped
ON CONFLICT (id) DO NOTHING;

-- Clean up temp table
DROP TABLE profiles_deduped;

-- ============================================================================
-- STEP 11: Clean up the backup table (optional - keep for manual review if needed)
-- ============================================================================
-- DROP TABLE public.profiles_backup;
-- If you want to review the backed-up data later, you can query:
-- SELECT * FROM public.profiles_backup;

COMMIT;

-- ============================================================================
-- Verify everything is set up correctly
-- ============================================================================
-- SELECT COUNT(*) as restored_profiles FROM public.profiles;
-- SELECT tablename FROM pg_tables WHERE tablename = 'profiles';
-- SELECT trigger_name FROM information_schema.triggers WHERE trigger_name LIKE 'on_auth_user%';
-- SELECT * FROM pg_policies WHERE tablename = 'profiles';
