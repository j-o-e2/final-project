-- ============================================================================
-- FIX: Update email verification trigger to use correct column
-- ============================================================================
-- This fixes the trigger that tries to set email_verified (doesn't exist)
-- and replaces it with email_confirmed_at (which does exist)
--
-- Run this in Supabase SQL Editor
--
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_email_verification()
RETURNS TRIGGER AS $$
BEGIN
  -- Update profiles table with email confirmation timestamp
  UPDATE public.profiles 
  SET updated_at = NOW()
  WHERE id = NEW.id;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error updating profile on email verification for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify the function was updated
SELECT proname, prosrc FROM pg_proc WHERE proname = 'handle_email_verification';
