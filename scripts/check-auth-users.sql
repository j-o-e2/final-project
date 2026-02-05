-- Verification script for Supabase Auth Configuration
-- Run this in Supabase SQL Editor to check your settings

-- Check if you have any unverified users
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at,
  CASE 
    WHEN email_confirmed_at IS NULL THEN 'NOT VERIFIED'
    ELSE 'VERIFIED'
  END as verification_status,
  CASE
    WHEN (NOW() - created_at) > INTERVAL '24 hours' THEN 'USER CREATED > 24h AGO'
    ELSE 'USER CREATED < 24h AGO'
  END as age_check
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;

-- If you see "NOT VERIFIED" and "USER CREATED > 24h AGO", your email links are expiring too quickly
-- Solution: In Supabase Dashboard → Authentication → Providers → Email
-- Set "OTP Expiration" to 86400 (24 hours)
