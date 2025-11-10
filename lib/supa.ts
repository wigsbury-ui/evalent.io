// lib/supa.ts
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; // optional if you also use anon on the client

// Server-side admin client (use in Route Handlers, Actions, cron, etc.)
export function createClient() {
  if (!SUPABASE_URL || !SERVICE_ROLE) {
    throw new Error("Supabase env missing: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  return createSupabaseClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false },
    global: { headers: { "X-Client-Info": "evalent/runner" } },
  });
}

// If you ever need a public/anon client (not used in /api/start right now)
export function createAnonClient() {
  if (!SUPABASE_URL || !ANON_KEY) {
    throw new Error("Supabase env missing: SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  return createSupabaseClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: true },
  });
}
