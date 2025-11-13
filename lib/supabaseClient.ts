// lib/supabaseClient.ts
// Anonymous Supabase client for all read-only / public operations.

import { createClient } from '@supabase/supabase-js';
import { env } from './env';

export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});
