// lib/supabase.ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let _supaSR: SupabaseClient | null = null;

/**
 * Lazy server-side client.
 * Avoids blowing up at build time if env vars aren't injected yet.
 */
export function getSupaSR(): SupabaseClient {
  if (_supaSR) return _supaSR;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) throw new Error('Missing env: NEXT_PUBLIC_SUPABASE_URL');
  if (!key) throw new Error('Missing env: SUPABASE_SERVICE_ROLE_KEY');
  _supaSR = createClient(url, key, { auth: { persistSession: false } });
  return _supaSR;
}
