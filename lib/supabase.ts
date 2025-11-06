// lib/supabase.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';

function pickEnv(...names: string[]): string | undefined {
  for (const n of names) {
    const v = process.env[n];
    if (v && v.trim()) return v.trim();
  }
}

function makeClient(): SupabaseClient {
  const url = pickEnv('SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL') || '';
  const key = pickEnv('SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_ANON_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY') || '';
  if (!url || !key) {
    return createClient('https://example.supabase.co', 'invalid', {
      // @ts-expect-error stub fetch to surface a clear error at runtime, not build time
      global: { fetch: async () => { throw new Error('Supabase env missing (URL/key). Set them in Vercel.'); } },
      auth: { persistSession: false },
    } as any);
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

export const sbAdmin: SupabaseClient = makeClient();
