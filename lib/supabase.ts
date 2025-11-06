// lib/supabase.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';

function pickEnv(...names: string[]): string | undefined {
  for (const n of names) {
    const v = process.env[n];
    if (v && v.trim()) return v.trim();
  }
  return undefined;
}

// Read both server and public names to be resilient to refactors
const url =
  pickEnv('SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL') ||
  'https://example.supabase.co'; // harmless fallback for build

const key =
  pickEnv('SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_ANON_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY') ||
  'anon'; // harmless fallback for build

export const sbAdmin: SupabaseClient = createClient(url, key, {
  auth: { persistSession: false },
});
