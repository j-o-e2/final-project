-- Auto-confirm email for test users (for testing/MVP purposes)
-- Run this in Supabase SQL Editor if you want to test without email verification

-- THIS IS FOR TESTING ONLY - DO NOT USE IN PRODUCTION

UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email LIKE '%test%' OR email LIKE '%@example.com';

-- Verify the update
SELECT email, email_confirmed_at, created_at FROM auth.users ORDER BY created_at DESC LIMIT 5;
