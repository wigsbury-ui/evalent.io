import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getSupaSR } from '@/lib/supabase/server';

export async function POST(_req: Request) {
  const sb = getSupaSR();

  // 1) School (uses your DB defaults for short_code, slug)
  const { data: school, error: schErr } = await sb
    .from('schools')
    .insert({ name: 'Demo School' })
    .select('id, short_code, slug')
    .single();

  if (schErr || !school) {
    return NextResponse.json({ ok: false, error: schErr?.message ?? 'No school' }, { status: 500 });
  }

  // 2) Candidate
  const email = `demo+${Date.now()}@example.com`;
  const { data: cand, error: candErr } = await sb
    .from('candidates')
    .insert({ school_id: school.id, name: 'Demo Candidate', email })
    .select('id')
    .single();

  if (candErr || !cand) {
    return NextResponse.json({ ok: false, error: candErr?.message ?? 'No candidate' }, { status: 500 });
  }

  // 3) Blueprint (pick something that exists in items)
  //    You already have UK/Y7 items; slug can be any unique string.
  const { data: bp, error: bpErr } = await sb
    .from('blueprints')
    .insert({
      school_id: school.id,
      name: 'Demo UK Y7 Core',
      programme: 'UK',
      grade: 'Y7',
      slug: 'uk-y7-core'
    })
    .select('id')
    .single();

  if (bpErr || !bp) {
    return NextResponse.json({ ok: false, error: bpErr?.message ?? 'No blueprint' }, { status: 500 });
  }

  // 4) Session with token
  const token = randomUUID().replace(/-/g, '');
  const { data: sess, error: sessErr } = await sb
    .from('sessions')
    .insert({
      school_id: school.id,
      candidate_id: cand.id,
      blueprint_id: bp.id,
      token
    })
    .select('id, token')
    .single();

  if (sessErr || !sess) {
    return NextResponse.json({ ok: false, error: sessErr?.message ?? 'No session' }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    session_id: sess.id,
    token: sess.token,
    take_url: `/take/${sess.token}`
  });
}
