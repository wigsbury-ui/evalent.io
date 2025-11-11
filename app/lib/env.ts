// app/lib/env.ts
export const env = {
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  DEFAULT_SCHOOL_ID: process.env.DEFAULT_SCHOOL_ID || 'default',
  PASSCODE: process.env.NEXT_PUBLIC_START_PASSCODE || '',
  SHEETS_ITEMS_CSV: process.env.SHEETS_ITEMS_CSV || '',
  SHEETS_ASSETS_CSV: process.env.SHEETS_ASSETS_CSV || '',
  SHEETS_BLUEPRINTS_CSV: process.env.SHEETS_BLUEPRINTS_CSV || ''
};
