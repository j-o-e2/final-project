# Fix for RLS Infinite Recursion in Profiles Table

## Problem
The `profiles` table has a recursive RLS policy that checks the `profiles` table within itself, causing an infinite recursion error.

## Solution
Remove the recursive "Admins can view all profiles" policy and keep only the simple "Users can read own profile" policy.

Admin queries will use the service role key which bypasses RLS entirely.

## Steps to Apply Fix

### Option 1: Supabase Dashboard (Recommended)
1. Go to https://app.supabase.com → Your Project → SQL Editor
2. Click "+ New Query"
3. Copy and paste the SQL from `scripts/023_fix_profiles_rls.sql`
4. Click "Run"

### Option 2: Using SQL File
The migration is in: `scripts/023_fix_profiles_rls.sql`

Run it in your Supabase project's SQL editor.

### Option 3: Using psql CLI
```bash
psql -h db.supabase.co -U postgres -d postgres -f scripts/023_fix_profiles_rls.sql
```

## What Gets Fixed
- ❌ Removes: "Users can view own profile", "Users can read own profile", "Admins can view all profiles"
- ✅ Creates: Simple policy allowing users to read their own profile only
- ✅ Admin dashboard stats use service role (bypasses RLS)

## Verification
After applying:
1. Users should be able to log in without RLS errors
2. Login page should load user profile without "infinite recursion" errors
3. Admin dashboard should continue to work (uses service role)

## Code Changes
- `/scripts/023_fix_profiles_rls.sql` - Updated migration to remove recursive policy
- `/app/api/admin/stats/route.ts` - Uses Bearer token + service role
- `/app/dashboard/admin/page.tsx` - Sends access token in Authorization header
