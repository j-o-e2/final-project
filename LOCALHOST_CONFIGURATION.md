# Supabase Configuration for localhost:3000

## ✅ Code Configuration Status

All endpoints are correctly set to use `http://localhost:3000` with proper fallback logic:

### Signup Endpoint (`app/api/auth/signup-with-password/route.ts`)
```typescript
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 
                (process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : 'http://localhost:3000')
const emailRedirectTo = `${siteUrl}/api/auth/callback`
```
✅ Defaults to `http://localhost:3000/api/auth/callback` for local development

### Resend Endpoint (`app/api/auth/resend-verification/route.ts`)
```typescript
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 
                (process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : 'http://localhost:3000')
const redirectTo = `${siteUrl}/api/auth/callback`
```
✅ Defaults to `http://localhost:3000/api/auth/callback` for local development

### Forgot Password (`app/api/auth/forgot-password/route.ts`)
```typescript
redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/forgot-password/reset`
```
✅ Defaults to `http://localhost:3000/forgot-password/reset` for local development

---

## 🔧 Required Supabase Dashboard Configuration

### Step 1: Add Redirect URL to Supabase
1. Go to: https://supabase.com/dashboard
2. Select project: "local-fix-kenya-app"
3. Navigate to: **Authentication → Redirect URLs**
4. Add this URL:
   ```
   http://localhost:3000/api/auth/callback
   ```
5. Click "Save"

### Step 2: Set OTP Expiration to 24 Hours
1. Navigate to: **Authentication → Providers → Email**
2. Find: **OTP Expiration**
3. Set to: **86400** seconds
4. Click "Save"

### Step 3: Verify Email Template
1. Go to: **Authentication → Email Templates**
2. Confirm "Confirm Email" template is enabled
3. Check that links go to: `{{ .ConfirmationURL }}`
4. Click "Save"

---

## 🌍 Environment Variables (Optional)

If you want to override the default, you can set these in `.env.local`:

```bash
# .env.local
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

But this is **not required** - the code already defaults to localhost:3000.

---

## ✅ Verification Checklist

- [ ] Supabase Redirect URL includes: `http://localhost:3000/api/auth/callback`
- [ ] Supabase OTP Expiration = 86400 seconds
- [ ] Dev server running: `npm run dev`
- [ ] You can access: `http://localhost:3000`
- [ ] You can access: `http://localhost:3000/signup`

---

## 🧪 Test the Flow

### Test 1: Verify Redirect URL is Configured
1. Open browser console (F12)
2. Go to: `http://localhost:3000/signup`
3. Fill form and submit
4. Check logs in terminal for:
   ```
   [v0] signup-with-password: siteUrl/emailRedirectTo { 
     siteUrl: 'http://localhost:3000',
     emailRedirectTo: 'http://localhost:3000/api/auth/callback'
   }
   ```
5. ✅ If URL shows `http://localhost:3000`, configuration is correct

### Test 2: Send Verification Email
1. Complete signup with test email
2. Check email inbox
3. Look for verification link
4. Link should contain: `http://localhost:3000/api/auth/callback?code=...`
5. ✅ Click it - should verify successfully

### Test 3: Resend Verification
1. Go to: `http://localhost:3000/signup-success`
2. Enter email address
3. Click "Resend"
4. Check email for new link
5. New link should also contain: `http://localhost:3000/api/auth/callback?code=...`
6. ✅ Click it - should verify successfully

---

## 🚨 Troubleshooting: URL Mismatch

### Symptom: "Redirect URL mismatch" error

**Cause**: Supabase redirect URL doesn't match the callback URL

**Fix**:
1. Check Supabase dashboard: Authentication → Redirect URLs
2. Ensure it contains: `http://localhost:3000/api/auth/callback`
3. Check email link contains: `http://localhost:3000/api/auth/callback?code=...`
4. If they don't match, update Supabase redirect URL to match

### Symptom: Email link goes to wrong domain

**Cause**: Environment variable overriding default

**Fix**:
1. Check `.env.local` for `NEXT_PUBLIC_SITE_URL`
2. If set, update it to: `http://localhost:3000`
3. If not set, delete it to use code default
4. Restart dev server: `npm run dev`

### Symptom: "Invalid code" when clicking email link

**Cause**: URL doesn't match what Supabase expects

**Fix**:
1. Check email link starts with: `http://localhost:3000`
2. Check Supabase logs: Authentication → Logs
3. Look for error message
4. Add redirect URL to Supabase if missing

---

## 📋 Checklist Before Going to Production

- [ ] Test signup flow works on localhost
- [ ] Email verification links work on localhost
- [ ] Resend verification works on localhost
- [ ] Plan Vercel deployment URL (e.g., `https://myapp.vercel.app`)
- [ ] Add production redirect URL to Supabase: `https://myapp.vercel.app/api/auth/callback`
- [ ] Deploy to Vercel
- [ ] Test on production URL
- [ ] Monitor Supabase logs for any redirect errors

---

## Current Status for localhost:3000

| Component | Status | URL |
|-----------|--------|-----|
| Dev Server | ✅ Ready | http://localhost:3000 |
| Signup Page | ✅ Ready | http://localhost:3000/signup |
| Callback Route | ✅ Ready | http://localhost:3000/api/auth/callback |
| Resend Route | ✅ Ready | http://localhost:3000/api/auth/resend-verification |
| Email Redirect | ✅ Configured | Code defaults to localhost:3000 |
| Supabase Config | ⏳ Pending | Add `http://localhost:3000/api/auth/callback` to redirect URLs |

---

## Summary

**Your setup**: http://localhost:3000 ✅

**Code status**: All files correctly configured to use localhost:3000 ✅

**Remaining action**: Add `http://localhost:3000/api/auth/callback` to Supabase redirect URLs + set OTP expiration to 86400 seconds

**Time to complete**: 5 minutes in Supabase dashboard
