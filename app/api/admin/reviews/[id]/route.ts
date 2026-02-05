import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function DELETE(request: Request, context: any) {
  try {
    let params = context?.params
    if (params && typeof params.then === 'function') params = await params
    const reviewId = params?.id
    if (!reviewId) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

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

    // Delete the review
    const { error } = await supabase
      .from("reviews")
      .delete()
      .eq("id", reviewId)

    if (error) {
      console.error('[admin/reviews/:id DELETE] supabase error:', error)
      return NextResponse.json({ error: 'Failed to delete review', details: error.message ?? String(error) }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("[admin/reviews/:id] Error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
