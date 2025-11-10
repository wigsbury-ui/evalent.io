export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { supaAdmin } from '@/lib/supa';

export async function POST(req: Request) {
  const supa = supaAdmin();
  let body: any = {};
  try { body = await req.json(); } catch {}

  const token = String(body?.token || '').trim();
  const itemId = String(body?.itemId || '').trim();
  const selectedIndex = typeof body?.selectedIndex === 'number' ? body.selectedIndex : null;
  const answerText = typeof body?.answerText === 'string' ? body.answerText : null;

  if (!token || !itemId) return NextResponse.json({ error: 'Missing token or itemId' }, { status: 400 });

  const { data: session, error: sErr } = await supa
    .from('sessions')
    .select('id, status, item_index')
    .eq('token', token)
    .single();
  if (sErr || !session) return NextResponse.json({ error: 'Invalid token' }, { status: 404 });

  if (!['in_progress','active'].includes(String(session.status).toLowerCase())) {
    return NextResponse.json({ error: 'Session not active' }, { status: 400 });
  }

  // Fetch item to evaluate MCQ correctness
  const { data: item, error: iErr } = await supa
    .from('items')
    .select('id, type, correct_index')
    .eq('id', itemId)
    .single();
  if (iErr || !item) return NextResponse.json({ error: 'Item not found' }, { status: 404 });

  if (item.type === 'mcq') {
    const isCorrect = selectedIndex !== null && selectedIndex === item.correct_index;
    const { error: aErr } = await supa.from('attempts').insert({
      session_id: session.id, item_id: itemId, selected_index: selectedIndex, is_correct: isCorrect
    });
    if (aErr) return NextResponse.json({ error: aErr.message }, { status: 500 });
  } else {
    const { error: wErr } = await supa.from('written_answers').insert({
      session_id: session.id, item_id: itemId, answer_text: answerText ?? ''
    });
    if (wErr) return NextResponse.json({ error: wErr.message }, { status: 500 });
  }

  // advance pointer
  const { error: uErr } = await supa
    .from('sessions')
    .update({ item_index: (session.item_index ?? 0) + 1 })
    .eq('id', session.id);
  if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
