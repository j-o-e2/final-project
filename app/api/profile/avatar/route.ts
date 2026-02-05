import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { avatar_url } = body

    if (!avatar_url) {
      return NextResponse.json({ error: 'avatar_url is required' }, { status: 400 })
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

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      console.error('Error getting user in avatar route:', userError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Upsert profile for current user (create if missing) to avoid FK/RLS failures
    const { error } = await supabase
      .from('profiles')
      .upsert([{ id: user.id, avatar_url }], { onConflict: 'id' })

    if (error) {
      console.error('Error updating profile avatar:', error)
      return NextResponse.json({ error: error.message || 'Failed to update profile' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Avatar updated' })
  } catch (err: any) {
    console.error('Avatar route error:', err)
    return NextResponse.json({ error: err.message || 'Unexpected error' }, { status: 500 })
  }
}
