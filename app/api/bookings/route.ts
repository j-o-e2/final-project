import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const cookieStore = await cookies();
    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { cookies: cookieStore as any });
    const { service_id, client_id: incomingClientId, booking_date, status, notes } = body;

    // Ensure the request is authenticated and client is the session user
    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr) {
      console.error('Error fetching authenticated user in bookings POST:', userErr)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Enforce that the booking client_id matches the logged-in user
    const client_id = user.id
    if (incomingClientId && incomingClientId !== client_id) {
      return NextResponse.json({ error: 'Client ID mismatch' }, { status: 403 })
    }

    // Verify profile completeness server-side before allowing booking
    try {
      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('full_name, email, phone, location')
        .eq('id', client_id)
        .single();

      if (profileErr || !profile) {
        return NextResponse.json({ error: 'Please complete your profile before making a booking' }, { status: 400 })
      }

      if (!profile.full_name?.trim() || !profile.email?.trim() || !profile.phone?.trim() || !profile.location?.trim()) {
        return NextResponse.json({ error: 'Please complete your profile (Name, Email, Phone, Location) before making a booking' }, { status: 400 })
      }
    } catch (e) {
      console.error('Error verifying profile completeness for booking:', e)
      return NextResponse.json({ error: 'Failed to verify profile' }, { status: 500 })
    }

    const { data: bookingRow, error: insertError } = await supabase
      .from("bookings")
      .insert([
        {
          service_id,
          client_id,
          booking_date,
          status: status || "pending",
          notes,
        },
      ])
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: "Failed to create booking" },
        { status: 500 }
      );
    }

    // Enrich booking with client profile and service details so callers get the client info immediately
    const [{ data: profileData, error: profileErr }, { data: serviceData, error: serviceErr }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, avatar_url, email")
        .eq("id", bookingRow.client_id)
        .maybeSingle(),
      supabase
        .from("services")
        .select("id, provider_id, name, price, duration")
        .eq("id", bookingRow.service_id)
        .maybeSingle(),
    ]);

    if (profileErr) console.warn('Failed to load profile for booking enrichment', profileErr)
    if (serviceErr) console.warn('Failed to load service for booking enrichment', serviceErr)

    const enriched = {
      ...bookingRow,
      profiles: profileData || null,
      services: serviceData || null,
    };

    return NextResponse.json(enriched);
  } catch (error) {
    console.error('Error in POST /api/bookings', error)
    return NextResponse.json({ error: "Internal Server Error", details: String(error) }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const client_id = searchParams.get("client_id");
    const cookieStore = await cookies();
    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { cookies: cookieStore as any });

    if (!client_id) {
      return NextResponse.json(
        { error: "Client ID is required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("bookings")
      .select(`
        *,
        services:service_id (
          name,
          description,
          price
        )
      `)
      .eq("client_id", client_id)
      .order("booking_date", { ascending: false });

    if (error) {
      console.error('Error fetching bookings for client_id', client_id, error)
      return NextResponse.json({ error: "Failed to fetch bookings", details: error.message || String(error) }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}