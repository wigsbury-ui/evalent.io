export const env = {
  SUPABASE_URL: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  DEFAULT_SCHOOL_ID: process.env.DEFAULT_SCHOOL_ID || 'f347d17d-6faa-47a1-809d-62cd69e945f2',
  NEXT_PUBLIC_START_PASSCODE: process.env.NEXT_PUBLIC_START_PASSCODE || '',
  SHEETS_ITEMS_CSV: process.env.SHEETS_ITEMS_CSV || process.env.SHEET_ITEMS_CSV_URL || '',
  SHEETS_ASSETS_CSV: process.env.SHEETS_ASSETS_CSV || process.env.SHEET_ASSETS_CSV_URL || '',
  SHEETS_BLUEPRINTS_CSV: process.env.SHEETS_BLUEPRINTS_CSV || '',
  USE_BLUEPRINTS: (process.env.USE_BLUEPRINTS || 'false').toLowerCase() === 'true',
  RESEND_API_KEY: process.env.RESEND_API_KEY || '',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || ''
}
