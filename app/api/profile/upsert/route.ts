import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const { id, avatar_url } = body || {}

    if (!id || !avatar_url) {
      return NextResponse.json({ error: 'Missing id or avatar_url' }, { status: 400 })
    }

    // Validate the request's session matches the id being modified
    const cookieStore = await cookies()
    const authClient = createServerClient(
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
              // Ignore
            }
          },
        },
      }
    )
    const { data: authData, error: authErr } = await authClient.auth.getUser()
    if (authErr) {
      console.error('[v0] auth getUser error', authErr)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sessionUserId = authData?.user?.id
    if (!sessionUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (sessionUserId !== id) {
      console.warn('[v0] profile upsert blocked: session user id does not match requested id', { sessionUserId, id })
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceKey) {
      console.error('[v0] Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL')
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
    }

    const serviceClient = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

    // Upsert the profile row using service role (bypasses RLS)
    const { data, error } = await serviceClient
      .from('profiles')
      .upsert([
        {
          id,
          avatar_url,
          updated_at: new Date().toISOString(),
        },
      ], { onConflict: 'id' })

    if (error) {
      console.error('[v0] profile upsert error', error)
      return NextResponse.json({ error: error.message || String(error) }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 200 })
  } catch (err) {
    console.error('[v0] profile upsert unexpected error', err)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}
