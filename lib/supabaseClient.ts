// lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Public client – safe to use in browser & server
export const supabase = createClient(url, anonKey, {
  auth: { persistSession: false },
});

// Admin client – server-side only, uses the service-role key.
// If the key is missing we still export *something* so imports don’t break.
export const supabaseAdmin = serviceRoleKey
  ? createClient(url, serviceRoleKey, { auth: { persistSession: false } })
  : createClient(url, anonKey, { auth: { persistSession: false } });
