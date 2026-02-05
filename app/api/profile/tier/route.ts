import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options),
              )
            } catch (error) {
              console.error("Cookie error:", error)
            }
          },
        },
      },
    )

    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json(
        { ok: false, error: "User ID is required" },
        { status: 400 },
      )
    }

    // Call the calculate_user_tier function
    const { data, error } = await supabase.rpc("calculate_user_tier", {
      user_id: userId,
    })

    if (error) {
      console.error("[Profile Tier] Error updating tier:", error)
      return NextResponse.json(
        {
          ok: false,
          error: "Failed to update profile tier",
          details: error.message,
        },
        { status: 500 },
      )
    }

    // Fetch updated profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("profile_tier, badge_verified, avg_rating, total_reviews")
      .eq("id", userId)
      .single()

    if (profileError) {
      console.error("[Profile Tier] Error fetching updated profile:", profileError)
      return NextResponse.json(
        {
          ok: false,
          error: "Failed to fetch updated profile",
          details: profileError.message,
        },
        { status: 500 },
      )
    }

    console.log(`[Profile Tier] User ${userId} tier updated to: ${profile.profile_tier}`)

    return NextResponse.json({
      ok: true,
      data: {
        tier: profile.profile_tier,
        badge_verified: profile.badge_verified,
        avg_rating: profile.avg_rating,
        total_reviews: profile.total_reviews,
      },
    })
  } catch (err: any) {
    console.error("[Profile Tier] Server error:", err)
    return NextResponse.json(
      {
        ok: false,
        error: "Internal server error",
        details: err.message,
      },
      { status: 500 },
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options),
              )
            } catch (error) {
              console.error("Cookie error:", error)
            }
          },
        },
      },
    )

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 },
      )
    }

    // Fetch user profile tier info
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("profile_tier, badge_verified, avg_rating, total_reviews, created_at")
      .eq("id", user.id)
      .single()

    if (profileError) {
      console.error("[Profile Tier] Error fetching profile:", profileError)
      return NextResponse.json(
        {
          ok: false,
          error: "Failed to fetch profile",
          details: profileError.message,
        },
        { status: 500 },
      )
    }

    // Calculate tier progress
    const tierProgression = {
      tier: profile.profile_tier,
      badge_verified: profile.badge_verified,
      avg_rating: profile.avg_rating,
      total_reviews: profile.total_reviews,
      tier_info: getTierInfo(profile.profile_tier, profile.avg_rating, profile.total_reviews),
    }

    return NextResponse.json({
      ok: true,
      data: tierProgression,
    })
  } catch (err: any) {
    console.error("[Profile Tier] Server error:", err)
    return NextResponse.json(
      {
        ok: false,
        error: "Internal server error",
        details: err.message,
      },
      { status: 500 },
    )
  }
}

// Helper function to get tier information and progress
function getTierInfo(
  tier: string,
  avgRating: number,
  totalReviews: number,
): Record<string, any> {
  const tiers = {
    basic: {
      name: "Basic",
      description: "New account",
      icon: "⭕",
      color: "#6B7280",
      nextTier: "verified",
      requirements: "1 review with 3+ stars",
      progress: Math.min((totalReviews / 1) * 100, 100),
    },
    verified: {
      name: "Verified",
      description: "Email verified & 1 review",
      icon: "✓",
      color: "#3B82F6",
      nextTier: "trusted",
      requirements: "10 reviews with 4+ average rating",
      progress: Math.min((Math.min(totalReviews, 10) / 10) * 100, 100),
    },
    trusted: {
      name: "Trusted",
      description: "10+ reviews, 4+ rating",
      icon: "⭐",
      color: "#F59E0B",
      nextTier: "elite",
      requirements: "50 reviews with 4.8+ average rating",
      progress: Math.min((Math.min(totalReviews, 50) / 50) * 100, 100),
    },
    elite: {
      name: "Elite",
      description: "50+ reviews, 4.8+ rating",
      icon: "👑",
      color: "#DC2626",
      nextTier: "pro",
      requirements: "6+ months membership",
      progress: 100,
    },
    pro: {
      name: "Pro",
      description: "Dedicated support & priority",
      icon: "🏆",
      color: "#7C3AED",
      nextTier: null,
      requirements: "Maximum tier achieved",
      progress: 100,
    },
  }

  return tiers[tier as keyof typeof tiers] || tiers.basic
}
