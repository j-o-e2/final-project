import { createClient } from "@supabase/supabase-js"
import { type NextRequest, NextResponse } from "next/server"

/**
 * Resend verification email - can be called by users if their link expired.
 * This uses a magic link (OTP) approach which can have longer expiry configured in Supabase.
 */
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || (process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : 'http://localhost:3000')
    const redirectTo = `${siteUrl}/api/auth/callback`

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } },
    )

    console.log('[v0] resend-verification: sending magic link to', email)

    // Send a magic link (OTP) - this is more flexible and can have longer expiry
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo,
        shouldCreateUser: false, // Don't create a new user, only verify existing
      },
    })

    if (error) {
      console.error('[v0] resend-verification error:', error.message)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    console.log('[v0] Magic link sent to', email)
    return NextResponse.json({
      message: "Verification link sent! Check your email (valid for 24 hours)",
    }, { status: 200 })
  } catch (err: any) {
    console.error("[v0] resend-verification error:", err)
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 })
  }
}
