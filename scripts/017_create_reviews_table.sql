-- Migration: Create reviews table with RLS policies
-- Description: Stores user reviews for jobs and service bookings
-- Created: 2025-12-01

BEGIN;

-- Create reviews table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reviewee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_id ON public.reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewee_id ON public.reviews(reviewee_id);
CREATE INDEX IF NOT EXISTS idx_reviews_job_id ON public.reviews(job_id);
CREATE INDEX IF NOT EXISTS idx_reviews_booking_id ON public.reviews(booking_id);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON public.reviews(created_at);

-- Enable RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Anyone can view all reviews (anonymous read OK)
CREATE POLICY "reviews_select_policy" ON public.reviews
  FOR SELECT USING (true);

-- RLS Policy: Users can only insert reviews they author (reviewer_id = auth.uid())
CREATE POLICY "reviews_insert_policy" ON public.reviews
  FOR INSERT WITH CHECK (reviewer_id = auth.uid());

-- RLS Policy: Users can only update their own reviews
CREATE POLICY "reviews_update_policy" ON public.reviews
  FOR UPDATE USING (reviewer_id = auth.uid()) WITH CHECK (reviewer_id = auth.uid());

-- RLS Policy: Users can only delete their own reviews
CREATE POLICY "reviews_delete_policy" ON public.reviews
  FOR DELETE USING (reviewer_id = auth.uid());

COMMIT;
