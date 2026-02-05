# Email Confirmation - Site URL Configuration

## Current Setup (from code analysis)

Your Supabase Project:
- **Supabase URL**: `https://lxxmminafvdnymwpbqwr.supabase.co`

## Required Environment Variables

### 1. For Local Development (http://localhost:3000)
Add this to your `.env.local` file:

```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://lxxmminafvdnymwpbqwr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4eG1taW5hZnZkbnltd3BicXdyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExODY0MzIsImV4cCI6MjA3Njc2MjQzMn0.Waqv0ON2Sm2m2PDyhnTPaOYJYGMn0ddrh83XVtgPjRc
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4eG1taW5hZnZkbnltd3BicXdyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTE4NjQzMiwiZXhwIjoyMDc2NzYyNDMyfQ.1-7rMkLsjwAQWKoK2wU4B7vUjOg4yijsq0xYz-Ouvio
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 2. For Production (if deployed to Vercel)
Add these environment variables in Vercel dashboard:

```
NEXT_PUBLIC_SUPABASE_URL=https://lxxmminafvdnymwpbqwr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4eG1taW5hZnZkbnltd3BicXdyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExODY0MzIsImV4cCI6MjA3Njc2MjQzMn0.Waqv0ON2Sm2m2PDyhnTPaOYJYGMn0ddrh83XVtgPjRc
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4eG1taW5hZnZkbnltd3BicXdyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTE4NjQzMiwiZXhwIjoyMDc2NzYyNDMyfQ.1-7rMkLsjwAQWKoK2wU4B7vUjOg4yijsq0xYz-Ouvio
NEXT_PUBLIC_SITE_URL=https://your-production-domain.com
```

## Email Callback URLs (Used in Code)

Based on the code analysis, here's what gets calculated:

### Local Development
```
Site URL:        http://localhost:3000
Callback URL:    http://localhost:3000/api/auth/callback
Email Redirect:  http://localhost:3000/api/auth/callback
```

### Production (example with Vercel)
```
Site URL:        https://your-vercel-app.vercel.app
Callback URL:    https://your-vercel-app.vercel.app/api/auth/callback
Email Redirect:  https://your-vercel-app.vercel.app/api/auth/callback
```

## Supabase Dashboard Configuration

### ⚠️ CRITICAL: Email Template Setup

Go to **Supabase Dashboard** → **Authentication** → **Email Templates** and set:

1. **Confirm signup** template:
   - Redirect URL: `http://localhost:3000/api/auth/callback` (for local testing)
   - OR `https://your-domain.com/api/auth/callback` (for production)

2. **Reset password** template:
   - Redirect URL: `http://localhost:3000/forgot-password/reset`
   - OR `https://your-domain.com/forgot-password/reset`

## URL Priority (from code)

The application uses this priority for determining site URL:

1. **First**: `NEXT_PUBLIC_SITE_URL` (if set in .env)
2. **Second**: `NEXT_PUBLIC_VERCEL_URL` (if deployed on Vercel)
3. **Default**: `http://localhost:3000` (fallback for local dev)

## Debug Endpoint

To verify your current configuration, visit:
```
http://localhost:3000/api/debug/auth-config
```

This will show you:
- Current computed Site URL
- Computed Callback URL
- All environment variables being used
- What you should set in Supabase Email Templates

## Step-by-Step Fix

1. **Add to .env.local**:
   ```
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```

2. **Verify in Supabase Dashboard**:
   - Go to Authentication → Email Templates
   - Set "Confirm signup" redirect to: `http://localhost:3000/api/auth/callback`
   - Save

3. **Test**:
   - Sign up at `/signup`
   - You should get email with verification link
   - Clicking link should redirect to callback which exchanges code for session
   - Should redirect to `/signup-success?verified=true`

## Common Issues & Fixes

| Issue | Solution |
|-------|----------|
| Email link not working | Check Supabase Email Template redirect URL matches your Site URL + `/api/auth/callback` |
| "Invalid or expired code" | The callback URL in email template doesn't match the one in code |
| "Failed to exchange code" | Supabase redirect URL is hardcoded wrong or doesn't match your running domain |
| Local testing fails on mobile | Use `http://localhost:3000` only on same machine, or use ngrok/tunnel for remote testing |

## Code Locations (Reference)

- **Signup handler**: `app/api/auth/signup-with-password/route.ts` (line 16)
- **Callback handler**: `app/api/auth/callback/route.ts` (processes verification)
- **Debug endpoint**: `app/api/debug/auth-config/route.ts`
