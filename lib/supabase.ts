import { createClient } from '@supabase/supabase-js';

export const supaSR = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // server routes only
  { auth: { persistSession: false } }
);
