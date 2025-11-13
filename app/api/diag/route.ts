// app/api/diag/route.ts
import { env } from '@/lib/env';
import { supabase } from '@/lib/supabaseClient';

async function count(name: string) {
  const { count, error } = await supabase
    .from(name)
    .select('id', { count: 'exact', head: true });
  if (error) return null;
  return count;
}

export async function GET() {
  const vars = {
    SUPABASE_URL: !!env.SUPABASE_URL,
    SUPABASE_ANON_KEY: !!env.SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: !!env.SUPABASE_SERVICE_ROLE_KEY,
    DEFAULT_SCHOOL_ID: env.DEFAULT_SCHOOL_ID,
    NEXT_PUBLIC_START_PASSCODE: !!env.NEXT_PUBLIC_START_PASSCODE,
    SHEETS_ITEMS_CSV: !!env.SHEETS_ITEMS_CSV,
    SHEETS_ASSETS_CSV: !!env.SHEETS_ASSETS_CSV,
    SHEETS_BLUEPRINTS_CSV: !!env.SHEETS_BLUEPRINTS_CSV,
    USE_BLUEPRINTS: env.USE_BLUEPRINTS,
    RESEND_API_KEY: !!env.RESEND_API_KEY,
  };

  const [itemsV, assetsV, blueprintsV] = await Promise.all([
    count('items_vw'),
    count('assets_vw'),
    count('blueprints_vw'),
  ]);

  const [itemsT, assetsT, blueprintsT] = await Promise.all([
    count('items'),
    count('assets'),
    count('blueprints'),
  ]);

  return new Response(
    JSON.stringify(
      {
        env: vars,
        counts: {
          items: itemsV ?? itemsT,
          assets: assetsV ?? assetsT,
          blueprints: blueprintsV ?? blueprintsT,
        },
      },
      null,
      2,
    ),
    { headers: { 'Content-Type': 'application/json' } },
  );
}
