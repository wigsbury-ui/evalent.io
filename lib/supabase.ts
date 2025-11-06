// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SR_KEY        = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ANON_KEY      = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Server-side Supabase client using the SERVICE ROLE key.
 * For API routes / server actions only. Never expose to the browser.
 */
export function getSupaSR() {
  if (!SUPABASE_URL || !SR_KEY) {
    throw new Error('Missing SUPABASE env: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }
  return createClient(SUPABASE_URL, SR_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { 'X-Client-Info': 'evalent-api' } },
  });
}

/** Optional: anon client (not used by the fixes below) */
export function getSupaAnon() {
  if (!SUPABASE_URL || !ANON_KEY) {
    throw new Error('Missing SUPABASE env: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
  return createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
