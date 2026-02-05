# Email Verification - Quick Troubleshooting Checklist

## 🔧 Configuration Checklist

### Supabase Dashboard Setup
- [ ] Navigate to: https://supabase.com/dashboard
- [ ] Select project: "local-fix-kenya-app"
- [ ] Go to: Authentication → Providers → Email
- [ ] Check "OTP Expiration" setting
  - [ ] Current value: _____ seconds
  - [ ] Should be: 86400 seconds (24 hours)
  - [ ] If not, update it and click Save
- [ ] Verify "Redirect URLs" includes:
  - [ ] http://localhost:3000/api/auth/callback (dev)
  - [ ] https://yourdomain.com/api/auth/callback (production)

### Environment Variables
- [ ] `.env.local` has: `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `.env.local` has: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] Server has: `SUPABASE_SERVICE_ROLE_KEY` (secret, not in .env.local)
- [ ] All three values are correct for your project

### Redirect URL Whitelist
- [ ] Check Supabase → Authentication → Redirect URLs
- [ ] Contains your callback route: `/api/auth/callback`
- [ ] For Vercel deployments, include: `https://[project].vercel.app/api/auth/callback`

## 🧪 Test Flows

### Test 1: New User Signup
1. [ ] Go to: http://localhost:3000/signup
2. [ ] Fill form with test data:
   - Email: `test-$(date +%s)@example.com` (unique)
   - Password: Test@123!
   - Phone: 0712345678
   - Role: Worker
3. [ ] Click "Create Account"
4. [ ] Verify: Redirects to signup-success page
5. [ ] Check email inbox for verification link (subject: "Confirm your email")
6. [ ] Wait 1 minute to test token expiry handling
7. [ ] Click link in email
8. [ ] Verify: Shows "Your email is verified" message

**Expected**: ✅ User verified and can access dashboard
**If Error**: Note error message and check "Test 2" below

### Test 2: Resend Verification (Expired Link)
1. [ ] Go to: http://localhost:3000/signup-success
2. [ ] If there's an error showing, note it
3. [ ] Enter email address in "Resend verification" field
4. [ ] Click "Resend"
5. [ ] Check email for new verification link
6. [ ] Click new link immediately
7. [ ] Verify: Shows "Your email is verified" message

**Expected**: ✅ Fresh link works, user verified
**If Error**: Check server logs for token exchange errors

### Test 3: Expired Link Handling
1. [ ] Go to: http://localhost:3000/signup
2. [ ] Sign up with new email
3. [ ] Wait 25 hours (or simulate by checking logs)
4. [ ] Try clicking original link
5. [ ] Verify: Shows "Verification Issue" with helpful message
6. [ ] Check resend form is accessible
7. [ ] Resend and verify new link works

**Expected**: ✅ Clear error message + resend option
**If Error**: Check callback route error handling

## 🔍 Debugging Commands

### Check Verification Logs
```bash
# In Supabase Dashboard → Logs → Auth Logs
# Look for:
# - User created: "[user_id] created"
# - Code exchange: "[user_id] confirmed"
# - Errors: "invalid_grant", "expired", "invalid"
```

### Test Local Signup Flow
```bash
# Terminal 1: Start dev server
npm run dev

# Terminal 2: Test signup endpoint
curl -X POST http://localhost:3000/api/auth/signup-with-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test@123!",
    "full_name": "Test User",
    "phone": "0712345678",
    "role": "worker"
  }'

# Should return: { "message": "Signup successful...", "user": {...} }
```

### Check Email Sending
```bash
# Supabase Dashboard → Logs → Email logs
# Verify emails are being sent to correct address
# Check delivery status (sent/bounced/failed)
```

## 📊 Token Expiry Timeline

After Supabase fix (OTP = 86400s):

```
User Signs Up
    ↓
[0 min] Email confirmation sent (60-min confirmation token)
    ↓
[5 min] User clicks link ✅ WORKS (within 60-min window)
    ↓
[70 min] User clicks link ❌ FAILS (confirmation expired)
    ↓
User requests resend → Magic link sent (24h OTP token)
    ↓
[1 day] User clicks resend link ✅ WORKS (within 24h window)
    ↓
[2 days] User clicks resend link ❌ FAILS (OTP expired)
```

## ⚠️ Common Issues & Fixes

### Issue: "Verification Issue: invalid_grant"
**Cause**: Token already used or expired
**Fix**: Resend verification email, click new link immediately

### Issue: "Verification Issue: invalid code"
**Cause**: Token malformed or wrong format
**Fix**: Check redirect URL config in Supabase dashboard

### Issue: Email never arrives
**Cause**: Supabase email provider not configured
**Fix**: 
- Check Supabase → Authentication → Email Templates
- Verify SMTP config (if custom provider)
- Check spam folder

### Issue: After fix, tokens still expire quickly
**Cause**: Supabase config not saved properly
**Fix**:
- Log out and refresh browser
- Clear browser cache
- Verify setting in Supabase dashboard (should show 86400)

### Issue: "Site URL mismatch" error
**Cause**: Redirect URL not whitelisted in Supabase
**Fix**:
- Go to Supabase → Authentication → Redirect URLs
- Add your callback URL: `https://yourdomain.com/api/auth/callback`
- For localhost: `http://localhost:3000/api/auth/callback`
- Save and test

## 📝 Files Involved in Flow

| File | Purpose |
|------|---------|
| `app/signup/page.tsx` | User signup form |
| `app/api/auth/signup-with-password/route.ts` | Create user + send confirmation email |
| `app/api/auth/callback/route.ts` | Exchange code for session (main verification) |
| `app/signup-success/page.tsx` | Show verification status + resend option |
| `app/api/auth/resend-verification/route.ts` | Send fresh magic link (OTP) |

## 🚀 After Fixing

1. Test all three flows above
2. Deploy to Vercel/production
3. Update Supabase production project settings (same OTP = 86400s fix)
4. Test signup on live domain
5. Monitor logs for 24h to catch any edge cases

## ✅ Success Indicators

- [ ] Signup emails arrive within 2 minutes
- [ ] Email links work when clicked within 60 minutes
- [ ] Resend links work when clicked within 24 hours
- [ ] Expired links show clear error message
- [ ] Users can verify + access dashboard
- [ ] No "invalid_grant" errors in logs

---

**For questions or debugging**, check server logs:
```bash
# Terminal showing "npm run dev"
# Look for [v0] prefixed logs:
# [v0] signup-with-password: ...
# [v0] auth/callback: ...
# [v0] resend-verification: ...
```
