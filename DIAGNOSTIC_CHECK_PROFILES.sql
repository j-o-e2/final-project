-- ============================================================================
-- DIAGNOSTIC: Check if profiles table exists and is set up correctly
-- ============================================================================
-- Run this to verify the table exists and has the right structure

-- Check if table exists
SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='profiles') as profiles_table_exists;

-- Check table structure
SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' ORDER BY ordinal_position;

-- Check RLS status
SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE schemaname='public' AND tablename='profiles';

-- Check all policies
SELECT policyname, permissive, roles, qual, with_check FROM pg_policies WHERE tablename='profiles' ORDER BY policyname;

-- Check triggers
SELECT trigger_name, event_manipulation, event_object_table FROM information_schema.triggers WHERE trigger_schema='public' ORDER BY trigger_name;

-- Count profiles
SELECT COUNT(*) as profile_count FROM public.profiles;
