import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

function envFlag(name: string): boolean {
  return !!process.env[name] && process.env[name] !== '';
}

export async function GET() {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const anonKey = process.env.SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || (!anonKey && !serviceKey)) {
      return NextResponse.json(
        {
          env: {
            SUPABASE_URL: !!supabaseUrl,
            SUPABASE_ANON_KEY: !!anonKey,
            SUPABASE_SERVICE_ROLE_KEY: !!serviceKey,
          },
          counts: {
            items: 0,
            assets: 0,
            blueprints: 0,
          },
          error: 'Missing SUPABASE_URL or any Supabase key',
        },
        { status: 500 }
      );
    }

    // Prefer service role on the server so RLS can’t hide any rows
    const supabase = createClient(supabaseUrl, serviceKey || (anonKey as string));

    const [itemsRes, assetsRes, blueprintsRes] = await Promise.all([
      supabase.from('items').select('*', { count: 'exact', head: true }),
      supabase.from('assets').select('*', { count: 'exact', head: true }),
      supabase.from('blueprints').select('*', { count: 'exact', head: true }),
    ]);

    const itemsCount = itemsRes.count ?? 0;
    const assetsCount = assetsRes.count ?? 0;
    const blueprintsCount = blueprintsRes.count ?? 0;

    return NextResponse.json({
      env: {
        SUPABASE_URL: envFlag('SUPABASE_URL'),
        SUPABASE_ANON_KEY: envFlag('SUPABASE_ANON_KEY'),
        SUPABASE_SERVICE_ROLE_KEY: envFlag('SUPABASE_SERVICE_ROLE_KEY'),
        DEFAULT_SCHOOL_ID: envFlag('DEFAULT_SCHOOL_ID'),
        NEXT_PUBLIC_START_PASSCODE: envFlag('NEXT_PUBLIC_START_PASSCODE'),
        SHEETS_ITEMS_CSV: envFlag('SHEETS_ITEMS_CSV'),
        SHEETS_ASSETS_CSV: envFlag('SHEETS_ASSETS_CSV'),
        SHEETS_BLUEPRINTS_CSV: envFlag('SHEETS_BLUEPRINTS_CSV'),
        USE_BLUEPRINTS: envFlag('USE_BLUEPRINTS'),
        RESEND_API_KEY: envFlag('RESEND_API_KEY'),
      },
      counts: {
        items: itemsCount,
        assets: assetsCount,
        blueprints: blueprintsCount,
      },
      // optional debug in case something is wrong
      errors: {
        items: itemsRes.error ? itemsRes.error.message : null,
        assets: assetsRes.error ? assetsRes.error.message : null,
        blueprints: blueprintsRes.error ? blueprintsRes.error.message : null,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: err?.message ?? String(err),
      },
      { status: 500 }
    );
  }
}

export async function POST() {
  // For convenience if you ever POST to /api/diag
  return GET();
}
