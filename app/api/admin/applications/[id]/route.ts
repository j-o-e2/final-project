import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
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

    const appId = params.id
    const body = await request.json()
    const { status } = body

    if (!status) {
      return NextResponse.json({ error: "Status is required" }, { status: 400 })
    }

    // Ensure caller is an admin
    const { data: userData, error: userErr } = await supabase.auth.getUser()
    if (userErr || !userData?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const userId = userData.user.id
    const { data: profileRow, error: profileErr } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single()

    if (profileErr || !profileRow) {
      return NextResponse.json({ error: "Unable to verify admin role" }, { status: 403 })
    }

    if (profileRow.role !== "admin") {
      return NextResponse.json({ error: "Admin privileges required" }, { status: 403 })
    }

    // Validate allowed status values for job_applications
    const allowed = ["pending", "accepted", "rejected", "withdrawn"]
    if (!allowed.includes(status)) {
      return NextResponse.json({ error: `Invalid status. Allowed: ${allowed.join(", ")}` }, { status: 400 })
    }

    // Update the application status and return updated row
    const { data: updated, error } = await supabase
      .from("job_applications")
      .update({ status })
      .eq("id", appId)
      .select("id, job_id, provider_id, status, cover_letter, created_at")
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, application: updated })
  } catch (err: any) {
    console.error("[admin/applications/:id] Error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
