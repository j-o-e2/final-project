import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()

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

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Defensive: check for duplicates and use maybeSingle to avoid coercion errors
    const { count, error: countError } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("id", user.id)

    if (countError) {
      console.error("[v0] Error counting profiles for user", user.id, countError)
    } else if (typeof count === "number" && count > 1) {
      console.warn("[v0] Duplicate profiles found for user id", user.id, "count=", count)
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error("[v0] Failed to fetch user role for", user.id, error)
      return NextResponse.json({ error: "Failed to fetch user role" }, { status: 500 })
    }

    return NextResponse.json({ role: profile?.role || "worker" })
  } catch (err) {
    console.error("[v0] Error fetching user role:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
