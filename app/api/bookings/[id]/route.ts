import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function DELETE(req: Request, context: any) {
  try {
    let params = context?.params
    if (params && typeof params.then === 'function') params = await params
    const id = params?.id
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    // Quick diagnostic logs to help track why clients might see empty responses
    try {
      const authHeader = (req as any)?.headers?.get?.('authorization') || null
      console.info('[api/bookings/[id] DELETE] incoming request', { id, method: 'DELETE', authHeader })
    } catch (logErr) {
      console.info('[api/bookings/[id] DELETE] incoming request - unable to read headers', String(logErr))
    }

    const cookieStore = await cookies()
    try {
      const cookieCount = (cookieStore.getAll && cookieStore.getAll().length) || 0
      console.info('[api/bookings/[id] DELETE] cookie store size', { id, cookieCount })
    } catch (logErr) {
      console.info('[api/bookings/[id] DELETE] cookie read failed', String(logErr))
    }

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: (_: any) => {} } as any },
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Verify booking ownership
    const { data: bookingRow, error: bookingErr } = await supabase
      .from('bookings')
      .select('client_id')
      .eq('id', id)
      .limit(1)
      .maybeSingle()

    if (bookingErr) {
      console.error('[api/bookings/[id] DELETE] failed fetching booking', bookingErr)
      return NextResponse.json({ error: 'Failed to fetch booking', details: String(bookingErr) }, { status: 500 })
    }

    if (!bookingRow || bookingRow.client_id !== user.id) {
      console.warn('[api/bookings/[id] DELETE] ownership check failed', { id, bookingRowClient: bookingRow?.client_id, userId: user?.id })
      return NextResponse.json({ error: 'Forbidden: you are not the owner of this booking' }, { status: 403 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceKey) return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })

    const svc = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

    // Soft-archive the booking only; do NOT archive reviews (keep reviews intact)
    // Use explicit select('*') and capture full svc result for diagnostics
    const svcResult = await svc
      .from('bookings')
      .update({ archived: true, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .maybeSingle()

    const archived = svcResult?.data ?? null
    const archiveErr = svcResult?.error ?? null

    console.info('[api/bookings/[id] DELETE] svc result', { id, svcResult })

    if (archiveErr) {
      console.error('[api/bookings/[id] DELETE] failed to archive booking', id, archiveErr)
      return NextResponse.json({ error: 'Failed to archive booking', details: archiveErr?.message ?? String(archiveErr), svcResult }, { status: 500 })
    }

    console.info('[api/bookings/[id] DELETE] archived booking', id, 'by', user.id)
    // Return a predictable payload so clients never see an empty object
    return NextResponse.json({ success: true, archived: archived ?? null, archivedId: archived?.id ?? id, svcResult })
  } catch (err: any) {
    console.error('[api/bookings/[id] DELETE] Error:', err)
    return NextResponse.json({ error: 'Internal server error', details: String(err) }, { status: 500 })
  }
}
