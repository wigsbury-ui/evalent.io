// lib/env.ts
export function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

// Private (server-only)
export const SUPABASE_URL = requireEnv('SUPABASE_URL');
export const SUPABASE_SERVICE_ROLE_KEY = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
export const DEFAULT_SCHOOL_ID = requireEnv('DEFAULT_SCHOOL_ID');

// Public (allowed to be NEXT_PUBLIC_*)
export const START_PASSCODE = requireEnv('NEXT_PUBLIC_START_PASSCODE');
