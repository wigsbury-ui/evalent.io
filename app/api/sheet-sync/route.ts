import { NextResponse } from 'next/server';
import { sbAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    const sb = sbAdmin();

    // just report counts for now (CSV import can be added later)
    const [{ count: items = 0 }, { count: assets = 0 }] = await Promise.all([
      sb.from('items').select('*', { count: 'exact', head: true }),
      sb.from('assets').select('*', { count: 'exact', head: true }),
    ]);

    return NextResponse.json({ ok: true, items, assets });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err?.message || err) }, { status: 500 });
  }
}
