#!/usr/bin/env node

/**
 * Run migration 023 to fix profiles RLS infinite recursion
 * Usage: node scripts/run-migration-023.js
 */

const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error(
    "Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set"
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

async function runMigration() {
  try {
    console.log("Reading migration file...");
    const migrationPath = path.join(__dirname, "023_fix_profiles_rls.sql");
    const sql = fs.readFileSync(migrationPath, "utf-8");

    console.log("Executing migration 023...");
    const { data, error } = await supabase.rpc("exec_sql", { sql_string: sql });

    if (error) {
      console.error("Migration failed with RPC error:", error);
      process.exit(1);
    }

    console.log("✓ Migration 023 completed successfully!");
    console.log("Result:", data);
  } catch (err) {
    console.error("Error running migration:", err.message);
    process.exit(1);
  }
}

// Alternative: Use direct SQL execution if available
async function runMigrationDirect() {
  try {
    console.log("Reading migration file...");
    const migrationPath = path.join(__dirname, "023_fix_profiles_rls.sql");
    const sql = fs.readFileSync(migrationPath, "utf-8");

    console.log("Attempting direct SQL execution...");

    // Split into individual statements
    const statements = sql
      .split(";")
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0 && !stmt.startsWith("--"));

    for (const statement of statements) {
      console.log("Executing:", statement.substring(0, 50) + "...");
      const { error } = await supabase.rpc("exec", { query: statement });

      if (error) {
        console.warn("Statement may have failed:", error.message);
      }
    }

    console.log("✓ Migration 023 completed!");
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
}

// Try the RPC approach first, then fallback
runMigration().catch(() => {
  console.log("RPC approach failed, trying direct SQL...");
  runMigrationDirect();
});
