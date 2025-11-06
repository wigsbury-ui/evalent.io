// lib/supabase.ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.SUPABASE_ANON_KEY!;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function assertEnv() {
  if (!URL) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL');
  if (!ANON) throw new Error('Missing SUPABASE_ANON_KEY');
  if (!SERVICE) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
}

/** Public client (browser-safe if ever needed) */
export function sbPublic(): SupabaseClient {
  assertEnv();
  return createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Admin client for API routes (uses service key) */
export function sbAdmin(): SupabaseClient {
  assertEnv();
  return createClient(URL, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });
}
