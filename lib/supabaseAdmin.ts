// lib/supabaseAdmin.ts
// Service-role Supabase client for server-side writes (no RLS restrictions).

import { createClient } from '@supabase/supabase-js';
import { env } from './env';

export const supabaseAdmin = (() => {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      'Supabase admin misconfigured: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing',
    );
  }

  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
})();
