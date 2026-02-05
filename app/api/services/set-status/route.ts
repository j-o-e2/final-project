import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(req: Request) {
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
          setAll(cookiesToSet: any) {
            try {
              cookiesToSet.forEach(({ name, value, options }: any) => cookieStore.set(name, value, options))
            } catch {}
          },
        },
      }
    )

    // Ensure authenticated user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Read raw request body for better diagnostics (parse JSON if possible)
    const rawText = await req.text().catch(() => '')
    let body: any = {}
    try {
      body = rawText ? JSON.parse(rawText) : {}
    } catch (e) {
      body = { raw: rawText }
    }
    const serviceId = body?.serviceId || body?.service_id || body?.id
    const status = body?.status

    if (!serviceId || !status) {
      return NextResponse.json({ error: 'Missing serviceId or status' }, { status: 400 })
    }

    // Ownership check using the authenticated user (via server client)
    const { data: serviceRow, error: svcErr } = await supabase
      .from('services')
      .select('provider_id')
      .eq('id', serviceId)
      .limit(1)
      .maybeSingle()

    if (svcErr) {
      console.error('[api/services/set-status] failed fetching service', svcErr)
      return NextResponse.json({ error: 'Failed to fetch service' }, { status: 500 })
    }

    if (!serviceRow || serviceRow.provider_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Use service role key to perform the update (bypass RLS)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceKey) {
      console.error('[api/services/set-status] missing service role key or URL', {
        NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY_present: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      })
      return NextResponse.json({ error: 'Server misconfiguration', details: { NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY_present: !!process.env.SUPABASE_SERVICE_ROLE_KEY } }, { status: 500 })
    }

    const svc = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

    const resp = await svc
      .from('services')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', serviceId)
      .select()
      .maybeSingle()

    if (resp.error) {
      console.error('[api/services/set-status] update error', resp.error)
      return NextResponse.json({ error: 'Failed to update service status', details: resp.error?.message ?? String(resp.error), bodyReceived: body }, { status: 500 })
    }

    return NextResponse.json({ success: true, updated: resp.data })
  } catch (err: any) {
    // Include available debugging context in logs
    console.error('[api/services/set-status] unexpected error', {
      error: err?.message ?? String(err),
      stack: err?.stack,
    })
    return NextResponse.json({ error: 'Internal server error', details: String(err), hint: 'See server logs for stack trace' }, { status: 500 })
  }
}
