// app/lib/db.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Use service role on the server only. Public anon key is not enough for inserts/updates you need.
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  // Don't throw at import time in case Next prerender scans; fail lazily when used.
  console.warn(
    '[db] Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY env. Calls will fail.'
  );
}

export function db(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
