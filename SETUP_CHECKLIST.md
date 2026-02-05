# Quick Setup Checklist - 5 Minutes to Working Verification

## Your URL: http://localhost:3000 ✅

### Code Status
- ✅ All endpoints configured for localhost:3000
- ✅ Signup endpoint: `/api/auth/signup-with-password`
- ✅ Callback endpoint: `/api/auth/callback`
- ✅ Resend endpoint: `/api/auth/resend-verification`
- ✅ Error handling enhanced

### Required Supabase Configuration (Do This Now)

#### Task 1: Add Redirect URL
```
Go to: https://supabase.com/dashboard
Project: local-fix-kenya-app
Menu: Authentication → Redirect URLs
Add: http://localhost:3000/api/auth/callback
Click: Save
```

**Verify**: After saving, you should see the URL in the list

#### Task 2: Set OTP Expiration to 24 Hours
```
Menu: Authentication → Providers → Email
Setting: OTP Expiration
Change from: 900 seconds (15 min)
Change to: 86400 seconds (24 hours)
Click: Save
```

**Verify**: Setting should show "86400 seconds"

### Test It (5 Minutes)

1. **Start dev server** (if not running)
   ```bash
   npm run dev
   ```
   Open: http://localhost:3000

2. **Go to signup**
   - URL: http://localhost:3000/signup
   - Fill in test data:
     - Email: `test-$(date +%s)@example.com`
     - Password: `Test@123!`
     - Phone: `0712345678`
     - Role: Worker
   - Click "Create Account"

3. **Check email**
   - Go to your email inbox
   - Find email from "noreply@..." (Supabase)
   - Subject: "Confirm your email"
   - Click the verification link

4. **Expected result**
   - ✅ Link opens http://localhost:3000/api/auth/callback?code=...
   - ✅ Redirects to signup-success
   - ✅ Shows "Your email is verified"
   - ✅ Can click "Go to Dashboard"

### If It Doesn't Work

| Error | Cause | Fix |
|-------|-------|-----|
| "Redirect URL mismatch" | Supabase redirect URL not added | Add `http://localhost:3000/api/auth/callback` |
| "Invalid code" | URL doesn't match | Verify link starts with `http://localhost:3000` |
| Token expires quickly | OTP expiration not set to 24h | Change to 86400 seconds in Supabase |
| No email arrives | Supabase email not configured | Check Authentication → Email Templates |

### Server Console Logs

Your dev server should show (watch for these):

```
[v0] signup-with-password: siteUrl/emailRedirectTo { 
  siteUrl: 'http://localhost:3000',
  emailRedirectTo: 'http://localhost:3000/api/auth/callback' 
}
✅ Means: Using correct localhost URL
```

### Success Indicators

- ✅ Signup page works (http://localhost:3000/signup)
- ✅ Email arrives within 2 minutes
- ✅ Verification link works when clicked
- ✅ Can access dashboard after verification
- ✅ No "invalid code" or URL mismatch errors

---

## Next Steps After Testing

1. ✅ If working: Continue with other features
2. ⏳ When deploying to Vercel:
   - Add production URL to Supabase redirect URLs
   - Example: `https://myapp.vercel.app/api/auth/callback`
3. ⏳ Update database schema for admin features (if not done)
4. ⏳ Test admin dashboard features

---

## Summary

| Item | Status |
|------|--------|
| Code Configuration | ✅ Complete |
| Your Dev URL | ✅ http://localhost:3000 |
| Supabase Redirect URL | ⏳ **ADD NOW** |
| OTP Expiration | ⏳ **SET TO 86400** |
| Testing Ready | ⏳ After Supabase config |

**Time to working verification**: ~5-10 minutes
