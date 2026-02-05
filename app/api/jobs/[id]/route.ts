import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, context: any) {
  try {
    let params = context?.params
    if (params && typeof params.then === "function") params = await params
    const id = params?.id
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

  const { data, error } = await supabase.from("jobs").select("*").eq("id", id).limit(1).maybeSingle()

  if (error) throw error

  return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching job:", error)
    return NextResponse.json({ error: "Failed to fetch job" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, context: any) {
  try {
    let params = context?.params
    if (params && typeof params.then === "function") params = await params
    const id = params?.id
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

    const body = await request.json()

    // Verify job ownership (defensive)
    const { data: job, error: fetchError } = await supabase
      .from("jobs")
        .select("client_id")
      .eq("id", id)
      .limit(1)
      .maybeSingle()

    if (fetchError) {
      console.error("[v0] Error fetching job poster for", params.id, fetchError)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

      if (!job || job.client_id !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data, error } = await supabase
      .from("jobs")
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .limit(1)
      .maybeSingle()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error updating job:", error)
    return NextResponse.json({ error: "Failed to update job" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, context: any) {
  try {
    let params = context?.params
    if (params && typeof params.then === "function") params = await params
    const id = params?.id
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

    // Verify job ownership (defensive)
    const { data: job, error: fetchError } = await supabase
      .from("jobs")
        .select("client_id")
      .eq("id", id)
      .limit(1)
      .maybeSingle()

    if (fetchError) {
      console.error("[v0] Error fetching job poster for delete", params?.id, fetchError)
      return NextResponse.json({ error: "Failed to verify job ownership", details: String(fetchError) }, { status: 500 })
    }

    if (!job || job.client_id !== user.id) {
      return NextResponse.json({ error: "Forbidden: you are not the owner of this job" }, { status: 403 })
    }

  // Soft-archive the job instead of hard-deleting it
  const { data: archivedJob, error: archiveError } = await supabase
    .from("jobs")
    .update({ archived: true, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .limit(1)
    .maybeSingle()

    if (archiveError) {
      console.error('[api/jobs/[id] DELETE] archive error:', archiveError)
      return NextResponse.json({ error: 'Failed to archive job', details: archiveError?.message ?? String(archiveError) }, { status: 500 })
    }

    return NextResponse.json({ success: true, archived: archivedJob })
  } catch (error) {
    console.error("Error deleting job:", error)
    return NextResponse.json({ error: "Failed to delete job", details: String(error) }, { status: 500 })
  }
}
