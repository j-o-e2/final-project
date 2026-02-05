-- ============================================================================
-- Drop and Recreate Reviews Table Correctly
-- ============================================================================
-- This SQL completely drops the reviews table and recreates it with:
-- - Proper column definitions
-- - Foreign key constraints to profiles table
-- - RLS policies for security
-- - Proper indexes
--
-- WARNING: This will delete all existing reviews data
-- Run this in Supabase SQL Editor
--
-- ============================================================================

BEGIN;

-- Step 1: Drop the reviews table (this cascades to any dependent objects)
DROP TABLE IF EXISTS public.reviews CASCADE;

-- Step 2: Create reviews table with correct structure
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign keys to profiles
  reviewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reviewee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Review content
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  
  -- Related records (optional)
  booking_id UUID,
  job_id UUID,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Ensure a user can only review another user once per booking/job
  UNIQUE(reviewer_id, reviewee_id, booking_id),
  UNIQUE(reviewer_id, reviewee_id, job_id)
);

-- Step 3: Create indexes for common queries
CREATE INDEX idx_reviews_reviewer_id ON public.reviews(reviewer_id);
CREATE INDEX idx_reviews_reviewee_id ON public.reviews(reviewee_id);
CREATE INDEX idx_reviews_client_id ON public.reviews(client_id);
CREATE INDEX idx_reviews_provider_id ON public.reviews(provider_id);
CREATE INDEX idx_reviews_booking_id ON public.reviews(booking_id);
CREATE INDEX idx_reviews_job_id ON public.reviews(job_id);
CREATE INDEX idx_reviews_created_at ON public.reviews(created_at DESC);

-- Step 4: Enable RLS on reviews table
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS policies

-- Policy 1: Users can READ reviews about them or reviews they wrote
CREATE POLICY "Users can read reviews involving them" ON public.reviews
  FOR SELECT
  USING (
    auth.uid() = reviewee_id 
    OR auth.uid() = reviewer_id 
    OR auth.uid() = client_id 
    OR auth.uid() = provider_id
  );

-- Policy 2: Users can INSERT reviews (they become the reviewer)
CREATE POLICY "Users can insert reviews" ON public.reviews
  FOR INSERT
  WITH CHECK (auth.uid() = reviewer_id);

-- Policy 3: Users can UPDATE their own reviews
CREATE POLICY "Users can update own reviews" ON public.reviews
  FOR UPDATE
  USING (auth.uid() = reviewer_id)
  WITH CHECK (auth.uid() = reviewer_id);

-- Policy 4: Users can DELETE their own reviews
CREATE POLICY "Users can delete own reviews" ON public.reviews
  FOR DELETE
  USING (auth.uid() = reviewer_id);

-- Policy 5: Service role (backend/triggers) has full access
CREATE POLICY "Service role full access to reviews" ON public.reviews
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Step 6: Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_reviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reviews_update_timestamp
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_reviews_updated_at();

COMMIT;

-- ============================================================================
-- Verification
-- ============================================================================
SELECT 'Reviews table recreated successfully!' AS status;

-- Check table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'reviews'
ORDER BY ordinal_position;

-- Check foreign keys
SELECT 
  constraint_name,
  column_name,
  table_name
FROM information_schema.key_column_usage
WHERE table_name = 'reviews'
AND column_name IN ('reviewer_id', 'reviewee_id', 'client_id', 'provider_id')
ORDER BY column_name;

-- Check indexes
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'reviews'
ORDER BY indexname;

-- Check RLS policies
SELECT 
  policyname,
  permissive,
  cmd
FROM pg_policies
WHERE tablename = 'reviews'
ORDER BY policyname;

SELECT COUNT(*) as "Total Reviews" FROM public.reviews;
