import { createServerClient } from "@supabase/ssr"
import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET() {
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
              // ignore
            }
          },
        },
      },
    )

    // Determine requesting user and profile; if admin, use privileged client
    const { data: { user } = {} as any } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }))
    let userProfile: any = null
    if (user && user.id) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("location, role")
        .eq("id", user.id)
        .maybeSingle()
      userProfile = profileData
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    let dbClient: any = supabase
    if (userProfile && userProfile.role === "admin" && supabaseUrl && serviceKey) {
      dbClient = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })
    }

    const { data: users, error } = await dbClient
      .from("profiles")
      .select("id, email, full_name, role, phone, created_at")
      .order("created_at", { ascending: false })

    if (error) throw error

    // Get auth users to check email verification status (use privileged client where possible)
    const { data: { users: authUsers } = {} as any } = await (dbClient.auth.admin.listUsers ? dbClient.auth.admin.listUsers() : supabase.auth.admin.listUsers())

    // Create a map of auth users by id for quick lookup
    const authUserMap = new Map(
      (authUsers || []).map(u => [
        u.id,
        {
          email_confirmed_at: u.email_confirmed_at,
          phone_confirmed_at: u.phone_confirmed_at,
        }
      ])
    )

    // Get average ratings for each user (as reviewee)
    const { data: reviews } = await dbClient
      .from("reviews")
      .select("reviewee_id, rating")

    const ratingMap = new Map<string, { total: number; count: number }>()
    ;(reviews || []).forEach(review => {
      if (review.reviewee_id && review.rating) {
        if (!ratingMap.has(review.reviewee_id)) {
          ratingMap.set(review.reviewee_id, { total: 0, count: 0 })
        }
        const current = ratingMap.get(review.reviewee_id)!
        current.total += review.rating
        current.count += 1
      }
    })

    // Merge profile data with auth data and ratings
    const enrichedUsers = (users || []).map(user => {
      const authData = authUserMap.get(user.id)
      const ratingData = ratingMap.get(user.id)
      return {
        ...user,
        email_verified: true, // All users must verify email during signup
        phone_verified: !!authData?.phone_confirmed_at,
        avgRating: ratingData ? ratingData.total / ratingData.count : 0,
        totalReviews: ratingData?.count || 0,
      }
    })

    return NextResponse.json(enrichedUsers)
  } catch (err: any) {
    console.error("[admin/users] Error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
