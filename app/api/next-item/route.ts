export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { getSupaSR } from '../../../lib/supabase';

export async function GET(req: Request) {
  try {
    const supa = getSupaSR();
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');
    const session_id = searchParams.get('session_id');

    let session: any = null;
    if (token) {
      const s = await supa.from('sessions').select('*').eq('token', token).single();
      session = s.data;
    } else if (session_id) {
      const s = await supa.from('sessions').select('*').eq('id', session_id).single();
      session = s.data;
    }
    if (!session) return NextResponse.json({ ok: false, error: 'session not found' }, { status: 404 });

    const idx = session.item_index ?? 0;

    const poolRes = await supa
      .from('items')
      .select('*')
      .order('programme', { ascending: true })
      .order('grade', { ascending: true })
      .order('item_id', { ascending: true });

    if (poolRes.error) {
      return NextResponse.json({ ok: false, error: poolRes.error.message }, { status: 500 });
    }
    const pool = poolRes.data || [];
    const total = pool.length;

    if (total === 0) {
      return NextResponse.json({ ok: false, error: 'No items in database', total: 0 }, { status: 400 });
    }
    if (idx >= total) {
      return NextResponse.json({ ok: true, item: null, index: idx, total });
    }

    return NextResponse.json({ ok: true, item: pool[idx], index: idx, total });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message || String(e) }, { status: 500 });
  }
}
