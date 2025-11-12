import { createClient } from '@supabase/supabase-js'
import { env } from './env'

export const supabaseAnon = (() => {
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    throw new Error('Supabase client misconfigured: SUPABASE_URL or SUPABASE_ANON_KEY missing')
  }// lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';
import { env } from './env';

// If you have generated DB types, replace `any` with your Database type.
// import type { Database } from './types';
// const make = (key: string) => createClient<Database>(env.SUPABASE_URL, key, { ... });

const make = (key: string) =>
  createClient(env.SUPABASE_URL, key, {
    auth: { persistSession: false },
    global: { headers: { 'x-application': 'evalent' } },
  });

/** Public client (anon key) */
export const supabaseAnon = make(env.SUPABASE_ANON_KEY);

/** Admin client (service-role key) — server-only */
export const supabaseAdmin = make(env.SUPABASE_SERVICE_ROLE_KEY);

/** Back-compat alias for older imports */
export { supabaseAdmin as supabaseService };

/** Optional default export (public client) */
export default supabaseAnon;

  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, { auth: { persistSession: false } })
})()
