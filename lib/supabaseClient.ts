// lib/supabaseClient.ts
// Shared Supabase client for anonymous (non-admin) access, used by the
// student test flow and diagnostics/reporting API routes.

import { createClient } from '@supabase/supabase-js';
import { env } from './env';

export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});
