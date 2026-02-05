# Fix: Duplicate Email Constraint Error

## Problem
When creating a user profile, you get this error:
```
Failed to create user profile: duplicate key value violates unique constraint "profiles_email_key"
```

## Root Causes
1. **Duplicate emails in database**: The `profiles` table has a `UNIQUE` constraint on the `email` column. If an email already exists, inserting a new profile with the same email will fail.
2. **User re-signing up**: A user tries to register with an email that's already in the system.
3. **Orphaned profiles**: During development/testing, duplicate profiles may have been created from multiple signup attempts.

## Solutions Applied

### Solution 1: Clean Up Duplicate Emails (Database)
**File:** `FIX_DUPLICATE_EMAIL_CONSTRAINT.sql`

Run this SQL in your Supabase dashboard to:
- Remove duplicate email entries (keeps the oldest profile for each email)
- Ensure the UNIQUE constraint is properly configured
- Create an index for faster email lookups

**Steps:**
1. Go to Supabase Dashboard → SQL Editor
2. Create a new query
3. Copy and paste the contents of `FIX_DUPLICATE_EMAIL_CONSTRAINT.sql`
4. Click "Run"
5. Verify with the included verification queries

### Solution 2: Enhanced Signup Route (Backend)
**File:** `app/api/auth/signup/route.ts` (updated)

The signup endpoint now:
- ✅ **Checks for existing profiles** before attempting to insert
- ✅ **Updates existing profile** if one already exists (instead of failing)
- ✅ **Handles duplicate email errors gracefully** with a user-friendly message
- ✅ **Provides clear error messages** (409 Conflict status for duplicates)

**New Logic:**
```typescript
1. User signs up with email
2. Check if profile already exists
3. If exists → Update the existing profile
4. If not exists → Insert new profile
5. If insert fails with "duplicate key" → Return 409 Conflict with helpful message
```

### Solution 3: Database Constraint (Long-term)
The `profiles` table should have:
```sql
CREATE UNIQUE INDEX idx_profiles_email_unique ON public.profiles(email) 
WHERE email IS NOT NULL;
```

This prevents future duplicates while allowing NULL emails if needed.

## How to Apply

### Option A: Quick Fix (Just Update Code)
1. The signup route is already updated
2. Users trying to sign up with existing emails will get a helpful message
3. They'll be prompted to log in instead

### Option B: Complete Fix (Recommended)
1. Run `FIX_DUPLICATE_EMAIL_CONSTRAINT.sql` in Supabase to clean database
2. The updated signup code will prevent future duplicates
3. Your system is now protected against this error

### Option C: Manual Cleanup
If you want to manually fix just one email:
```sql
-- Find all profiles with this email
SELECT id, email, full_name, created_at 
FROM public.profiles 
WHERE email = 'user@example.com'
ORDER BY created_at;

-- Keep the oldest one, delete others (adjust IDs as needed)
DELETE FROM public.profiles 
WHERE email = 'user@example.com' 
AND id NOT IN (
  SELECT id FROM public.profiles 
  WHERE email = 'user@example.com' 
  ORDER BY created_at LIMIT 1
);
```

## Testing

After applying the fix:

1. **Test 1: New User Signup** (should work)
   - Sign up with `newuser@example.com`
   - Profile should be created successfully

2. **Test 2: Duplicate Email** (should handle gracefully)
   - Try to sign up with the same email again
   - Should get: "This email is already registered. Please use a different email or log in instead."

3. **Test 3: Profile Updates** (should work)
   - If somehow profile exists but user tries signup, it updates instead of failing

## What Changed

### Database
- Removed duplicate profiles from the `profiles` table
- Ensured UNIQUE constraint on email column
- Added proper indexing for performance

### Backend API
- Added profile existence check before insert
- Implemented upsert-like logic (update if exists, insert if not)
- Better error handling for duplicate key violations
- User-friendly error messages

## Prevention Going Forward

The updated signup route now:
- Checks for existing email before inserting
- Gracefully handles the duplicate case
- Returns appropriate HTTP status codes (409 for conflict)
- Provides clear error messages to frontend

## Verification

Run these queries to verify the fix:

```sql
-- Check for remaining duplicates (should be empty)
SELECT email, COUNT(*) as count 
FROM public.profiles 
WHERE email IS NOT NULL 
GROUP BY email 
HAVING COUNT(*) > 1;

-- See total profiles
SELECT COUNT(*) as total FROM public.profiles;

-- Check indexes
SELECT indexname FROM pg_indexes 
WHERE tablename = 'profiles' 
AND indexname LIKE '%email%';
```

## Related Files
- [FIX_DUPLICATE_EMAIL_CONSTRAINT.sql](FIX_DUPLICATE_EMAIL_CONSTRAINT.sql) - Database cleanup
- [app/api/auth/signup/route.ts](app/api/auth/signup/route.ts) - Updated signup logic
- [COMPLETE_SETUP_PROFILES.sql](COMPLETE_SETUP_PROFILES.sql) - Complete profiles setup
- [scripts/CRITICAL_create_profiles_table.sql](scripts/CRITICAL_create_profiles_table.sql) - Profile table creation
