import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function DELETE(req: Request, context: any) {
	try {
		let params = context?.params
		if (params && typeof params.then === 'function') params = await params
		const id = params?.id

		if (!id) {
			return NextResponse.json({ error: 'Missing id' }, { status: 400 })
		}

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
			},
		)

		// Ensure authenticated user
		const { data: { user } } = await supabase.auth.getUser()
		if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

		// Ownership check
		const { data: serviceRow, error: svcErr } = await supabase
			.from('services')
			.select('provider_id')
			.eq('id', id)
			.limit(1)
			.maybeSingle()

		if (svcErr) {
			console.error('[api/services/[id] DELETE] failed fetching service', svcErr)
			return NextResponse.json({ error: 'Failed to fetch service' }, { status: 500 })
		}

		if (!serviceRow || serviceRow.provider_id !== user.id) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
		}

		// Use service role client to perform cascade updates (bypass RLS)
		const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
		const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
		if (!supabaseUrl || !serviceKey) {
			return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
		}

		const svc = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

		// Find bookings tied to this service
		let deletedBookingIds: string[] = []
		try {
			const { data: bookingsData, error: bookingsErr } = await svc
				.from('bookings')
				.select('id')
				.eq('service_id', id)

			if (bookingsErr) {
				console.error('[api/services/[id] DELETE] failed to list bookings for service', id, bookingsErr)
				return NextResponse.json({ error: 'Failed to list bookings for service', details: bookingsErr?.message ?? String(bookingsErr) }, { status: 500 })
			}

			const ids = (bookingsData || []).map((b: any) => b.id).filter(Boolean)
			if (ids.length) {
				// Soft-archive the bookings themselves (do NOT touch reviews)
				try {
					const { data: archivedBookings, error: archBookingsErr } = await svc
						.from('bookings')
						.update({ archived: true, updated_at: new Date().toISOString() })
						.in('id', ids as any[])
						.select('id')

					if (archBookingsErr) {
						console.error('[api/services/[id] DELETE] failed to archive bookings for service', id, archBookingsErr)
						return NextResponse.json({ error: 'Failed to archive bookings for service', details: archBookingsErr?.message ?? String(archBookingsErr) }, { status: 500 })
					}

					(archivedBookings || []).forEach((b: any) => deletedBookingIds.push(b.id))
				} catch (e: any) {
					console.error('[api/services/[id] DELETE] exception archiving bookings', e)
					return NextResponse.json({ error: 'Failed to archive bookings', details: String(e) }, { status: 500 })
				}
			}
		} catch (e: any) {
			console.error('[api/services/[id] DELETE] Error listing bookings', e)
			return NextResponse.json({ error: 'Failed to list bookings for service', details: String(e) }, { status: 500 })
		}

		// Soft-archive the service row
		const resp = await svc.from('services').update({ archived: true, updated_at: new Date().toISOString() }).eq('id', id).select().maybeSingle()
		const archivedService = resp.data ?? null
		if (resp.error) {
			console.error('[api/services/[id] DELETE] supabase archive error:', resp.error)
			return NextResponse.json({ error: 'Failed to archive service', details: resp.error?.message ?? String(resp.error) }, { status: 500 })
		}

		console.info('[api/services/[id] DELETE] archived service', id, 'by', user.id, 'archivedBookings=', deletedBookingIds.length)
		return NextResponse.json({ success: true, archived: archivedService, archivedBookingIds: deletedBookingIds })
	} catch (err: any) {
		console.error('[api/services/[id] DELETE] Error:', err)
		return NextResponse.json({ error: 'Internal server error', details: String(err) }, { status: 500 })
	}
}
