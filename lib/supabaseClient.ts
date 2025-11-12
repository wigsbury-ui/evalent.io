import { createClient } from '@supabase/supabase-js'
import { env } from './env'

export const supabaseAnon = (() => {
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    throw new Error('Supabase client misconfigured: SUPABASE_URL or SUPABASE_ANON_KEY missing')
  }
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, { auth: { persistSession: false } })
})()
