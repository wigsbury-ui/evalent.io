export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { supaSR } from '@/lib/supabase';

export async function POST(req: Request) {
  const { token, session_id } = await req.json();

  const s = token
    ? await supaSR.from('sessions').select('*').eq('token', token).single()
    : await supaSR.from('sessions').select('*').eq('id', session_id).single();
  const session = s.data;
  if (!session) return NextResponse.json({ ok:false, error:'session not found' }, { status:404 });

  const { data: attempts } = await supaSR.from('attempts').select('score,response,item_id').eq('session_id', session.id);
  const scored = (attempts || []).filter(a => a.score !== null);
  const mcqScore = scored.reduce((s,a)=> s+(a.score || 0), 0);
  const mcqCount = scored.length;

  const summary = { mcq: { score: mcqScore, outOf: mcqCount }, strengths: [], needs: [] };
  const recommendation = mcqCount ? ((mcqScore / mcqCount) >= 0.6 ? 'admit' : 'review') : 'review';

  const rep = await supaSR.from('reports').insert({
    session_id: session.id, summary, recommendation
  }).select('id').single();

  await supaSR.from('sessions').update({ status:'finished', finished_at: new Date().toISOString() }).eq('id', session.id);

  return NextResponse.json({ ok:true, report_id: rep.data?.id, recommendation, summary });
}
