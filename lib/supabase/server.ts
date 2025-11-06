// lib/supabase/server.ts
import 'server-only';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.SUPABASE_ANON_KEY!;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL is required');
if (!anon) throw new Error('SUPABASE_ANON_KEY is required');
if (!service) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');

// Client for server code that should use the anon key (rarely needed server-side)
export function getSupaAnon() {
  return createClient(url, anon, { auth: { persistSession: false } });
}

// Server-role client (use ONLY on the server — never in client components)
export function getSupaSR() {
  return createClient(url, service, { auth: { persistSession: false } });
}
