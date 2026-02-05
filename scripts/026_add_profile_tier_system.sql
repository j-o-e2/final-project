-- 026_add_profile_tier_system.sql
-- Add tier-based profile upgrade system to profiles table
-- Tier progression: basic → verified → trusted → elite → pro

BEGIN;

-- 1. Add tier and badge columns to profiles
ALTER TABLE IF EXISTS public.profiles 
ADD COLUMN IF NOT EXISTS profile_tier TEXT DEFAULT 'basic' 
CHECK (profile_tier IN ('basic', 'verified', 'trusted', 'elite', 'pro'));

ALTER TABLE IF EXISTS public.profiles 
ADD COLUMN IF NOT EXISTS badge_verified BOOLEAN DEFAULT false;

ALTER TABLE IF EXISTS public.profiles 
ADD COLUMN IF NOT EXISTS avg_rating FLOAT DEFAULT 0 
CHECK (avg_rating >= 0 AND avg_rating <= 5);

ALTER TABLE IF EXISTS public.profiles 
ADD COLUMN IF NOT EXISTS total_reviews INT DEFAULT 0 
CHECK (total_reviews >= 0);

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_tier ON public.profiles(profile_tier);
CREATE INDEX IF NOT EXISTS idx_profiles_avg_rating ON public.profiles(avg_rating DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_total_reviews ON public.profiles(total_reviews DESC);

-- 3. Create a function to calculate and update user tier based on reviews
CREATE OR REPLACE FUNCTION public.calculate_user_tier(user_id UUID)
RETURNS TABLE(new_tier TEXT, is_verified BOOLEAN) AS $$
DECLARE
  v_avg_rating FLOAT;
  v_total_reviews INT;
  v_days_since_creation INT;
  v_created_at TIMESTAMP;
  v_new_tier TEXT;
  v_is_verified BOOLEAN;
BEGIN
  -- Get profile creation date and calculate days
  SELECT created_at INTO v_created_at FROM public.profiles WHERE id = user_id;
  v_days_since_creation := EXTRACT(DAY FROM NOW() - v_created_at);
  
  -- Calculate average rating and total reviews from reviews table
  SELECT 
    COALESCE(AVG(rating), 0),
    COUNT(*)
  INTO 
    v_avg_rating,
    v_total_reviews
  FROM public.reviews
  WHERE reviewee_id = user_id;
  
  -- Determine tier based on criteria
  IF v_total_reviews = 0 THEN
    v_new_tier := 'basic';
    v_is_verified := false;
  
  ELSIF v_total_reviews >= 50 AND v_avg_rating >= 4.8 AND v_days_since_creation >= 180 THEN
    v_new_tier := 'pro';
    v_is_verified := true;
  
  ELSIF v_total_reviews >= 50 AND v_avg_rating >= 4.8 THEN
    v_new_tier := 'elite';
    v_is_verified := true;
  
  ELSIF v_total_reviews >= 10 AND v_avg_rating >= 4.0 THEN
    v_new_tier := 'trusted';
    v_is_verified := true;
  
  ELSIF v_total_reviews >= 1 AND v_avg_rating >= 3.0 THEN
    v_new_tier := 'verified';
    v_is_verified := true;
  
  ELSE
    v_new_tier := 'basic';
    v_is_verified := false;
  END IF;
  
  -- Update profile with new tier and badge status
  UPDATE public.profiles 
  SET 
    profile_tier = v_new_tier,
    badge_verified = v_is_verified,
    avg_rating = ROUND(v_avg_rating::NUMERIC, 2)::FLOAT,
    total_reviews = v_total_reviews,
    updated_at = NOW()
  WHERE id = user_id;
  
  -- Return the new tier and verification status
  RETURN QUERY SELECT v_new_tier, v_is_verified;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create a trigger to automatically update tier when reviews are added/deleted
CREATE OR REPLACE FUNCTION public.trigger_update_reviewee_tier()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    PERFORM public.calculate_user_tier(NEW.reviewee_id);
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.calculate_user_tier(OLD.reviewee_id);
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_reviewee_tier ON public.reviews;

-- Create trigger on reviews table
CREATE TRIGGER trigger_update_reviewee_tier
AFTER INSERT OR UPDATE OR DELETE ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.trigger_update_reviewee_tier();

-- 5. Verification queries (optional - run these after to check everything)
COMMIT;

-- Run these queries to verify the setup:
-- SELECT * FROM public.profiles WHERE role = 'worker' ORDER BY profile_tier DESC, avg_rating DESC;
-- SELECT * FROM pg_stat_user_functions WHERE funcname = 'calculate_user_tier';
-- SELECT * FROM information_schema.triggers WHERE trigger_name = 'trigger_update_reviewee_tier';
