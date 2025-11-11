// app/lib/supa.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from './env';

export const supaAdmin = (): SupabaseClient => {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase env vars missing');
  }
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
  });
};
