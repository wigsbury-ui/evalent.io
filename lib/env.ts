// lib/env.ts
// Centralised, typed env accessor (build-safe). Critical keys are required,
// everything else defaults to '' so code can import without type errors.

type NonEmptyString = string & { __brand: 'nonempty' };
function req(name: string): NonEmptyString {
  const v = process.env[name];
  if (!v || v.trim() === '') {
    throw new Error(`Missing required env var: ${name}`);
  }
  return v as NonEmptyString;
}

export const env = {
  // ---- Supabase (required) ----
  SUPABASE_URL: req('SUPABASE_URL'),
  SUPABASE_ANON_KEY: req('SUPABASE_ANON_KEY'),
  SUPABASE_SERVICE_ROLE_KEY: req('SUPABASE_SERVICE_ROLE_KEY'),

  // ---- Public copies (optional) ----
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',

  // ---- Google Sheets CSVs (optional) ----
  SHEETS_ITEMS_CSV: process.env.SHEETS_ITEMS_CSV || '',
  SHEETS_ASSETS_CSV: process.env.SHEETS_ASSETS_CSV || '',
  SHEETS_BLUEPRINTS_CSV: process.env.SHEETS_BLUEPRINTS_CSV || '',

  // ---- App config (optional) ----
  DEFAULT_SCHOOL_ID: process.env.DEFAULT_SCHOOL_ID || '',
  NEXT_PUBLIC_START_PASSCODE: process.env.NEXT_PUBLIC_START_PASSCODE || '',
  USE_BLUEPRINTS: process.env.USE_BLUEPRINTS || '',

  // ---- Integrations (optional) ----
  RESEND_API_KEY: process.env.RESEND_API_KEY || '',
  ASSESSOR_EMAIL: process.env.ASSESSOR_EMAIL || '',
} as const;
