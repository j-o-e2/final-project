# QUICK FIX: Foreign Key Constraint Error - profiles_id_fkey

## Error Message
```
Failed to update user profile: insert or update on table "profiles" 
violates foreign key constraint "profiles_id_fkey"
```

## Problem in 2 Sentences
The signup code was trying to update the `id` field in the profiles table when a duplicate email was detected. The `id` is a primary key with a foreign key constraint and **cannot be updated**.

## The Fix
Remove the `id` field from the profile update. The `id` should never change - it's the primary key.

## Changed File
**File:** `app/api/auth/signup/route.ts` (Line ~93)

### Before ❌
```typescript
const { error: updateError } = await serviceClient
  .from("profiles")
  .update({
    id: authData.user.id,  // ❌ WRONG - Cannot update primary key
    full_name,
    phone,
    location: location || "",
    role,
    updated_at: new Date().toISOString(),
  })
  .eq("email", email)
```

### After ✅
```typescript
const { error: updateError } = await serviceClient
  .from("profiles")
  .update({
    // id removed - primary keys are immutable
    full_name,
    phone,
    location: location || "",
    role,
    updated_at: new Date().toISOString(),
  })
  .eq("email", email)
```

## Why This Works
- `id` is a primary key → cannot be changed
- `id` has a foreign key constraint → PostgreSQL blocks modifications
- `id` is already set when the profile is created → no need to update it
- We identify the profile row by email → no need to modify the ID

## What's a Foreign Key Constraint?
```sql
-- Your profiles table definition:
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  -- other columns...
)
```

This means:
- ✅ Every profile's `id` must exist in `auth.users`
- ✅ If an auth user is deleted, their profile deletes too
- ❌ You cannot update the `id` field
- ❌ You cannot set `id` to a user that doesn't exist in auth.users

## Test It
1. Sign up with new email → ✅ Works
2. Try same email again → ✅ Profile updated (no error)
3. Different email → ✅ Works

## Status
✅ **FIXED** - The `id` field has been removed from the profile update logic in [app/api/auth/signup/route.ts](app/api/auth/signup/route.ts)

Deploy your changes and this error should be resolved!
