import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { id } = request.nextUrl.pathname.match(/\/api\/admin\/users\/(.*)\/verify\//)?.groups || {}
  } catch (e) {
    // fallback: parse body for userId
  }

  try {
    const body = await request.json()
    const userId = body.userId || body.id
    if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 })

    const updates: any = {}
    if (body.verifyEmail) updates.email_verified = true
    if (body.verifyPhone) updates.phone_verified = true
    if (body.verifyContact) updates.contact_revealed = true

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Nothing to do' }, { status: 400 })
    }

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    const { data, error } = await admin
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()

    if (error) {
      console.error('[admin][verify] update error', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    console.error('[admin][verify] unexpected:', err)
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}
