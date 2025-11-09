import { NextResponse } from 'next/server';
import { supaAdmin } from '@/lib/supa';

export async function GET() {
  try {
    const supa = supaAdmin();
    const { data: ping, error } = await supa.rpc('now'); // try a cheap call
    return NextResponse.json({
      ok: !error,
      supabase_url_present: !!process.env.SUPABASE_URL,
      service_role_present: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      default_school_id_present: !!process.env.DEFAULT_SCHOOL_ID,
      passcode: (process.env.NEXT_PUBLIC_START_PASSCODE ?? '').length ? 'set' : 'missing',
      db_ping_ok: !error
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}
