import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(request: Request, context: any) {
  try {
    let params = context?.params
    if (params && typeof params.then === 'function') params = await params
    const jobId = params?.id
    if (!jobId) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

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


    // Fetch job details with client information
    const { data: job, error } = await supabase
      .from("jobs")
      .select(
        `
        id,
        title,
        description,
        status,
        budget,
        duration,
        location,
        created_at,
        client_id,
        profiles (full_name)
      `
      )
      .eq("id", jobId)
      .single()

    if (error) throw error
    if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 })

    // Get application count for this job
    const { count: applicationsCount, error: countError } = await supabase
      .from("job_applications")
      .select("id", { count: "exact", head: true })
      .eq("job_id", jobId)

    // Format response to match expected structure
    const clientProfile = Array.isArray(job.profiles) ? job.profiles[0] : job.profiles
    const formattedJob = {
      id: job.id,
      title: job.title,
      description: job.description,
      status: job.status || "open",
      budget: job.budget || 0,
      duration: job.duration,
      location: job.location,
      created_at: job.created_at,
      client_id: job.client_id,
      client_name: clientProfile?.full_name || "Unknown Client",
      applications_count: countError ? 0 : applicationsCount || 0,
    }

    return NextResponse.json(formattedJob)
  } catch (err: any) {
    console.error("[admin/jobs/:id GET] Error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(request: Request, context: any) {
  try {
    let params = context?.params
    if (params && typeof params.then === 'function') params = await params
    const jobId = params?.id
    if (!jobId) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

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
    // Delete the job
    const { error } = await supabase
      .from("jobs")
      .delete()
      .eq("id", jobId)

    if (error) {
      console.error('[admin/jobs/:id DELETE] supabase error:', error)
      return NextResponse.json({ error: 'Failed to delete job', details: error.message ?? String(error) }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("[admin/jobs/:id] Error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
