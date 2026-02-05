import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function GET(request: Request) {
  try {
    // Validate session from incoming cookies
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
              // ignore
            }
          },
        },
      }
    )

    const { data: authData, error: authErr } = await authClient.auth.getUser()
    if (authErr) {
      console.error('[v0] admin/profile auth error', authErr)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = authData?.user?.id
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceKey) {
      console.error('[v0] Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL')
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
    }

    const serviceClient = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

    const { data, error } = await serviceClient.from('profiles').select('*').eq('id', userId).maybeSingle()
    if (error) {
      console.error('[v0] admin/profile service select error', error)
      return NextResponse.json({ error: error.message || String(error) }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (err) {
    console.error('[v0] admin/profile unexpected error', err)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}
