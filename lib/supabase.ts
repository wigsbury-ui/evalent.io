// lib/supabase.ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SR_KEY       = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ANON_KEY     = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function assertEnv() {
  if (!SUPABASE_URL) throw new Error('Missing env: NEXT_PUBLIC_SUPABASE_URL');
}

/** Internal singleton holders (server only) */
let _sr: SupabaseClient | undefined;
let _anon: SupabaseClient | undefined;

/** Server-side Supabase client using the SERVICE-ROLE key */
export function getSupaSR(): SupabaseClient {
  assertEnv();
  if (!SR_KEY) throw new Error('Missing env: SUPABASE_SERVICE_ROLE_KEY');
  if (!_sr) {
    _sr = createClient(SUPABASE_URL, SR_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { 'X-Client-Info': 'evalent-api' } },
    });
  }
  return _sr;
}

/** Public/anon client (rarely needed in API routes, included for completeness) */
export function getSupaAnon(): SupabaseClient {
  assertEnv();
  if (!ANON_KEY) throw new Error('Missing env: NEXT_PUBLIC_SUPABASE_ANON_KEY');
  if (!_anon) {
    _anon = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { 'X-Client-Info': 'evalent-web' } },
    });
  }
  return _anon;
}

/** Back-compat named exports used by existing route files */
export const sbAdmin: SupabaseClient = getSupaSR();
export const sbAnon: SupabaseClient  = getSupaAnon();
