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

    // Determine user and use privileged client for admins
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

    // Get all reviews with reviewer and reviewee info
    const { data: reviews, error: reviewsError } = await dbClient
      .from("reviews")
      .select(`
        *,
        reviewer:reviewer_id ( id, full_name, email, avatar_url ),
        reviewee:reviewee_id ( id, full_name, email, avatar_url )
      `)
      .order("created_at", { ascending: false })

    if (reviewsError) throw reviewsError

    // Group reviews by reviewee (person being reviewed)
    const revieweeMap = new Map<string, any>()

    for (const review of reviews || []) {
      const revieweeId = review.reviewee_id
      if (!revieweeMap.has(revieweeId)) {
        const reviewee = review.reviewee
        if (reviewee) {
          revieweeMap.set(revieweeId, {
            id: reviewee.id,
            name: reviewee.full_name,
            email: reviewee.email,
            avatar_url: reviewee.avatar_url,
            reviews: [],
            totalRating: 0,
            count: 0,
          })
        }
      }

      const reviewee = revieweeMap.get(revieweeId)
      if (reviewee && review.reviewer) {
        reviewee.reviews.push({
          id: review.id,
          reviewer_name: review.reviewer.full_name,
          reviewer_avatar: review.reviewer.avatar_url,
          rating: review.rating,
          comment: review.comment,
          created_at: review.created_at,
        })
        reviewee.totalRating += review.rating || 0
        reviewee.count += 1
      }
    }

    // Convert to array and calculate averages
    const workers = Array.from(revieweeMap.values()).map(w => ({
      id: w.id,
      name: w.name,
      email: w.email,
      avatar_url: w.avatar_url,
      avgRating: w.count > 0 ? w.totalRating / w.count : 0,
      totalReviews: w.count,
      reviews: w.reviews,
    }))

    return NextResponse.json(workers)
  } catch (err: any) {
    console.error("[admin/reviews] Error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
