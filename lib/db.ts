// lib/db.ts
import { createClient } from '@supabase/supabase-js';

const url  = process.env.SUPABASE_URL!;
const key  = process.env.SUPABASE_SERVICE_ROLE_KEY!; // use a service key on the server

export const supa = createClient(url, key, {
  auth: { persistSession: false },
});
