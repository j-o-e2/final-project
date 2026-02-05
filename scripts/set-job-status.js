#!/usr/bin/env node
// Script to update a job status using Supabase service role key (server-side)
// Usage: node scripts/set-job-status.js <jobId> <newStatus>

// Try to load environment variables from .env manually if dotenv isn't available
let env = process.env;
try {
  // prefer dotenv if installed
  require('dotenv').config();
  env = process.env;
} catch (e) {
  // fallback: read .env file if present
  const fs = require('fs');
  const path = require('path');
  try {
    const envPath = path.resolve(__dirname, '..', '.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      content.split(/\r?\n/).forEach((line) => {
        const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
        if (m) {
          const key = m[1];
          let val = m[2] || '';
          // remove surrounding quotes
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          env[key] = val;
        }
      });
    }
  } catch (err) {
    // ignore
  }
}

const { createClient } = require('@supabase/supabase-js');

const [,, jobId, newStatus] = process.argv;
if (!jobId || !newStatus) {
  console.error('Usage: node scripts/set-job-status.js <jobId> <newStatus>');
  process.exit(2);
}

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL || env.SUPABASE_URL;
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || env.SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE URL or SERVICE_ROLE_KEY in environment.');
  process.exit(3);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

(async () => {
  try {
    console.log('Updating job', jobId, 'to', newStatus);
    const { data, error } = await supabase
      .from('jobs')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', jobId)
      .select()
      .single();

    if (error) {
      console.error('Update error:', error);
      process.exit(4);
    }

    console.log('Update success:', data);
  } catch (err) {
    console.error('Unexpected error:', err);
    process.exit(5);
  }
})();
