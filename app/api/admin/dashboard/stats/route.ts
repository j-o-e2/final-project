import { createServerClient } from "@supabase/ssr"
import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

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

    // Determine requesting user and profile to decide if we should use a privileged client
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

    // Use privileged client when admin and service role key is available to bypass RLS
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    let dbClient: any = supabase
    if (userProfile && userProfile.role === "admin" && supabaseUrl && serviceKey) {
      dbClient = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })
    }

    // Fetch stats in parallel
    const [
      { count: totalUsers },
      { count: totalJobs },
      { data: activeJobsData },
      { data: applicationsData },
      { count: servicesCount },
      { data: reviewsData },
      { data: topWorker },
    ] = await Promise.all([
      dbClient.from("profiles").select("*", { count: "exact", head: true }),
      dbClient.from("jobs").select("*", { count: "exact", head: true }),
      dbClient.from("jobs").select("id").eq("status", "active"),
      dbClient.from("job_applications").select("*", { count: "exact", head: true }),
      dbClient.from("services").select("*", { count: "exact", head: true }),
      dbClient.from("reviews").select("*"),
      dbClient
        .from("reviews")
        .select("worker_id")
        .order("rating", { ascending: false })
        .limit(1)
        .single(),
    ])

    const activeJobs = activeJobsData?.length || 0
    const applications = applicationsData?.length || 0
    const services = servicesCount || 0
    
    // Calculate pending applications
    const { count: pendingCount } = await dbClient
      .from("job_applications")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending")

    // Calculate average rating and reviews
    let averageRating = 0
    let totalReviews = 0
    let topWorkerName = null

    if (reviewsData && reviewsData.length > 0) {
      totalReviews = reviewsData.length
      averageRating = reviewsData.reduce((sum, r) => sum + (r.rating || 0), 0) / totalReviews

      if (topWorker && topWorker.worker_id) {
          const { data: workerProfile } = await dbClient
            .from("profiles")
            .select("full_name")
            .eq("id", topWorker.worker_id)
            .single()
        topWorkerName = workerProfile?.full_name || null
      }
    }

    // Estimate active users (logged in last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { count: activeUsers } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("updated_at", thirtyDaysAgo.toISOString())

    return NextResponse.json({
      totalUsers: totalUsers || 0,
      activeUsers: activeUsers || 0,
      totalJobs: totalJobs || 0,
      activeJobs,
      totalApplications: applications || 0,
      pendingApplications: pendingCount || 0,
      totalServices: services || 0,
      totalReviews,
      averageRating,
      topWorkerByRating: topWorkerName,
    })
  } catch (err: any) {
    console.error("[admin/dashboard/stats] Error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
