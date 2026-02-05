# Email Verification Link Expiration - Debugging Guide

## Problem
When users click the email confirmation link, they get "confirmation link expired" error.

## Root Causes & Solutions

### ✅ Step 1: Verify Supabase Email Configuration

1. **Open Supabase Dashboard**
2. Go to **Authentication** → **Email Templates**
3. Look for **"Confirm signup"** or **"Email verification"** template
4. Ensure the template contains: `{{ .ConfirmationURL }}`
5. **The URL in the template should start with your site URL** (configured below)

### ✅ Step 2: Configure Site URL in Supabase

1. **Open Supabase Dashboard**
2. Go to **Project Settings** (gear icon) → **General**
3. Scroll down to **Site URL** section (may be called "URL Configuration")
4. Add your domain(s):
   ```
   http://localhost:3000
   https://yourdomain.com
   ```
5. **Save changes**

### ✅ Step 3: Verify Environment Variables

Make sure these are set in `.env.local`:
```
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### ✅ Step 4: Check Email Link Settings

In Supabase **Authentication Settings** (gear icon):
- **Email Redirect To**: Should be your signup-success page
- **Email Verification Expiry**: Default is 24 hours (should be fine)
- **Security**: Ensure email confirmation is **enabled**

### ✅ Step 5: Test the Flow

1. Sign up with a test email
2. Check your email (and spam folder)
3. **Click the link immediately** (within 24 hours)
4. You should see the `/signup-success` page
5. If you get "Verification Issue", check the browser console for detailed error messages

## Common Error Messages & Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| "Token expired" | 24+ hours passed since signup | Resend verification email |
| "Invalid token" | Wrong site URL configuration | Update Site URL in Supabase Settings |
| "Token already used" | Link clicked twice | Send new verification email |
| "CORS error" | Site URL mismatch | Add correct URL to Supabase Site URL setting |

## Quick Debug Checklist

- [ ] Site URL is configured in Supabase (matches your app URL)
- [ ] Email template contains `{{ .ConfirmationURL }}`
- [ ] Email verification is enabled in Auth Settings
- [ ] Test email received confirmation email
- [ ] Clicked link within 24 hours
- [ ] Browser console shows no errors (check DevTools F12)
- [ ] `/signup-success` page loads when clicking email link
- [ ] Can resend verification email if first one fails

## For Local Development

Use: `http://localhost:3000`

## For Production

Use: `https://yourdomain.com`

## If Still Having Issues

1. **Check browser console** (F12) → Console tab for JavaScript errors
2. **Check Network tab** in DevTools when redirecting
3. **Check Supabase logs** → Go to Supabase Dashboard → Logs → Auth
4. Try **resending verification email** and clicking immediately
5. Contact Supabase support with the error message from logs
