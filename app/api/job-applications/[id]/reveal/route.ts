import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest, context: any) {
  try {
    let params = context?.params
    if (params && typeof params.then === 'function') params = await params
    const id = params?.id
    if (!id) return NextResponse.json({ error: 'Missing application id' }, { status: 400 })

    const cookieStore = await cookies()
    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { cookies: cookieStore as any })

    let { data: { user } } = await supabase.auth.getUser()
    
    // Fallback: if no session-based user, try to extract from Authorization header or request body
    if (!user) {
      try {
        const body = await req.json().catch(() => ({}))
        const incomingAuth = req.headers.get('authorization') || ''
        let token = incomingAuth.startsWith('Bearer ') ? incomingAuth.substring(7) : null
        
        // Fallback: client may send accessToken in request body
        if (!token && (body as any)?.accessToken) token = (body as any).accessToken
        
        if (token) {
          try {
            const parts = token.split('.')
            if (parts.length === 3) {
              const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'))
              if (payload?.sub) {
                user = { id: payload.sub } as any
                console.log('[reveal] extracted user from token', (user as any).id)
              }
            }
          } catch (e) {
            console.warn('Failed to decode token in reveal endpoint:', e)
          }
        }
      } catch (e) {
        console.warn('Error processing request body in reveal:', e)
      }
    }
    
    if (!user) return NextResponse.json({ error: 'Unauthorized - no valid session' }, { status: 401 })

    // Fetch application to verify ownership and status
    const { data: appRow, error: appErr } = await supabase.from('job_applications').select('id, provider_id, status, client_contact_revealed').eq('id', id).maybeSingle()
    if (appErr) {
      console.error('Error fetching application for reveal:', appErr)
      return NextResponse.json({ error: 'Failed to fetch application' }, { status: 500 })
    }
    if (!appRow) return NextResponse.json({ error: 'Application not found' }, { status: 404 })

    if (appRow.provider_id !== user.id) return NextResponse.json({ error: 'Forbidden - not the applicant' }, { status: 403 })

    if (appRow.status !== 'accepted') return NextResponse.json({ error: 'Application must be accepted to reveal contact' }, { status: 400 })

    if (appRow.client_contact_revealed) return NextResponse.json({ success: true, alreadyRevealed: true })

    const { data: updated, error: updateErr } = await supabase.from('job_applications').update({ client_contact_revealed: true, updated_at: new Date().toISOString() }).eq('id', id).select().single()
    if (updateErr) {
      console.error('Failed to set client_contact_revealed:', updateErr)
      return NextResponse.json({ error: 'Failed to update application' }, { status: 500 })
    }

    return NextResponse.json({ success: true, application: updated })
  } catch (err) {
    console.error('Error in reveal endpoint:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
