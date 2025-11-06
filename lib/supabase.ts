// lib/supabase.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';

function make(url?: string, key?: string): SupabaseClient {
  if (!url || !key) {
    // Return a client that will throw only when used, not at import/build time.
    return createClient('https://example.supabase.co', 'invalid', {
      global: {
        // @ts-expect-error force a runtime error if this stub client is used
        fetch: async () => { throw new Error('Supabase env missing. Set Vercel envs.'); },
      },
      auth: { persistSession: false },
    }) as unknown as SupabaseClient;
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

export function sbAnon() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;
  return make(url, key);
}

export function sbAdmin() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return make(url, key);
}
