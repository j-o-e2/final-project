import { createServerClient } from "@supabase/ssr"
import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    const cookieStore = await cookies()

    // If the SUPABASE_SERVICE_ROLE_KEY is available, use a service-role client
    // to bypass RLS when checking profiles and sending reset emails. This
    // prevents accidental 404s when the anon key is not permitted to read
    // the `profiles` table.
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    let profile: any = null
    let profileError: any = null
    let resetError: any = null

    if (serviceRoleKey) {
      const serviceClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey, {
        auth: { persistSession: false },
      })

      // Check for profile using service client (bypasses RLS)
      const { data, error } = await serviceClient
        .from("profiles")
        .select("id")
        .eq("email", email)
        .limit(1)
        .maybeSingle()

      profile = data
      profileError = error

      if (profileError || !profile) {
        return NextResponse.json({ error: "Email not found in our system" }, { status: 404 })
      }

      // Use the service client to send the reset email
      // resetPasswordForEmail is available on the auth client
      // (use `any` to avoid typing mismatch with different supabase versions)
      const res = await (serviceClient.auth as any).resetPasswordForEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/forgot-password/reset`,
      })
      resetError = res?.error
    } else {
      // Fallback: use server client built with the anon key (existing behavior)
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

      // Defensive: check for duplicates and use maybeSingle
      const { count, error: countError } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("email", email)

      if (countError) {
        console.error("[v0] Error counting profiles by email", email, countError)
      } else if (typeof count === "number" && count > 1) {
        console.warn("[v0] Duplicate profiles found for email", email, "count=", count)
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", email)
        .limit(1)
        .maybeSingle()

      profile = data
      profileError = error

      if (profileError || !profile) {
        return NextResponse.json({ error: "Email not found in our system" }, { status: 404 })
      }

      const { error: _resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/forgot-password/reset`,
      })

      resetError = _resetError
    }

    if (resetError) {
      console.error("[v0] Password reset error:", resetError)
      return NextResponse.json({ error: "Failed to send reset email" }, { status: 400 })
    }

    return NextResponse.json({ message: "Password reset email sent successfully" }, { status: 200 })
  } catch (error) {
    console.error("[v0] Forgot password API error:", error)
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 })
  }
}
