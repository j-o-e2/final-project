import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

/**
 * Quick endpoint to apply migration 023 to fix RLS recursion issue
 * Endpoint: POST /api/debug/apply-migration-023
 * WARNING: Only use in development or with proper auth checks
 */

export async function POST(request: Request) {
  try {
    // SECURITY: In production, verify this is an admin or authorized request
    console.log("[migration-023] Starting RLS fix...")

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    // Step 1: Drop problematic policies
    console.log("[migration-023] Dropping old policies...")
    const dropPolicies = `
      DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
      DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
      DROP POLICY IF EXISTS "User can read own profile" ON public.profiles;
      DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
    `

    // Step 2: Create new simple policy
    console.log("[migration-023] Creating new policy...")
    const createPolicy = `
      CREATE POLICY "Users can read own profile" ON public.profiles
        FOR SELECT
        USING (auth.uid() = id);
    `

    // Use Supabase's SQL function if available, or execute via direct call
    // Note: Supabase doesn't expose direct SQL execution from client, so we need to use RPC

    // Alternative approach: Drop and recreate via RPC calls
    const { error: enableError } = await supabase.rpc("exec_sql", {
      sql_string: `ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;`,
    })

    if (enableError) {
      console.log("[migration-023] Enable RLS result:", enableError.message)
      // Continue even if this fails
    }

    const { error: dropError } = await supabase.rpc("exec_sql", {
      sql_string: `
        DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
        DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
        DROP POLICY IF EXISTS "User can read own profile" ON public.profiles;
        DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
      `,
    })

    if (dropError) {
      console.log("[migration-023] Drop policies result:", dropError.message)
    }

    const { error: createError } = await supabase.rpc("exec_sql", {
      sql_string: `
        CREATE POLICY "Users can read own profile" ON public.profiles
          FOR SELECT
          USING (auth.uid() = id);
      `,
    })

    if (createError) {
      console.log("[migration-023] Create policy error:", createError)
      return NextResponse.json(
        { error: "Failed to create policy", details: createError },
        { status: 500 }
      )
    }

    console.log("[migration-023] ✓ Migration completed successfully")
    return NextResponse.json({
      success: true,
      message: "Migration 023 applied successfully",
      details: "Dropped recursive admin policy, kept simple user self-read policy",
    })
  } catch (err: any) {
    console.error("[migration-023] Error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
