// app/api/submit/route.ts
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function supaAdmin() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { token, item_id, type, selected_index, answer_text } = body || {};
  if (!token || !item_id || !type) {
    return NextResponse.json({ error: 'Missing token/item_id/type' }, { status: 400 });
  }

  const supa = supaAdmin();

  // session
  const { data: session, error: sErr } = await supa
    .from('sessions')
    .select('id, item_index, school_id')
    .eq('token', token)
    .single();
  if (sErr || !session) return NextResponse.json({ error: 'Invalid token' }, { status: 404 });

  // item (to compute correctness for MCQ)
  const { data: item, error: iErr } = await supa
    .from('items')
    .select('id, correct_index, type')
    .eq('id', item_id)
    .single();
  if (iErr || !item) return NextResponse.json({ error: 'Invalid item' }, { status: 400 });

  if (type === 'mcq') {
    const is_correct = selected_index === item.correct_index;
    const ins = await supa.from('attempts').insert([{
      session_id: session.id,
      item_id: item.id,
      selected_index,
      is_correct
    }]);
    if (ins.error) return NextResponse.json({ error: ins.error.message }, { status: 500 });
  } else if (type === 'written') {
    const ins = await supa.from('written_answers').insert([{
      session_id: session.id,
      item_id: item.id,
      answer_text: String(answer_text ?? '')
    }]);
    if (ins.error) return NextResponse.json({ error: ins.error.message }, { status: 500 });
  }

  // advance index
  const upd = await supa
    .from('sessions')
    .update({ item_index: session.item_index + 1 })
    .eq('id', session.id);
