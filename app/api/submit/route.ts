export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { supaSR } from '@/lib/supabase';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');
  const session_id = searchParams.get('session_id');
  const item_id = searchParams.get('item_id');
  const payloadStr = searchParams.get('payload') || '{}';
  const payload = JSON.parse(payloadStr);

  const s = token
    ? await supaSR.from('sessions').select('*').eq('token', token).single()
    : await supaSR.from('sessions').select('*').eq('id', session_id!).single();
  const session = s.data;
  if (!session) return NextResponse.json({ ok:false, error:'session not found' }, { status:404 });

  const { data: item } = await supaSR.from('items').select('*').eq('item_id', item_id!).single();
  const isMcq = (item?.type || 'mcq') === 'mcq';
  const correct = isMcq ? (payload.choice === item.answer) : null;
  const score = isMcq ? (correct ? 1 : 0) : null;

  await supaSR.from('attempts').insert({
    session_id: session.id, item_id, response: payload, correct, score
  });

  const nextIndex = (session.item_index ?? 0) + 1;
  await supaSR.from('sessions').update({ item_index: nextIndex, status:'in_progress' }).eq('id', session.id);

  return NextResponse.json({ ok:true, correct, score, nextIndex });
}
