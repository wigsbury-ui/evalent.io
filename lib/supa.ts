// lib/supa.ts
import { createClient as supabaseCreate } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Server-side admin client (use in Route Handlers, Actions, jobs) */
export function createClient() {
  if (!SUPABASE_URL || !SERVICE_ROLE) {
    throw new Error("Supabase env missing: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  return supabaseCreate(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false },
    global: { headers: { "X-Client-Info": "evalent/runner" } },
  });
}

/** Back-compat: older routes import { supaAdmin } from '@/lib/supa' */
export const supaAdmin = createClient;

/** Optional public client (not needed for these routes) */
export function createAnonClient() {
  if (!SUPABASE_URL || !ANON_KEY) {
    throw new Error("Supabase env missing: SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  return supabaseCreate(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: true },
  });
}
