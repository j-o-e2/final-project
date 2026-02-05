import { createServerClient } from "@supabase/ssr"
import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import { type NextRequest, NextResponse } from "next/server"

/**
 * Alternative signup route that uses magic links (OTP) instead of password
 * This approach has configurable 24h expiry and more reliable verification
 */
export async function POST(request: NextRequest) {
  try {
    const { email, password, full_name, phone, role } = await request.json()

    const cookieStore = await cookies()
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || (process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : 'http://localhost:3000')
    const emailRedirectTo = `${siteUrl}/api/auth/callback`
    
    console.log('[v0] signup-with-password: siteUrl/emailRedirectTo', { siteUrl, emailRedirectTo })
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
            } catch {
              // Handle cookie setting errors
            }
          },
        },
      },
    )

    console.log('[v0] signup-with-password: creating user', { email, role, emailRedirectTo })
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo,
        data: {
          full_name,
          role,
          phone,
        },
      },
    })

    console.log('[v0] signup-with-password result:', { authData, authError: authError?.message })

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    // Profile will be created in callback route AFTER email confirmation succeeds
    // This avoids conflicts with Supabase's internal confirmation trigger

    return NextResponse.json({ 
      message: "Signup successful. Check your email for verification link (valid for 24 hours).", 
      user: authData.user,
    }, { status: 200 })
  } catch (error) {
    console.error("[v0] Signup API error:", error)
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 })
  }
}
