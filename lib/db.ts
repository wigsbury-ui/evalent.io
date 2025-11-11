// app/lib/db.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL || '';
const key = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_ANON_KEY || '';

if (!url || !key) {
  console.warn('[app/lib/db] Missing SUPABASE_URL and/or SUPABASE_SERVICE_ROLE/ANON_KEY.');
}

export const db: SupabaseClient = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
