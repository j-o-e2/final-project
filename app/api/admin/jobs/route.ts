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
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      }
    )

    // Determine requesting user and their profile (for location/role)
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

    // If the requesting user is an admin and we have a service role key,
    // use a privileged client to bypass RLS and return all jobs.
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    let privilegedClient: any = null
    if (userProfile && userProfile.role === "admin" && supabaseUrl && serviceKey) {
      privilegedClient = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })
    }

    // Base query for jobs with client details (use privileged client for admins)
    const dbClient = privilegedClient || supabase
    let jobsQuery: any = dbClient
      .from("jobs")
      .select(
        `
        id,
        title,
        status,
        budget,
        created_at,
        location,
        client_id,
        profiles (full_name)
      `
      )
      .order("created_at", { ascending: false })

    // Enforce server-side restrictions for non-admin users: only open jobs in user's location
    if (!userProfile || userProfile.role !== "admin") {
      if (userProfile && userProfile.location) {
        jobsQuery = jobsQuery.eq("location", userProfile.location)
      }
      jobsQuery = jobsQuery.eq("status", "open")
    }

    // For admins, only show jobs that have active disputes (problems)
    if (userProfile && userProfile.role === "admin" && privilegedClient) {
      try {
        const { data: disputeRows } = await privilegedClient
          .from("disputes")
          .select("job_id")
          .in("status", ["open", "assigned", "under_review"])

        const jobIds = Array.from(new Set((disputeRows || []).map((r: any) => r.job_id).filter(Boolean)))

        if (jobIds.length === 0) {
          // No problematic jobs — return empty list
          return NextResponse.json([])
        }

        jobsQuery = jobsQuery.in("id", jobIds)
      } catch (e) {
        console.error("Error fetching disputed jobs:", e)
        // fallback to previous behavior if dispute query fails
      }
    }

    const { data: jobs, error } = await jobsQuery

    if (error) throw error

    // Get application counts for each job
    const jobsWithApplications = await Promise.all(
      (jobs || []).map(async (job: any) => {
        const { count, error: countError } = await dbClient
          .from("job_applications")
          .select("id", { count: "exact", head: true })
          .eq("job_id", job.id)

        return {
          id: job.id,
          title: job.title,
          client_name: job.profiles?.full_name || "Unknown Client",
          status: job.status || "open",
          budget: job.budget || 0,
          applications_count: countError ? 0 : count || 0,
          created_at: job.created_at,
        }
      })
    )

    return NextResponse.json(jobsWithApplications)
  } catch (err: any) {
    console.error("Error fetching admin jobs:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
