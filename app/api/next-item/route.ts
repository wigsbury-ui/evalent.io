import { NextRequest, NextResponse } from 'next/server';
import { sbAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token') ?? '';
  if (!token) {
    return NextResponse.json({ ok: false, error: 'missing token' }, { status: 400 });
  }

  const sb = sbAdmin;

  const { data: sess, error: sErr } = await sb
    .from('sessions')
    .select('id')
    .eq('token', token)
    .single();

  if (sErr || !sess) {
    return NextResponse.json(
      { ok: false, error: sErr?.message || 'session not found' },
      { status: 404 }
    );
  }

  const { data: tried } = await sb
    .from('attempts')
    .select('item_id')
    .eq('session_id', sess.id);

  const attemptedIds = (tried ?? []).map((r: any) => r.item_id);
  let q = sb.from('items').select('id, stem, options, answer').limit(1);
  if (attemptedIds.length) {
    q = q.not('id', 'in', `(${attemptedIds.join(',')})`);
  }

  const { data: items, error: iErr } = await q;
  if (iErr) return NextResponse.json({ ok: false, error: iErr.message }, { status: 500 });
  if (!items || items.length === 0) return NextResponse.json({ ok: true, done: true });

  return NextResponse.json({ ok: true, item: items[0] });
}
await sb.from('sessions')
  .update({ status: 'in_progress' })
  .eq('id', sessionId)
  .eq('status', 'pending');
