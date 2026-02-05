-- 001_ensure_profiles_schema.sql
-- Non-destructive schema updates to ensure `public.profiles` has the expected columns, indexes and RLS policies.
-- This file is safe to run against a database that already has data in `profiles`.

-- 1) Create table if it does not exist (non-destructive)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE,
  full_name TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'client', -- 'worker' | 'client' | 'admin'
  avatar_url TEXT,
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2) Add any missing columns (safe, will not modify existing data)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'client';
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 3) Create indexes if missing
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- 4) Enable RLS if not already enabled (safe)
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;

-- 5) Create or replace minimal, non-destructive policies.
-- We drop and recreate these policies because CREATE POLICY IF NOT EXISTS isn't supported.

-- Allow users to read their own profile
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- Allow users to insert their own profile
DROP POLICY IF EXISTS "Users can create own profile" ON public.profiles;
CREATE POLICY "Users can create own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Allow users to update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Allow admins or service role to manage all profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR ALL USING (
    (auth.role() = 'service_role')
  ) WITH CHECK (
    (auth.role() = 'service_role')
  );

-- 6) Note for operators
-- If the table already exists and has a different primary key or constraints, do NOT run DROP TABLE.
-- Instead review the table manually and, if needed, adjust constraints carefully. This script avoids destructive operations.
