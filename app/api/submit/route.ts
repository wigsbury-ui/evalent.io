// app/api/submit/route.ts
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { supaAdmin } from '@/lib/supa';

type Body = {
  token: string;
  item_id: string;           // uuid
  selected_index?: number;   // for MCQ
  answer_text?: string;      // for written
};

export async function POST(req: Request) {
  try {
    const payload = (await req.json()) as Body;

    if (!payload?.token || !payload?.item_id) {
      return NextResponse.json({ error: 'Missing token or item_id' }, { status: 400 });
    }

    // session
    const { data: session, error: sErr } = await supaAdmin
      .from('sessions')
      .select('id, item_index, status')
      .eq('token', payload.token)
      .single();
    if (sErr || !session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

    // item (for correctness)
    const { data: item, error: iErr } = await supaAdmin
      .from('items')
      .select('id, correct_index, kind')
      .eq('id', payload.item_id)
      .single();
    if (iErr || !item) return NextResponse.json({ error: 'Item not found' }, { status: 404 });

    let is_correct: boolean | null = null;

    if (item.kind === 'mcq' || item.kind == null) {
      const sel = Number.isInteger(payload.selected_index) ? Number(payload.selected_index) : null;
      if (sel == null) return NextResponse.json({ error: 'selected_index required' }, { status: 400 });
      is_correct = item.correct_index != null ? sel === item.correct_index : null;

      // record attempt
      const { error: aErr } = await supaAdmin.from('attempts').insert({
        session_id: session.id,
        item_id: item.id,
        selected_index: sel,
        is_correct,
      });
      if (aErr) return NextResponse.json({ error: aErr.message }, { status: 400 });
    } else {
      // written
      const text = (payload.answer_text ?? '').toString();
      const { error: wErr } = await supaAdmin.from('written_answers').insert({
        session_id: session.id,
        item_id: item.id,
        answer_text: text,
      });
      if (wErr) return NextResponse.json({ error: wErr.message }, { status: 400 });
    }

    // advance index
    const { error: uErr } = await supaAdmin
      .from('sessions')
      .update({ item_index: session.item_index + 1, status: 'active' })
      .eq('id', session.id);
    if (uErr) return NextResponse.json({ error: uErr.message }, { status: 400 });

    return NextResponse.json({ ok: true, is_correct });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}
