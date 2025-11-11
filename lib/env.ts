// lib/env.ts

// Strict helper: throws if the env is missing
export function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

// Lenient helper: tries several names, allows fallback
export function getEnv(name: string, fallback = ""): string {
  // try exact, then NEXT_PUBLIC_, then fallback
  return (
    process.env[name] ??
    process.env[`NEXT_PUBLIC_${name}`] ??
    fallback
  );
}

// ---------- Private (server-only) ----------
export const SUPABASE_URL = requireEnv("SUPABASE_URL");
export const SUPABASE_SERVICE_ROLE_KEY = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
export const DEFAULT_SCHOOL_ID = requireEnv("DEFAULT_SCHOOL_ID");

// ---------- Public (allowed to be NEXT_PUBLIC_*) ----------
export const START_PASSCODE = requireEnv("NEXT_PUBLIC_START_PASSCODE");

// Sheets sources
// Primary: your real variable name
export const SHEETS_BLUEPRINTS_CSV = getEnv("SHEETS_BLUEPRINTS_CSV");
// Legacy alias (kept for backward compat so old code/messages still work)
export const BLUEPRINTS_CSV_URL = getEnv("BLUEPRINTS_CSV_URL");
