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

    // Generate mock analytics data (replace with real queries as needed)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // User growth simulation (last 30 days)
    const userGrowth = Array.from({ length: 30 }, (_, i) => {
      const date = new Date(thirtyDaysAgo)
      date.setDate(date.getDate() + i)
      return {
        date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        users: Math.floor(Math.random() * 50) + 100 + i * 2,
      }
    })

    // Job trends
    const jobTrends = Array.from({ length: 30 }, (_, i) => {
      const date = new Date(thirtyDaysAgo)
      date.setDate(date.getDate() + i)
      return {
        date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        jobs: Math.floor(Math.random() * 30) + 10,
        completed: Math.floor(Math.random() * 20) + 5,
      }
    })

    // Get real data from Supabase
    const { data: profiles } = await supabase.from("profiles").select("role")
    const { data: jobs } = await supabase.from("jobs").select("status")
    const { data: services } = await supabase.from("services").select("*")

    // Users by role
    const roleCounts = {
      worker: profiles?.filter(p => p.role === "worker").length || 0,
      client: profiles?.filter(p => p.role === "client").length || 0,
      admin: profiles?.filter(p => p.role === "admin").length || 0,
    }

    const usersByRole = [
      { name: "Workers", value: roleCounts.worker },
      { name: "Clients", value: roleCounts.client },
      { name: "Admins", value: roleCounts.admin },
    ].filter(r => r.value > 0)

    // Top services
    const topServices = services
      ?.slice(0, 5)
      .map((s: any) => ({
        name: s.name || s.category,
        count: Math.floor(Math.random() * 50) + 10,
      })) || []

    // Application status
    const { data: applications } = await supabase.from("job_applications").select("status")
    const statusCounts = {
      pending: applications?.filter(a => a.status === "pending").length || 0,
      accepted: applications?.filter(a => a.status === "accepted").length || 0,
      rejected: applications?.filter(a => a.status === "rejected").length || 0,
    }

    const applicationStats = [
      { status: "Pending", count: statusCounts.pending },
      { status: "Accepted", count: statusCounts.accepted },
      { status: "Rejected", count: statusCounts.rejected },
    ]

    return NextResponse.json({
      userGrowth,
      jobTrends,
      topServices,
      usersByRole,
      applicationStats,
    })
  } catch (err: any) {
    console.error("[admin/analytics] Error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
