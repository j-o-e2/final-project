/**
 * Diagnostic script to test email verification flow
 * Run this manually to verify your Supabase email settings are correct
 * 
 * Usage: node scripts/test-email-verification.js
 */

const https = require('https')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing environment variables:')
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', SUPABASE_URL ? '✓' : '✗')
  console.error('   NEXT_PUBLIC_SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY ? '✓' : '✗')
  process.exit(1)
}

console.log('📋 Email Verification Configuration Checklist:\n')

console.log('✓ Environment variables loaded')
console.log(`  Project URL: ${SUPABASE_URL}`)
console.log(`  Anon Key: ${SUPABASE_ANON_KEY.substring(0, 20)}...\n`)

console.log('📌 ACTION REQUIRED: Go to your Supabase Dashboard and verify:\n')

console.log('1️⃣  Email OTP Expiration')
console.log('   Path: Authentication → Providers → Email')
console.log('   Setting: "OTP Expiration"')
console.log('   Value: Set to 86400 seconds (24 hours)\n')

console.log('2️⃣  Confirm Signup Email Template')
console.log('   Path: Authentication → Email Templates')
console.log('   Template: "Confirm signup"')
console.log('   Redirect URL: Should contain {{ .ConfirmationURL }}\n')

console.log('3️⃣  Site URL Configuration')
console.log('   Path: Settings → General')
console.log('   Site URL: Should match your deployment URL')
console.log(`   Local: http://localhost:3000`)
console.log(`   Production: https://your-domain.com\n`)

console.log('4️⃣  Redirect URLs (Allowed)')
console.log('   Path: Authentication → URL Configuration')
console.log('   Add these:')
console.log('   - http://localhost:3000/**')
console.log('   - https://your-domain.com/**\n')

console.log('🔍 Test Email Link Expiry:')
console.log('   1. Sign up a new account')
console.log('   2. Note the time')
console.log('   3. Wait 30 minutes')
console.log('   4. Click the email verification link')
console.log('   5. Should work if OTP expiry is set to 24 hours\n')

console.log('❌ If you still see "Token Expired":')
console.log('   - Check that Site URL in Supabase matches your current URL')
console.log('   - Clear browser cookies and try again')
console.log('   - Check email spam folder')
console.log('   - Try the "Resend Verification Email" button\n')
