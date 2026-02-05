-- ============================================================================
-- Fix Reviews Table Relationships
-- ============================================================================
-- This SQL ensures the reviews table has proper foreign keys and relationships
-- to the profiles table for both reviewer_id and client_id
--
-- Run this in Supabase SQL Editor
--
-- ============================================================================

BEGIN;

-- Step 1: Check if reviews table exists and has the necessary columns
-- The reviews table should have:
-- - id (uuid primary key)
-- - reviewer_id (uuid, FK to profiles.id)
-- - reviewee_id (uuid, FK to profiles.id) 
-- - client_id (uuid, FK to profiles.id) - person who hired/booked
-- - provider_id (uuid, FK to profiles.id) - person who provided service
-- - rating (integer)
-- - comment (text)
-- - booking_id (uuid, optional)
-- - job_id (uuid, optional)
-- - created_at (timestamp)

-- Step 2: Add foreign keys if they don't exist
-- For reviewer_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'reviews_reviewer_id_fkey'
        AND table_name = 'reviews'
    ) THEN
        ALTER TABLE public.reviews 
        ADD CONSTRAINT reviews_reviewer_id_fkey 
        FOREIGN KEY (reviewer_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- For reviewee_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'reviews_reviewee_id_fkey'
        AND table_name = 'reviews'
    ) THEN
        ALTER TABLE public.reviews 
        ADD CONSTRAINT reviews_reviewee_id_fkey 
        FOREIGN KEY (reviewee_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- For client_id (person who hired/booked)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'reviews_client_id_fkey'
        AND table_name = 'reviews'
    ) THEN
        ALTER TABLE public.reviews 
        ADD CONSTRAINT reviews_client_id_fkey 
        FOREIGN KEY (client_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- For provider_id (person who provided service)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'reviews_provider_id_fkey'
        AND table_name = 'reviews'
    ) THEN
        ALTER TABLE public.reviews 
        ADD CONSTRAINT reviews_provider_id_fkey 
        FOREIGN KEY (provider_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Step 3: Create RLS policies for reviews table if they don't exist
-- Allow users to read reviews about them
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'Users can read reviews about them'
        AND tablename = 'reviews'
    ) THEN
        CREATE POLICY "Users can read reviews about them" ON public.reviews
        FOR SELECT
        USING (
            auth.uid() = reviewee_id 
            OR auth.uid() = reviewer_id 
            OR auth.uid() = client_id 
            OR auth.uid() = provider_id
        );
    END IF;
END $$;

-- Allow users to insert reviews
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'Users can insert reviews'
        AND tablename = 'reviews'
    ) THEN
        CREATE POLICY "Users can insert reviews" ON public.reviews
        FOR INSERT
        WITH CHECK (auth.uid() = reviewer_id);
    END IF;
END $$;

-- Allow users to update their own reviews
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'Users can update own reviews'
        AND tablename = 'reviews'
    ) THEN
        CREATE POLICY "Users can update own reviews" ON public.reviews
        FOR UPDATE
        USING (auth.uid() = reviewer_id)
        WITH CHECK (auth.uid() = reviewer_id);
    END IF;
END $$;

-- Allow users to delete their own reviews
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'Users can delete own reviews'
        AND tablename = 'reviews'
    ) THEN
        CREATE POLICY "Users can delete own reviews" ON public.reviews
        FOR DELETE
        USING (auth.uid() = reviewer_id);
    END IF;
END $$;

-- Service role full access
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'Service role full access to reviews'
        AND tablename = 'reviews'
    ) THEN
        CREATE POLICY "Service role full access to reviews" ON public.reviews
        FOR ALL
        USING (auth.role() = 'service_role')
        WITH CHECK (auth.role() = 'service_role');
    END IF;
END $$;

COMMIT;

-- ============================================================================
-- Verification
-- ============================================================================
SELECT 'Reviews relationships configured!' AS status;

-- Check foreign keys on reviews table
SELECT 
    constraint_name,
    table_name,
    column_name,
    referenced_table_name,
    referenced_column_name
FROM information_schema.key_column_usage
WHERE table_name = 'reviews'
AND column_name IN ('reviewer_id', 'reviewee_id', 'client_id', 'provider_id')
ORDER BY column_name;

-- Check RLS policies on reviews
SELECT 
    policyname,
    permissive,
    cmd
FROM pg_policies
WHERE tablename = 'reviews'
ORDER BY policyname;
