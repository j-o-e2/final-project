import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  try {
    // Get the authenticated user from the session
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
    const { data: { user }, error: authErr } = await authClient.auth.getUser()

    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = user.id

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
    }

    // Create service role client to delete the user (only service role can do this)
    const serviceClient = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    })

    // Delete the user using the admin API
    // This will also trigger the cascade delete for the profile via the trigger
    const { error: deleteError } = await serviceClient.auth.admin.deleteUser(userId)

    if (deleteError) {
      console.error('[v0] Error deleting user:', deleteError)
      return NextResponse.json({ error: deleteError.message || 'Failed to delete account' }, { status: 500 })
    }

    return NextResponse.json(
      { message: 'Account deleted successfully' },
      { status: 200 }
    )
  } catch (err: any) {
    console.error('[v0] Unexpected error during account deletion:', err)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}
