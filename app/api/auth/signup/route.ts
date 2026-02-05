import { createServerClient } from "@supabase/ssr"
import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { email, password, full_name, phone, location, role } = await request.json()

    const cookieStore = await cookies()
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || (process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : 'http://localhost:3000')
    const emailRedirectTo = process.env.SUPABASE_EMAIL_REDIRECT_TO || `${siteUrl}/api/auth/callback`
    console.log('[v0] signup: siteUrl/emailRedirectTo', { siteUrl, emailRedirectTo, env_SUPABASE_EMAIL_REDIRECT_TO: process.env.SUPABASE_EMAIL_REDIRECT_TO })
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

    console.log('[v0] signup: creating user', { email, role })
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

    console.log('[v0] signup result:', { authData, authError: authError?.message })

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    if (authData.user) {
      // Use a server-only service role Supabase client to insert into `profiles` so RLS doesn't block.
      // This client must use the `SUPABASE_SERVICE_ROLE_KEY` env var and never be exposed to the client.
      if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        console.error('[v0] Missing SUPABASE_SERVICE_ROLE_KEY env var')
        return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
      }

      const serviceClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } },
      )

      // Auto-confirm the user's email so signup is direct (no verification required)
      const { error: updateError } = await serviceClient.auth.admin.updateUserById(authData.user.id, {
        email_confirm: true,
      })

      if (updateError) {
        console.error('[v0] Failed to set email confirmation flag:', updateError)
        // Continue anyway
      }

      // Check if profile already exists to avoid duplicate email error
      const { data: existingProfile, error: checkError } = await serviceClient
        .from("profiles")
        .select("id")
        .eq("email", email)
        .maybeSingle()

      if (checkError) {
        console.warn("[v0] Error checking for existing profile:", checkError)
        // Continue anyway and attempt insert
      }

      if (existingProfile) {
        console.warn("[v0] Profile already exists for email:", email)
        // Update the existing profile instead of inserting
        // Note: DO NOT update the 'id' field - it's a primary key with FK constraint to auth.users
        const { error: updateError } = await serviceClient
          .from("profiles")
          .update({
            full_name,
            phone,
            location: location || "",
            role,
            updated_at: new Date().toISOString(),
          })
          .eq("email", email)

        if (updateError) {
          console.error("[v0] Profile update error:", updateError)
          return NextResponse.json(
            { error: `Failed to update user profile: ${updateError.message || updateError}` },
            { status: 500 },
          )
        }
        console.log("[v0] Existing profile updated for email:", email)
      } else {
        // Insert new profile
        const { error: profileError, status, data: profileData } = await serviceClient
          .from("profiles")
          .insert([
            {
              id: authData.user.id,
              email,
              full_name,
              phone,
              location: location || "",
              role,
              profile_tier: 'basic',
              badge_verified: false,
              created_at: new Date().toISOString(),
            },
          ])

        if (profileError) {
          console.error("[v0] Profile creation error:", profileError)
          // Check if it's a duplicate email constraint error
          if (profileError.message && profileError.message.includes("duplicate key")) {
            return NextResponse.json(
              { error: "This email is already registered. Please use a different email or log in instead." },
              { status: 409 },
            )
          }
          return NextResponse.json(
            { error: `Failed to create user profile: ${profileError.message || profileError}` },
            { status: 500 },
          )
        }

        console.log('[v0] Profile created (insert):', { status, profileData })
      }

      // Log profile update/create outcome safely
      try {
        console.log('[v0] Profile create/update result:', {
          status: typeof status !== 'undefined' ? status : null,
          profileData: typeof profileData !== 'undefined' ? profileData : null,
          existingProfile: !!existingProfile,
        })
      } catch (e) {
        // Defensive: avoid throwing from logging
      }
    }

    return NextResponse.json({ 
      message: "Signup successful. Account created and confirmed.", 
      user: authData.user,
      note: "Account is active—no email verification required."
    }, { status: 200 })
  } catch (error) {
    console.error("[v0] Signup API error:", error)
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 })
  }
}
