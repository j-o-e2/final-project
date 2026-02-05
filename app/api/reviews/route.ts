import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// Force dynamic so we can access cookies/session
export const dynamic = 'force-dynamic'

// GET: /api/reviews?bookingId=...&jobId=...&userId=...
export async function GET(request: Request) {
  try {
    // Create Supabase client using SSR pattern with manual cookie wrapper
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookiesToSet) => {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // Ignore cookie set errors in GET
            }
          },
        },
      }
    )
    const url = new URL(request.url)
    const jobId = url.searchParams.get('jobId')
    const bookingId = url.searchParams.get('bookingId')
    const userId = url.searchParams.get('userId')

    let query = supabase
      .from('reviews')
      .select(`
        *,
        reviewer:profiles!reviewer_id ( id, full_name, avatar_url ),
        reviewee:profiles!reviewee_id ( id, full_name, avatar_url )
      `)

    if (jobId) query = query.eq('job_id', jobId)
    if (bookingId) query = query.eq('booking_id', bookingId)
    if (userId) query = query.or(`reviewer_id.eq.${userId},reviewee_id.eq.${userId}`)

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('Supabase error GET /api/reviews:', error)
      return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (err) {
    console.error('Unhandled error GET /api/reviews:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// POST: create a new review (authenticated route)
export async function POST(request: Request) {
  try {
    // Create Supabase client using SSR pattern with manual cookie wrapper
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookiesToSet) => {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // Ignore cookie set errors in POST
            }
          },
        },
      }
    )

    // Read JSON body defensively using request.json()
    // (safer than manual text parsing and avoids subtle empty-body issues)
    const body: any = await request.json().catch(() => ({}))
    console.log('[DEBUG POST /api/reviews] content-type:', request.headers.get('content-type'))
    console.log('[DEBUG POST /api/reviews] has Authorization:', !!request.headers.get('authorization'))
    const { revieweeId, jobId, bookingId, rating, comment } = body || {}

    console.log('[DEBUG POST /api/reviews] Request body:', { revieweeId, jobId, bookingId, rating, comment })

    if (!revieweeId) {
      console.log('[DEBUG POST /api/reviews] Missing revieweeId:', { revieweeId, jobId, bookingId, rating, comment })
      const resp = { ok: false, error: 'revieweeId is required' }
      console.error('[POST /api/reviews] Responding error:', resp)
      return NextResponse.json(resp, { status: 400 })
    }
    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
      console.log('[DEBUG POST /api/reviews] Invalid rating:', { rating, type: typeof rating })
      const resp = { ok: false, error: 'rating must be a number between 1 and 5' }
      console.error('[POST /api/reviews] Responding error:', resp)
      return NextResponse.json(resp, { status: 400 })
    }

    // Get authenticated user via cookies/session
    let user: any = null
    const { data: { user: sessionUser }, error: userErr } = await supabase.auth.getUser()
    console.log('[DEBUG POST /api/reviews] Auth user (from cookie):', sessionUser?.id, 'Error:', userErr)
    if (userErr) {
      console.error('Auth error POST /api/reviews:', userErr)
      // don't immediately return; we'll attempt fallback token extraction below
    }
    user = sessionUser || null

    // Fallback: if no session user, try extracting user id from Bearer token in Authorization header or body.accessToken
    if (!user) {
      const incomingAuth = request.headers.get('authorization') || ''
      const bodyAccessToken = (body as any)?.accessToken || null
      const token = incomingAuth.startsWith('Bearer ') ? incomingAuth.substring(7) : (bodyAccessToken || null)
      if (token) {
        try {
          const parts = token.split('.')
          if (parts.length === 3) {
            const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'))
            if (payload?.sub) {
              user = { id: payload.sub }
              console.log('[DEBUG POST /api/reviews] Extracted user from Bearer token:', user.id)
            }
          }
        } catch (e) {
          console.warn('Failed to decode Bearer token in POST /api/reviews fallback:', e)
        }
      }
    }

    if (!user) {
      const resp = { ok: false, error: 'Unauthorized' }
      console.error('[POST /api/reviews] Responding error (unauthorized):', resp)
      return NextResponse.json(resp, { status: 401 })
    }

    // Ensure the authenticated user has a `profiles` row. Some signups
    // may not have created a profile yet; the reviews table references
    // `profiles(id)` so inserting without a profile will violate the FK.
    try {
      const { data: existingProfile } = await supabase.from('profiles').select('id').eq('id', user.id).maybeSingle()
      if (!existingProfile) {
        const profilePayload: any = { id: user.id }
        // attempt to include some available user info
        if (sessionUser?.email) profilePayload.email = sessionUser.email
        if ((sessionUser as any)?.user_metadata?.full_name) profilePayload.full_name = (sessionUser as any).user_metadata.full_name
        await supabase.from('profiles').insert([profilePayload])
      }
    } catch (e) {
      console.warn('[POST /api/reviews] failed to ensure profile exists:', e)
      // continue — duplicate/insert will surface clearer error to client
    }

    // Prevent duplicates: same reviewer + job_id OR same reviewer + booking_id
    const dupQuery: any = { reviewer_id: user.id, reviewee_id: revieweeId }
    if (jobId) dupQuery.job_id = jobId
    if (bookingId) dupQuery.booking_id = bookingId

    const { data: existing, error: dupErr } = await supabase.from('reviews').select('id').match(dupQuery).maybeSingle()
    console.log('[DEBUG POST /api/reviews] Duplicate check query:', dupQuery, 'Result:', existing, 'Error:', dupErr)
    if (dupErr) {
      // If the duplicate check failed due to permissions or schema issues, log and continue
      console.warn('[DEBUG POST /api/reviews] duplicate check error (continuing):', dupErr)
    }
    if (existing) {
      const resp = { ok: false, error: 'You have already reviewed this item' }
      console.error('[POST /api/reviews] Responding error (duplicate):', resp)
      return NextResponse.json(resp, { status: 400 })
    }

    const insertPayload = {
      reviewer_id: user.id,
      reviewee_id: revieweeId,
      client_id: revieweeId,  // The person being reviewed is the "client" for this review
      provider_id: revieweeId,  // Also the "provider" being reviewed
      job_id: jobId || null,
      booking_id: bookingId || null,
      rating,
      comment: comment || null,
    }
    console.log('[DEBUG POST /api/reviews] Insert payload:', insertPayload)

    const { data, error } = await supabase
      .from('reviews')
      .insert([insertPayload])
      .select(`
        *,
        reviewer:profiles!reviewer_id ( id, full_name, avatar_url ),
        reviewee:profiles!reviewee_id ( id, full_name, avatar_url )
      `)
      .single()

    console.log('[DEBUG POST /api/reviews] Insert result - Data:', data, 'Error:', error)

    if (error) {
      console.error('Supabase insert error POST /api/reviews:', error)
      const serializable = {
        code: (error as any)?.code || null,
        message: (error as any)?.message || String(error),
        details: (error as any)?.details || null,
        hint: (error as any)?.hint || null,
        status: (error as any)?.status || null,
      }
      console.error('Serialized error for client:', JSON.stringify(serializable))
      const resp = { ok: false, error: 'Failed to create review', details: serializable }
      console.error('[POST /api/reviews] Responding error (insert):', resp)
      return NextResponse.json(resp, { status: 500 })
    }

    if (!data) {
      console.error('[POST /api/reviews] Insert succeeded but data is null/undefined')
      const resp = { ok: false, error: 'Review created but no data returned', details: { data: data } }
      return NextResponse.json(resp, { status: 500 })
    }

    console.log('[POST /api/reviews] Review created successfully, returning data:', JSON.stringify(data))
    
    // Trigger tier calculation for the reviewee
    try {
      const tierResult = await supabase.rpc('calculate_user_tier', {
        user_id: revieweeId,
      })
      console.log('[POST /api/reviews] Tier updated for reviewee:', revieweeId, 'Result:', tierResult)
    } catch (tierErr) {
      console.warn('[POST /api/reviews] Failed to update tier:', tierErr)
      // Continue - tier update failure shouldn't block review creation
    }
    
    return NextResponse.json({ ok: true, data: data })
  } catch (err) {
    console.error('Unhandled error POST /api/reviews:', err)
    console.error('Unhandled error stack:', err instanceof Error ? err.stack : 'N/A')
    const errMsg = err instanceof Error ? err.message : String(err)
    const errStack = err instanceof Error ? err.stack : ''
    console.error('Error details:', { message: errMsg, stack: errStack })
    const serialized = {
      message: errMsg,
      type: err instanceof Error ? 'Error' : typeof err,
    }
    const resp = { ok: false, error: 'Server error', details: serialized }
    console.error('[POST /api/reviews] Responding error (catch):', resp)
    return NextResponse.json(resp, { status: 500 })
  }
}