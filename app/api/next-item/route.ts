import { NextRequest, NextResponse } from 'next/server';
import { sbAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const token = (url.searchParams.get('token') ?? '').trim();
    if (!token) return NextResponse.json({ ok: false, error: 'missing token' }, { status: 400 });

    const sb = sbAdmin();

    const { data: sess, error: e1 } = await sb
      .from('sessions')
      .select('id,item_index')
      .eq('token', token)
      .single();
    if (e1 || !sess) return NextResponse.json({ ok: false, error: 'session not found' }, { status: 404 });

    const { data: items, error: e2 } = await sb.from('items').select('*').order('item_id', { ascending: true });
    if (e2) return NextResponse.json({ ok: false, error: e2.message }, { status: 500 });

    const total = items?.length ?? 0;
    const idx = Math.max(0, Math.min(sess.item_index ?? 0, Math.max(0, total - 1)));
    const item = items && items[idx] ? { ...items[idx] } : null;

    if (item && !item.item_id) item.item_id = item.id ?? `${idx + 1}`;

    return NextResponse.json({ ok: true, index: idx, total, item });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err?.message || err) }, { status: 500 });
  }
}
