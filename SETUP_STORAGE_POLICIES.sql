-- ============================================================================
-- Setup Storage Policies for Avatar Uploads
-- ============================================================================
-- This SQL configures RLS policies for the 'avatars' storage bucket
-- Run this in Supabase SQL Editor to allow authenticated users to upload avatars
--
-- ============================================================================

BEGIN;

-- Step 1: Allow authenticated users to UPLOAD to their own avatar path
CREATE POLICY "Users can upload own avatar" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Step 2: Allow authenticated users to UPDATE their own avatar
CREATE POLICY "Users can update own avatar" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Step 3: Allow authenticated users to DELETE their own avatar
CREATE POLICY "Users can delete own avatar" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Step 4: Allow anyone to VIEW/GET public avatars
CREATE POLICY "Public avatars are viewable" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'avatars'
  );

COMMIT;

-- ============================================================================
-- Verification
-- ============================================================================
SELECT 'Storage policies configured!' AS status;

-- Check storage policies
SELECT 
    policyname,
    permissive,
    cmd
FROM pg_policies
WHERE tablename = 'objects'
AND schemaname = 'storage'
ORDER BY policyname;
