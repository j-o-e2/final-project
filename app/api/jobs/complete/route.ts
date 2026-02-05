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

    const { jobId } = body;

    if (!jobId) {
      return NextResponse.json({ 
        error: "Invalid request",
        details: "jobId is required"
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

    // Mark the job as completed
    const { data: jobRow, error: updateError } = await sb
      .from("jobs")
      .update({ 
        status: "completed", 
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString() 
      })
      .eq("id", jobId)
      .select(`
        *,
        job_applications (
          id,
          status,
          proposed_rate,
          provider:profiles (
            id,
            full_name,
            avatar_url,
            location
          )
        )
      `)
      .single();

    if (updateError) {
      const errorMessage = updateError.message || updateError.code || String(updateError);
      return NextResponse.json({ 
        error: "Failed to complete job",
        details: errorMessage,
        code: updateError.code || 'SUPABASE_ERROR'
      }, { status: 500 });
    }

    if (!jobRow) {
      return NextResponse.json({ 
        error: "Job not found",
        details: `No job found with ID: ${jobId}`
      }, { status: 404 });
    }

    return NextResponse.json(jobRow);
  } catch (err) {
    return NextResponse.json({ error: "Internal server error", details: String(err) }, { status: 500 });
  }
}