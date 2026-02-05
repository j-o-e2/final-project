# Quick Fix: Duplicate Email Error - IMMEDIATE ACTION

## The Problem
```
Failed to create user profile: duplicate key value violates unique constraint "profiles_email_key"
```

## Why It Happens
Your `profiles` table has a UNIQUE constraint on the `email` column. You're trying to insert a profile with an email that already exists in the database.

## Immediate Fix (2 steps)

### Step 1: Clean Your Database (Optional but Recommended)
If you have test/duplicate data, run this SQL in Supabase:

```sql
-- Remove duplicate emails (keeps the oldest profile per email)
DELETE FROM public.profiles
WHERE id NOT IN (
  SELECT DISTINCT ON (email) id
  FROM public.profiles
  WHERE email IS NOT NULL
  ORDER BY email, created_at ASC
)
AND email IS NOT NULL
AND email IN (
  SELECT email FROM public.profiles
  WHERE email IS NOT NULL
  GROUP BY email
  HAVING COUNT(*) > 1
);

-- Verify no duplicates remain
SELECT email, COUNT(*) as count 
FROM public.profiles 
WHERE email IS NOT NULL 
GROUP BY email 
HAVING COUNT(*) > 1;
```

**Location in Supabase:**
1. Dashboard → SQL Editor → New Query
2. Paste the SQL above
3. Click "Run"

### Step 2: Deploy Updated Code
Your signup API has been updated (`app/api/auth/signup/route.ts`). The code now:
- ✅ Checks if email already exists before inserting
- ✅ Updates existing profile if found
- ✅ Returns friendly error message if duplicate (HTTP 409)
- ✅ Prevents this error from happening

**Deploy your changes:**
```bash
git add app/api/auth/signup/route.ts
git commit -m "fix: handle duplicate email in signup"
git push
```

## How the Updated Code Works

```
User signs up with email "john@example.com"
        ↓
1. Create auth user in Supabase Auth
        ↓
2. Check if profile exists for this email
        ├─ If YES → Update existing profile
        ├─ If NO → Insert new profile
        │
        └─ If insert fails with "duplicate key"
           → Return 409 with helpful message
```

## Test It

1. **First signup:** `user1@example.com` ✅ Should work
2. **Duplicate signup:** `user1@example.com` again ✅ Should return friendly error
3. **New signup:** `user2@example.com` ✅ Should work

## What Files Changed

| File | Change |
|------|--------|
| `app/api/auth/signup/route.ts` | ✅ Updated - Added duplicate email check + graceful handling |
| `FIX_DUPLICATE_EMAIL_CONSTRAINT.sql` | ✅ Created - SQL to clean up duplicates |
| `FIX_DUPLICATE_EMAIL_ISSUE_COMPLETE.md` | ✅ Created - Full documentation |

## If It's Still Not Working

1. **Check your database has duplicates:**
   ```sql
   SELECT email, COUNT(*) as count 
   FROM public.profiles 
   WHERE email IS NOT NULL 
   GROUP BY email 
   HAVING COUNT(*) > 1;
   ```

2. **If duplicates exist, delete them:**
   - Run the SQL in Step 1 above

3. **Check RLS policies aren't blocking:**
   - Go to Supabase → SQL Editor
   - Run: `SELECT * FROM public.profiles LIMIT 5;`
   - If this fails, your RLS policies need fixing

4. **Verify UNIQUE constraint:**
   ```sql
   SELECT constraint_name, constraint_type
   FROM information_schema.table_constraints
   WHERE table_name = 'profiles'
   AND constraint_type = 'UNIQUE';
   ```

## Files to Reference
- [FIX_DUPLICATE_EMAIL_ISSUE_COMPLETE.md](FIX_DUPLICATE_EMAIL_ISSUE_COMPLETE.md) - Full details
- [FIX_DUPLICATE_EMAIL_CONSTRAINT.sql](FIX_DUPLICATE_EMAIL_CONSTRAINT.sql) - Database cleanup SQL
- [app/api/auth/signup/route.ts](app/api/auth/signup/route.ts) - Updated signup code
