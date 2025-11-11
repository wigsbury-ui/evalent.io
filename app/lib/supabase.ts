import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE!; // support either name
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
  // Keep this a runtime error so build still succeeds in preview
  console.warn('[supabase] Missing SUPABASE_URL or service role key env vars.');
}

export function supaAdmin(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
    auth: { persistSession: false }
  });
}

export function supaAnon(): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_ANON) {
    console.warn('[supabase] Missing anon key; returning admin as fallback for server use.');
    return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, { auth: { persistSession: false }});
  }
  return createClient(SUPABASE_URL, SUPABASE_ANON, { auth: { persistSession: false }});
}
