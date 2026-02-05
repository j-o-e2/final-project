import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// GET: Fetch messages for a job_application or booking
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const jobApplicationId = searchParams.get("job_application_id");
    const bookingId = searchParams.get("booking_id");

    if (!jobApplicationId && !bookingId) {
      return NextResponse.json(
        { error: "job_application_id or booking_id is required" },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: cookieStore as any }
    );

    let query = supabase
      .from("messages")
      .select("*, sender:sender_id(id, full_name, avatar_url)");

    if (jobApplicationId) {
      query = query.eq("job_application_id", jobApplicationId);
    } else if (bookingId) {
      query = query.eq("booking_id", bookingId);
    }

    const { data: messages, error } = await query.order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching messages:", error);
      return NextResponse.json(
        { error: "Failed to fetch messages" },
        { status: 500 }
      );
    }

    return NextResponse.json(messages || []);
  } catch (err) {
    console.error("Error in GET /api/messages:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// POST: Send a message
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { job_id, job_application_id, booking_id, content, recipient_id } = body;

    if (!content || !recipient_id) {
      return NextResponse.json(
        { error: "content and recipient_id are required" },
        { status: 400 }
      );
    }

    if (!job_application_id && !booking_id) {
      return NextResponse.json(
        { error: "job_application_id or booking_id is required" },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: cookieStore as any }
    );

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Ensure the sender has a complete profile before allowing them to send messages
    try {
      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('full_name, email, phone, location')
        .eq('id', user.id)
        .single();

      if (profileErr || !profile) {
        return NextResponse.json({ error: 'Please complete your profile before sending messages' }, { status: 400 });
      }

      if (!profile.full_name?.trim() || !profile.email?.trim() || !profile.phone?.trim() || !profile.location?.trim()) {
        return NextResponse.json({ error: 'Please complete your profile (Name, Email, Phone, Location) before sending messages' }, { status: 400 });
      }
    } catch (e) {
      console.error('Error verifying profile completeness for messages:', e);
      return NextResponse.json({ error: 'Failed to verify profile' }, { status: 500 });
    }

    // Insert message
    const { data: message, error } = await supabase
      .from("messages")
      .insert([
        {
          job_id: job_id || null,
          job_application_id: job_application_id || null,
          booking_id: booking_id || null,
          sender_id: user.id,
          recipient_id,
          content,
        },
      ])
      .select("*, sender:sender_id(id, full_name, avatar_url)")
      .single();

    if (error) {
      console.error("Error inserting message:", error);
      return NextResponse.json(
        { error: "Failed to send message", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(message);
  } catch (err) {
    console.error("Error in POST /api/messages:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
