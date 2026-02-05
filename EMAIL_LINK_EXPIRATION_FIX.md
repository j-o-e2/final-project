# Email Link Expiration - Diagnostic & Fix Guide

## Problem Summary

Email verification links are expiring too quickly (within minutes) instead of the expected 24 hours, preventing new users from completing signup.

## Root Cause Analysis

Supabase has **two separate token types** with different expiry configurations:

1. **Confirmation Tokens** (used in `signUp()` with `emailRedirectTo`)
   - Used for: Email verification during signup
   - Default expiry: ~60 minutes (configurable)
   - Flow: User signs up → Supabase sends email → User clicks link → Code exchanged at `/api/auth/callback`

2. **OTP Tokens** (used in `signInWithOtp()`)
   - Used for: Magic links, passwordless login, resend verification
   - Default expiry: ~15 minutes (can be extended to 24 hours)
   - Flow: User requests OTP → Supabase sends email → User clicks link → Session created

## Current Implementation Status

### ✅ Working:
- Signup endpoint (`/api/auth/signup-with-password`): Sends confirmation email
- Callback route (`/api/auth/callback`): Handles code exchange from email link
- Signup-success page: Shows verification status and resend option
- Resend verification (`/api/auth/resend-verification`): Uses magic link (OTP) approach

### ❌ Issue:
The initial signup email likely uses **confirmation tokens** with short expiry. If a user clicks the link after Supabase's OTP window closes, they get an error.

## Solution: Extend OTP Expiration in Supabase Dashboard

### Step-by-Step Fix:

1. **Login to Supabase Dashboard**
   - Go to: https://supabase.com/dashboard
   - Select your project: "local-fix-kenya-app"

2. **Navigate to Email Configuration**
   - Left menu → Authentication
   - → Providers
   - → Email

3. **Set OTP Expiration to 24 Hours**
   - Find: "OTP Expiration" setting
   - Change value: **86400** seconds (24 hours)
   - Alternative: 43200 seconds (12 hours) if you prefer shorter expiry

4. **Save Configuration**
   - Click Save/Update
   - Changes take effect immediately

## Current Expiry Times (After Fix)

| Token Type | Default | After Fix | Impact |
|-----------|---------|-----------|--------|
| Confirmation | 60 min | N/A | Initial signup email |
| OTP | 15 min | 86400 sec (24h) | Resend email + magic links |

## File Locations & Related Code

### Signup Flow:
- **Frontend**: `app/signup/page.tsx` - User enters credentials
- **Endpoint**: `app/api/auth/signup-with-password/route.ts` - Creates user + profile
- **Email**: Supabase sends confirmation email automatically

### Verification Flow:
- **Callback**: `app/api/auth/callback/route.ts` - Exchanges code for session
- **Success Page**: `app/signup-success/page.tsx` - Shows verification status + resend option
- **Resend**: `app/api/auth/resend-verification/route.ts` - Sends magic link (OTP)

## Testing After Fix

1. **Test Initial Signup**
   - Sign up with new email
   - Wait >5 minutes
   - Click verification link in email
   - Should work (even after initial 60-min window, the OTP token extends it)

2. **Test Resend**
   - Go to signup-success page
   - Enter email
   - Click "Resend"
   - Click link from new email
   - Should verify successfully

3. **Test on Production**
   - After deployment, test same flow
   - Verify tokens expire after 24h (not sooner)

## Additional Improvements (Optional)

### Enhance Signup Endpoint
Current: Uses `signUp()` with confirmation email
Suggested: Could also use `signInWithOtp()` for consistency, but confirmation email is standard.

### Add Token Expiry Messaging
Update `signup-success` page to show:
- "Verification links valid for 24 hours"
- Countdown timer to expiry (optional)

### Monitor Email Deliverability
- Check Supabase email logs for delivery status
- Enable rate limiting if needed (default: 3 per hour per email)

## Debugging Info

If issues persist after fix:

1. **Check Supabase Logs**
   - Dashboard → Logs → Auth logs
   - Look for: "invalid_grant", "expired_token", "invalid_code"

2. **Verify Environment Variables**
   - `NEXT_PUBLIC_SUPABASE_URL` - Correct project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Valid anon key
   - `SUPABASE_SERVICE_ROLE_KEY` - Only for server-side

3. **Check Redirect URL Configuration**
   - Supabase → Auth → Redirect URLs
   - Must include: `http://localhost:3000/api/auth/callback` (dev)
   - Must include: `https://yourdomain.com/api/auth/callback` (production)

4. **Test with Console Logs**
   - Check browser console for token/URL info
   - Check server logs for exchange errors
   - Enable verbose logging in `callback/route.ts`

## Related Documentation Files

- `EMAIL_VERIFICATION_DEBUG.md` - Historical debugging notes
- `ADMIN_DASHBOARD_SECURITY.md` - Auth patterns used
- `signup-success/page.tsx` - Lines 60-70 show error handling

## Summary

**Action Required**: In Supabase dashboard, set Email OTP Expiration to 86400 seconds (24 hours).

**Expected Result**: Verification links will remain valid for 24 hours after signup, allowing ample time for users to check email and verify.

**Backup Option**: Use resend verification link feature if initial email expires.
