// app/api/diag/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const url  = process.env.SUPABASE_URL || '';
  const key  = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const supa = url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;

  try {
    let db_ok = false;
    if (supa) {
      // cheap, safe check: head select with count against a public table that exists
      const { count, error } = await supa
        .from('items')
        .select('id', { head: true, count: 'exact' });
      db_ok = !error;
    }

    return NextResponse.json({
      ok: true,
      supabase_url_present: !!url,
      service_role_present: !!key,
      default_school_id_present: !!process.env.DEFAULT_SCHOOL_ID,
      passcode: (process.env.NEXT_PUBLIC_START_PASSCODE ?? '').trim() ? 'set' : 'missing',
      db_ping_ok: db_ok
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}
