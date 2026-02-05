import { createServerClient } from "@supabase/ssr"
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

    // Return mock reports data (replace when reports table exists)
    const reports: any[] = [
      {
        id: "1",
        type: "user",
        reporter_id: "user1",
        reporter_name: "John Doe",
        target_id: "user2",
        target_name: "Jane Smith",
        reason: "Inappropriate behavior",
        description: "User was rude during messaging",
        status: "open",
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: "2",
        type: "job",
        reporter_id: "user3",
        reporter_name: "Bob Johnson",
        target_id: "job1",
        target_name: "Job: Plumbing Repair",
        reason: "Scam/fraudulent",
        description: "Suspicious job posting asking for upfront payment",
        status: "investigating",
        created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: "3",
        type: "user",
        reporter_id: "user4",
        reporter_name: "Alice Brown",
        target_id: "user5",
        target_name: "Charlie Davis",
        reason: "Non-payment",
        description: "Worker did not complete the job",
        status: "resolved",
        created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ]

    return NextResponse.json(reports)
  } catch (err: any) {
    console.error("[admin/reports] Error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
