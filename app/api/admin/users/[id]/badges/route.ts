import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const userId = body.userId || body.id
    const badge = body.badge
    const awardedBy = body.awardedBy || null
    const notes = body.notes || null

    if (!userId || !badge) return NextResponse.json({ error: 'Missing userId or badge' }, { status: 400 })

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    const payload = {
      badge_key: badge,
      awarded_to: userId,
      awarded_by: awardedBy,
      notes,
      created_at: new Date().toISOString(),
    }

    const { data, error } = await admin
      .from('badges')
      .insert([payload])
      .select()

    if (error) {
      console.error('[admin][badges] insert error', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    console.error('[admin][badges] unexpected:', err)
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}
