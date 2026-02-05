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

    // Fetch all services from the services table
    const { data: services, error: servicesError } = await dbClient
      .from("services")
      .select("id, name, description, created_at")
      .order("created_at", { ascending: false })

    if (servicesError) throw servicesError

    // For each service, count how many workers offer it
    const servicesWithCounts = await Promise.all(
      (services || []).map(async (service: any) => {
        const { count } = await supabase
          .from("worker_services")
          .select("id", { count: "exact" })
          .eq("service_id", service.id)

        return {
          id: service.id,
          name: service.name,
          category: "General", // Default category, can be extended
          description: service.description || "",
          workers_count: count || 0,
          created_at: service.created_at,
        }
      })
    )

    return NextResponse.json(servicesWithCounts)
  } catch (err: any) {
    console.error("Error fetching services:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
