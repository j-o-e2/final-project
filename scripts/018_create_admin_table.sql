-- Migration: Drop and recreate admins table with RLS policies

-- Drop existing admins table if it exists
DROP TABLE IF EXISTS admins;

-- Create admins table
CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admins_profile_id ON admins(profile_id);

-- Enable Row Level Security
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admins table
-- Allow SELECT for authenticated users who are admins
CREATE POLICY "Admins can view admins" ON admins
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Prevent client-side creation/modification/deletion of admin rows.
-- Service-role (server-side) operations bypass RLS when using the service key.
CREATE POLICY "Only service role can insert admins" ON admins
  FOR INSERT WITH CHECK (false);

CREATE POLICY "Only service role can update admins" ON admins
  FOR UPDATE USING (false);

CREATE POLICY "Only service role can delete admins" ON admins
  FOR DELETE USING (false);

-- Optionally: if you want existing admin users to be able to update their own record,
-- you can add a policy like this (commented out by default):
-- CREATE POLICY "Admins can update their own row" ON admins
--   FOR UPDATE
--   TO authenticated
--   USING (profile_id = auth.uid())
--   WITH CHECK (profile_id = auth.uid());

-- End migration
