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

    // load session
    let session: any = null;
    if (token) {
      const s = await supa.from('sessions').select('*').eq('token', token).single();
      session = s.data;
    } else if (session_id) {
      const s = await supa.from('sessions').select('*').eq('id', session_id).single();
      session = s.data;
    }
    if (!session) return NextResponse.json({ ok:false, error:'session not found' }, { status:404 });

    // load blueprint
    const bpRes = await supa.from('blueprints').select('*').eq('id', session.blueprint_id).single();
    const programme = bpRes.data?.programme;
    const grade = bpRes.data?.grade;

    const idx = session.item_index ?? 0;

    // Fetch item pool with graceful fallbacks
    let poolRes = await supa
      .from('items')
      .select('*')
      .eq('programme', programme)
      .eq('grade', grade)
      .order('item_id', { ascending: true });

    if (!poolRes.data || poolRes.data.length === 0) {
      poolRes = await supa
        .from('items')
        .select('*')
        .eq('programme', programme)
        .order('item_id', { ascending: true });
    }
    if (!poolRes.data || poolRes.data.length === 0) {
      poolRes = await supa
        .from('items')
        .select('*')
        .order('programme', { ascending: true })
        .order('grade', { ascending: true })
        .order('item_id', { ascending: true });
    }

    const pool = poolRes.data || [];
    const total = pool.length;
    if (idx >= total) {
      return NextResponse.json({ ok:true, item: null, index: idx, total });
    }

    const item = pool[idx];
    return NextResponse.json({ ok:true, item, index: idx, total });
  } catch (e:any) {
    return NextResponse.json({ ok:false, error: e.message || String(e) }, { status:500 });
  }
}
