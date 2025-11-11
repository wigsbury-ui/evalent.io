// app/api/submit/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supaAdmin } from '@/app/lib/supa';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { token, item_id, kind, selected_index, answer_text, correct_index } = body || {};

  if (!token || !item_id || !kind) {
    return NextResponse.json({ ok: false, error: 'missing_fields' }, { status: 400 });
  }

  const db = supaAdmin();
  const { data: session, error: sErr } = await db
    .from('sessions')
    .select('id')
    .eq('token', token)
    .single();
  if (sErr || !session) return NextResponse.json({ ok: false, error: 'session_not_found' }, { status: 404 });

  let is_correct: boolean | null = null;
  if (kind === 'mcq' && Number.isInteger(selected_index) && Number.isInteger(correct_index)) {
    is_correct = Number(selected_index) === Number(correct_index);
  }

  const { error: iErr } = await db.from('attempts').insert({
    session_id: session.id,
    item_id,
    kind,
    selected_index: Number.isInteger(selected_index) ? Number(selected_index) : null,
    answer_text: typeof answer_text === 'string' ? answer_text : null,
    is_correct
  });

  if (iErr) return NextResponse.json({ ok: false, error: iErr.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
