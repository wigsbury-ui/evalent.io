// lib/supabase.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const PUBLIC_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY    = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const ADMIN_URL   = process.env.SUPABASE_URL || PUBLIC_URL; // works if only public URL is set
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;

function make(url?: string, key?: string): SupabaseClient {
  if (!url || !key) {
    throw new Error('Supabase env missing (URL/key). Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY.');
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

export const sbAnon  = () => make(PUBLIC_URL, ANON_KEY);
export const sbAdmin = () => make(ADMIN_URL,  SERVICE_KEY);
