-- ============================================================================
-- STEP 2: CREATE NEW POLICIES + TRIGGERS (Run this SECOND)
-- ============================================================================
-- Run this AFTER you've successfully run STEP_1_DROP_POLICIES.sql

BEGIN;

-- ============================================================================
-- Enable RLS
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Create simple, non-recursive RLS policies
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
-- Drop old triggers if they exist
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
-- Drop the backup table if it exists
-- ============================================================================
DROP TABLE IF EXISTS public.profiles_backup;

COMMIT;

-- ============================================================================
-- Verification (optional - run these to verify setup)
-- ============================================================================
-- SELECT COUNT(*) FROM public.profiles;
-- SELECT * FROM pg_policies WHERE tablename = 'profiles';
-- SELECT trigger_name FROM information_schema.triggers WHERE trigger_name LIKE 'on_auth_user%';
