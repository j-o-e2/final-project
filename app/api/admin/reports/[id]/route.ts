import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { type NextRequest, NextResponse } from "next/server"

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

    // Get mock reports data (replace with real reports table when implemented)
    // For now, return empty array
    const reports: any[] = []

    return NextResponse.json(reports)
  } catch (err: any) {
    console.error("[admin/reports] Error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: any }) {
  try {
    const { id } = params
    const body = await request.json()

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

    // Update report status (when reports table exists)
    // For now, just return success
    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("[admin/reports PATCH] Error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, context: any) {
  try {
    let params = context?.params
    if (params && typeof params.then === 'function') params = await params
    const id = params?.id
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    // Delete report (when reports table exists)
    // For now, just return success
    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("[admin/reports DELETE] Error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
