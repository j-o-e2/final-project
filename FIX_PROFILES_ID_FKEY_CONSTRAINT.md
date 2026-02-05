# Fix: Foreign Key Constraint Error on Profile Update

## The Problem
```
Failed to update user profile: insert or update on table "profiles" violates foreign key constraint "profiles_id_fkey"
```

## Root Cause
The error occurs in the signup API when trying to update an existing profile. The issue is:

1. **The `profiles` table has a foreign key constraint** on the `id` column:
   ```sql
   id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
   ```

2. **The update code was trying to set the `id` field:**
   ```typescript
   // ❌ WRONG - Cannot update a primary key with FK constraint
   await serviceClient.from("profiles").update({
     id: authData.user.id,  // ← This causes the FK violation
     full_name,
     phone,
     location,
     role,
   })
   ```

3. **Why it fails:**
   - Primary keys cannot be updated (they define the row identity)
   - The `id` column references `auth.users(id)` via a foreign key
   - You cannot modify a foreign key column to a value that doesn't match the current user in `auth.users`
   - Even if you could, changing the ID would be trying to move the profile to a different auth user

## The Solution
**Remove the `id` field from the update payload.** The ID is:
- ✅ A primary key (immutable)
- ✅ Already set when the profile was created
- ✅ Should never change
- ✅ Protected by the foreign key constraint

**Fixed Code:**
```typescript
// ✅ CORRECT - Only update mutable fields
await serviceClient.from("profiles").update({
  full_name,
  phone,
  location,
  role,
  updated_at: new Date().toISOString(),
})
.eq("email", email)  // Find row by email, don't modify ID
```

## What Changed
**File:** [app/api/auth/signup/route.ts](app/api/auth/signup/route.ts)

**Before:**
```typescript
const { error: updateError } = await serviceClient
  .from("profiles")
  .update({
    id: authData.user.id,           // ❌ Removed this line
    full_name,
    phone,
    location: location || "",
    role,
    updated_at: new Date().toISOString(),
  })
  .eq("email", email)
```

**After:**
```typescript
const { error: updateError } = await serviceClient
  .from("profiles")
  .update({
    // id field removed (primary key - cannot be updated)
    full_name,
    phone,
    location: location || "",
    role,
    updated_at: new Date().toISOString(),
  })
  .eq("email", email)
```

## Understanding the Foreign Key Constraint

Your `profiles` table is defined like this:
```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Other columns...
)
```

**What this means:**
- `id UUID PRIMARY KEY` - The ID is the row identifier and cannot change
- `REFERENCES auth.users(id)` - Every profile's ID must exist in the auth.users table
- `ON DELETE CASCADE` - If the auth user is deleted, the profile is too

**Why you can't update the `id`:**
1. It's a primary key (immutable by design)
2. It's a foreign key reference (PostgreSQL prevents modification)
3. The constraint would be violated if you tried to set it to a different user's ID
4. There's no legitimate reason to change a user's ID (it's their identity)

## Related Foreign Key Concepts

Your database has similar FK constraints on other tables:

```sql
-- jobs references profiles
REFERENCES profiles(id) ON DELETE CASCADE

-- job_applications references profiles
REFERENCES profiles(id) ON DELETE CASCADE

-- services references profiles  
REFERENCES profiles(id) ON DELETE CASCADE
```

**Rule of thumb:** Never try to update primary keys or foreign key ID columns. These are row identifiers and should be immutable once created.

## Testing

After this fix, the signup flow should work properly:

1. ✅ New user signs up → Profile created with their ID
2. ✅ Same email attempts signup → Profile updated (without changing ID)
3. ✅ No more foreign key constraint errors

## Files Modified
- [app/api/auth/signup/route.ts](app/api/auth/signup/route.ts) - Removed `id` from update payload

## Related Errors
- **"duplicate key violates unique constraint"** - Fixed previously (email duplicates)
- **"violates foreign key constraint profiles_id_fkey"** - Fixed now (ID update attempt)

Both were in the profile update/insert logic in the signup route.
