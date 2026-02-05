-- SQL to DROP the tier system columns from profiles table
-- Use this to rollback if needed

ALTER TABLE IF EXISTS public.profiles DROP COLUMN IF EXISTS profile_tier CASCADE;
ALTER TABLE IF EXISTS public.profiles DROP COLUMN IF EXISTS badge_verified CASCADE;
ALTER TABLE IF EXISTS public.profiles DROP COLUMN IF EXISTS avg_rating CASCADE;
ALTER TABLE IF EXISTS public.profiles DROP COLUMN IF EXISTS total_reviews CASCADE;

-- Optional: Also drop the trigger and function if you want complete rollback
DROP TRIGGER IF EXISTS trigger_update_reviewee_tier ON public.reviews CASCADE;
DROP FUNCTION IF EXISTS public.calculate_user_tier(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.trigger_update_reviewee_tier() CASCADE;

-- Optional: Drop the indexes
DROP INDEX IF EXISTS idx_profiles_tier CASCADE;
DROP INDEX IF EXISTS idx_profiles_avg_rating CASCADE;
DROP INDEX IF EXISTS idx_profiles_total_reviews CASCADE;

-- Verification: Check columns are gone
-- SELECT column_name FROM information_schema.columns 
-- WHERE table_name = 'profiles' 
-- AND column_name IN ('profile_tier', 'badge_verified', 'avg_rating', 'total_reviews');
-- (Should return 0 rows)
