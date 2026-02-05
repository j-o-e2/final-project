-- QUICK FIX: Copy and paste this into Supabase SQL Editor
-- This fixes the infinite recursion error in the profiles table RLS

-- Step 1: Drop the problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;  
DROP POLICY IF EXISTS "User can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Step 2: Create a simple policy that doesn't cause recursion
-- Users can only read their own profile
CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Step 3: Verify it worked
-- Run this query to test - it should return 1 row (your own profile)
-- SELECT id, email, role FROM public.profiles WHERE auth.uid() = id;
