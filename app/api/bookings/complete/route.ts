import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    let body;
    try {
      body = await req.json();
    } catch (e) {
      return NextResponse.json({ 
        error: "Invalid request body",
        details: "Request body must be valid JSON"
      }, { status: 400 });
    }

    const { bookingId } = body;

    if (!bookingId) {
      return NextResponse.json({ 
        error: "Invalid request",
        details: "bookingId is required"
      }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json(
        { 
          error: "Server configuration error",
          details: "Missing required environment variables"
        },
        { status: 500 }
      );
    }

    const sb = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    // Mark the booking as completed
    const { data: bookingRow, error: updateError } = await sb
      .from("bookings")
      .update({ 
        status: "completed", 
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString() 
      })
      .eq("id", bookingId)
      .select()
      .single();

    if (updateError) {
      const errorMessage = updateError.message || updateError.code || String(updateError);
      return NextResponse.json({ 
        error: "Failed to complete booking",
        details: errorMessage,
        code: updateError.code || 'SUPABASE_ERROR'
      }, { status: 500 });
    }

    if (!bookingRow) {
      return NextResponse.json({ 
        error: "Booking not found",
        details: `No booking found with ID: ${bookingId}`
      }, { status: 404 });
    }

    // Enrich result with client profile and service
    const [profileRes, serviceRes] = await Promise.all([
      sb.from("profiles").select("id, full_name, avatar_url, email").eq("id", bookingRow.client_id).maybeSingle(),
      sb.from("services").select("id, provider_id, name, price, duration").eq("id", bookingRow.service_id).maybeSingle(),
    ]);

    const profileData = profileRes?.data ?? null;
    const serviceData = serviceRes?.data ?? null;

    const enriched = {
      ...bookingRow,
      profiles: profileData,
      services: serviceData,
    };

    return NextResponse.json(enriched);
  } catch (err) {
    return NextResponse.json({ error: "Internal server error", details: String(err) }, { status: 500 });
  }
}
