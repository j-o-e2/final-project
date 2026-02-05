import { supabase } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

/**
 * POST /api/messages/cleanup
 * Deletes messages that have passed their delete_at timestamp
 * This endpoint prefers using a server-side SUPABASE_SERVICE_ROLE_KEY when available
 * so it can bypass RLS and remove expired messages reliably.
 */
export async function POST(req: Request) {
  try {
    const now = new Date().toISOString();

    // If a service role key is provided in env, use PostgREST directly with that key
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ADMIN_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (serviceKey && supabaseUrl) {
      const url = `${supabaseUrl}/rest/v1/messages?delete_at=lt.${encodeURIComponent(now)}`;
      const res = await fetch(url, {
        method: "DELETE",
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
      });

      if (!res.ok) {
        const body = await res.text();
        console.error("Service-role cleanup failed:", res.status, body);
        return Response.json({ error: "Failed to cleanup expired messages" }, { status: 500 });
      }

      return Response.json({ success: true, message: "Expired messages cleaned up (service role)" }, { status: 200 });
    }

    // Fallback: use existing client (may be subject to RLS and fail if anon key lacks permissions)
    const { error: deleteError } = await supabase.from("messages").delete().lt("delete_at", now);

    if (deleteError) {
      console.error("Error deleting expired messages with anon key:", deleteError);
      return Response.json({ error: "Failed to cleanup expired messages" }, { status: 500 });
    }

    return Response.json({ success: true, message: "Expired messages cleaned up" }, { status: 200 });
  } catch (error) {
    console.error("[/api/messages/cleanup] Error:", error);
    return Response.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
