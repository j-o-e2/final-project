import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const disputeId = searchParams.get("id")
    const status = searchParams.get("status")
    const userId = searchParams.get("userId")

    let query = supabase
      .from("disputes")
      .select(
        `
        *,
        complainant:complainant_id(id, full_name, avatar_url),
        respondent:respondent_id(id, full_name, avatar_url),
        admin:assigned_admin_id(id, full_name)
      `
      )

    // Filter by specific dispute
    if (disputeId) {
      query = query.eq("id", disputeId)
      const { data, error } = await query.single()
      if (error) throw error
      return NextResponse.json(data)
    }

    // Filter by status
    if (status) {
      query = query.eq("status", status)
    }

    // Filter by user (complainant or respondent)
    if (userId) {
      query = query.or(`complainant_id.eq.${userId},respondent_id.eq.${userId}`)
    }

    const { data, error } = await query.order("created_at", { ascending: false })
    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching disputes:", error)
    return NextResponse.json(
      { error: "Failed to fetch disputes" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const {
      job_id,
      booking_id,
      complainant_id,
      respondent_id,
      title,
      description,
      category,
      severity,
      disputed_amount,
      priority,
    } = body

    // Validate required fields
    if (!complainant_id || !respondent_id || !title || !description) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    if (!job_id && !booking_id) {
      return NextResponse.json(
        { error: "Either job_id or booking_id is required" },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from("disputes")
      .insert([
        {
          job_id,
          booking_id,
          complainant_id,
          respondent_id,
          title,
          description,
          category,
          severity,
          disputed_amount,
          priority,
          status: "open",
        },
      ])
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error("Error creating dispute:", error)
    return NextResponse.json(
      { error: "Failed to create dispute" },
      { status: 500 }
    )
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json(
        { error: "Dispute ID is required" },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from("disputes")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error updating dispute:", error)
    return NextResponse.json(
      { error: "Failed to update dispute" },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json(
        { error: "Dispute ID is required" },
        { status: 400 }
      )
    }

    const { error } = await supabase.from("disputes").delete().eq("id", id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting dispute:", error)
    return NextResponse.json(
      { error: "Failed to delete dispute" },
      { status: 500 }
    )
  }
}
