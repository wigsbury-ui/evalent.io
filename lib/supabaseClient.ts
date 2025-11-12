// lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';
import { env } from './env';

// If you have generated Database types, you can do:
// import type { Database } from './types';
// const make = (key: string) => createClient<Database>(env.SUPABASE_URL, key, { ... });

const make = (key: string) =>
  createClient(env.SUPABASE_URL, key, {
    auth: { persistSession: false },
    global: { headers: { 'x-application': 'evalent' } },
  });

/** Public client (anon key) — safe for browser use */
export const supabaseAnon = make(env.SUPABASE_ANON_KEY);

/** Admin client (service-role key) — server-only usage (API routes, server actions) */
export const supabaseAdmin = make(env.SUPABASE_SERVICE_ROLE_KEY);

/** Back-compat alias to satisfy older imports */
export { supabaseAdmin as supabaseService };

/** Optional default export: public client */
export default supabaseAnon;
