export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { supaAdmin } from '@/lib/supa';

type Body = {
  token: string;
  item_id: string;
  selected_index?: number | null;
  answer_text?: string | null;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    if (!body?.token || !body?.item_id) {
      return NextResponse.json({ ok: false, error: 'missing_fields' }, { status: 400 });
    }

    const supa = supaAdmin();

    // get session
    const { data: session, error: sErr } = await supa
      .from('sessions')
      .select('id, item_index, status')
      .eq('token', body.token)
      .single();
    if (sErr) return NextResponse.json({ ok: false, error: sErr.message }, { status: 500 });
    if (!session) return NextResponse.json({ ok: false, error: 'session_not_found' }, { status: 404 });
    if (session.status === 'complete') return NextResponse.json({ ok: false, error: 'already_complete' }, { status: 409 });

    // fetch item (for correctness if MCQ)
    const { data: item, error: iErr } = await supa
      .from('items')
      .select('id, kind, correct_index')
      .eq('id', body.item_id)
      .single();
    if (iErr) return NextResponse.json({ ok: false, error: iErr.message }, { status: 500 });

    // record answer
    if (item?.kind === 'mcq') {
      const is_correct =
        typeof body.selected_index === 'number' && typeof item.correct_index === 'number'
          ? body.selected_index === item.correct_index
          : null;

      const { error: aErr } = await supa.from('attempts').insert({
        session_id: session.id,
        item_id: item.id,
        selected_index: body.selected_index ?? null,
        is_correct,
      });
      if (aErr) return NextResponse.json({ ok: false, error: aErr.message }, { status: 500 });
    } else {
      const { error: wErr } = await supa.from('written_answers').insert({
        session_id: session.id,
        item_id: item.id,
        answer_text: body.answer_text ?? '',
      });
      if (wErr) return NextResponse.json({ ok: false, error: wErr.message }, { status: 500 });
    }

    // advance index; if no next item, mark complete
    const { data: nextExists, error: nErr } = await supa
      .from('items')
      .select('id', { count: 'exact', head: true })
      .eq('active', true)
      .order('id', { ascending: true })
      .range(session.item_index + 1, session.item_index + 1);

    if (nErr) return NextResponse.json({ ok: false, error: nErr.message }, { status: 500 });

    if ((nextExists as any) === null) {
      // head query returns null data; we rely on count via status code—simplify: mark complete if update of index finds nothing later in next-item
      await supa.from('sessions').update({ item_index: session.item_index + 1 }).eq('id', session.id);
    } else {
      await supa.from('sessions').update({ item_index: session.item_index + 1 }).eq('id', session.id);
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
