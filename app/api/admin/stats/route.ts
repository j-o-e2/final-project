import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    console.log("[admin-stats] Request received")

    // Create admin client with service role key
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    // Get auth token from Authorization header (sent by fetch from client)
    const authHeader = request.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      console.log("[admin-stats] No Bearer token in Authorization header")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.substring(7) // Remove "Bearer "
    console.log("[admin-stats] Got auth token, length:", token.length)

    // Use token to verify user and get their ID
    const { data: { user }, error: userError } = await adminClient.auth.getUser(token)
    
    if (userError || !user) {
      console.log("[admin-stats] Invalid token:", userError?.message)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[admin-stats] Verified user:", user.id)

    // Check if user is admin
    const { data: adminProfile, error: profileError } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle()

    console.log("[admin-stats] Admin check:", { role: adminProfile?.role, error: profileError?.message })

    if (profileError) {
      console.log("[admin-stats] Profile query error:", profileError)
      return NextResponse.json({ error: "Profile fetch error" }, { status: 500 })
    }

    if (!adminProfile || adminProfile.role !== "admin") {
      console.log("[admin-stats] User is not admin")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Fetch stats
    console.log("[admin-stats] Fetching counts...")
    
    const { count: totalUsers, error: usersError } = await adminClient
      .from("profiles")
      .select("*", { count: "exact", head: true })

    const { count: totalJobs, error: jobsError } = await adminClient
      .from("jobs")
      .select("*", { count: "exact", head: true })

    const { count: activeJobs, error: activeError } = await adminClient
      .from("jobs")
      .select("*", { count: "exact", head: true })
      .eq("status", "open")

    const { count: totalApplications, error: appsError } = await adminClient
      .from("job_applications")
      .select("*", { count: "exact", head: true })

    if (usersError || jobsError || activeError || appsError) {
      console.log("[admin-stats] Query errors:", { usersError: usersError?.message, jobsError: jobsError?.message, activeError: activeError?.message, appsError: appsError?.message })
      // Still return what we got
    }

    const result = {
      totalUsers: totalUsers || 0,
      totalJobs: totalJobs || 0,
      activeJobs: activeJobs || 0,
      totalApplications: totalApplications || 0,
    }

    console.log("[admin-stats] Returning:", result)
    return NextResponse.json(result)
  } catch (err: any) {
    console.error("[admin-stats] Catch error:", err.message)
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 })
  }
}
