import { NextRequest, NextResponse } from 'next/server';
import { sbAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { token, item_id, answer } = await req.json();
    if (!token || !item_id) {
      return NextResponse.json(
        { ok: false, error: 'missing token or item_id' },
        { status: 400 }
      );
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

    // simple replace semantics to avoid assuming upsert constraints
    await sb.from('attempts').delete().eq('session_id', sess.id).eq('item_id', item_id);

    const { error: aErr } = await sb.from('attempts').insert({
      session_id: sess.id,
      item_id,
      response: answer ?? null,
      created_at: new Date().toISOString(),
    });

    if (aErr) {
      return NextResponse.json({ ok: false, error: aErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
