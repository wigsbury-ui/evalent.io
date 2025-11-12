// lib/env.ts
// Centralized, typed access to environment variables used across the app.
type NonEmptyString = string & { __brand: 'nonempty' };

function req(name: string): NonEmptyString {
  const v = process.env[name];
  if (!v || v.trim() === '') {
    throw new Error(`Missing required env var: ${name}`);
  }
  return v as NonEmptyString;
}

export const env = {
  // Supabase
  SUPABASE_URL: req('SUPABASE_URL'),
  SUPABASE_ANON_KEY: req('SUPABASE_ANON_KEY'),
  SUPABASE_SERVICE_ROLE_KEY: req('SUPABASE_SERVICE_ROLE_KEY'),

  // Public (client) copies if you use them elsewhere
  NEXT_PUBLIC_SUPABASE_URL: req('NEXT_PUBLIC_SUPABASE_URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: req('NEXT_PUBLIC_SUPABASE_ANON_KEY'),

  // Sheets (published-to-web CSVs)
  SHEETS_ITEMS_CSV: process.env.SHEETS_ITEMS_CSV || '',
  SHEETS_ASSETS_CSV: process.env.SHEETS_ASSETS_CSV || '',
  SHEETS_BLUEPRINTS_CSV: process.env.SHEETS_BLUEPRINTS_CSV || '',

  // Optional integrations
  RESEND_API_KEY: process.env.RESEND_API_KEY || '',
  ASSESSOR_EMAIL: process.env.ASSESSOR_EMAIL || '',
  USE_BLUEPRINTS: process.env.USE_BLUEPRINTS || '',
  NEXT_PUBLIC_START_PASSCODE: process.env.NEXT_PUBLIC_START_PASSCODE || '',
} as const;
