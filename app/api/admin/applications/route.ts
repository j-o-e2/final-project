import { createServerClient } from "@supabase/ssr"
import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET() {
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

    try {
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

    // Fetch all job applications with job and worker details
    const { data: applications, error } = await dbClient
      .from("job_applications")
      .select(
        `
        id,
        job_id,
        provider_id,
        status,
        cover_letter,
        created_at,
        jobs (id, title),
        profiles!job_applications_provider_id_fkey (id, full_name)
      `
      )
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Supabase error:", error)
      throw error
    }

    const formatted = (applications || []).map((app: any) => ({
      id: app.id,
      job_title: app.jobs?.title || "Unknown Job",
      applicant_name: app.profiles?.full_name || "Unknown Applicant",
      status: app.status || "pending",
      applied_at: app.created_at,
      message: app.cover_letter || "",
    }))

    return NextResponse.json(formatted)
  } catch (err: any) {
    console.error("Error fetching applications:", err)
    return NextResponse.json({ error: err.message || "Failed to fetch applications" }, { status: 500 })
  }
}
