// app/api/submit/route.ts
import { NextResponse } from 'next/server';
import { supa } from '@/lib/db';
import { items } from '@/lib/items';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { token, itemId, answer } = body ?? {};

    if (!token || !itemId) {
      return NextResponse.json({ ok: false, error: 'Missing token or itemId' }, { status: 400 });
    }

    const { data: session, error: sErr } = await supa
      .from('sessions')
      .select('id, item_index')
      .eq('public_token', token)
      .single();

    if (sErr || !session) {
      return NextResponse.json({ ok: false, error: 'Session not found' }, { status: 404 });
    }

    const nextIndex = (session.item_index ?? 0) + 1;
    const finished  = nextIndex >= items.length;

    const { error: uErr } = await supa
      .from('sessions')
      .update({
        item_index: nextIndex,
        last_answered_at: new Date().toISOString(),
        finished_at: finished ? new Date().toISOString() : null,
        status: finished ? 'finished' : 'pending',
      })
      .eq('id', session.id);

    if (uErr) {
      return NextResponse.json({ ok: false, error: uErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, finished });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? 'Server error' }, { status: 500 });
  }
}
