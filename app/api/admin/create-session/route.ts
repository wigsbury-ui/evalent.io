import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getSupaSR } from '../../../../lib/supabase';

function rndCode(len = 6) {
  // fallback in case DB default isn't used
  return Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, len).padEnd(len, 'X');
}

export async function POST() {
  const sb = getSupaSR();

  try {
    // 1) Demo school
    const schoolSlug = `demo-${Date.now()}`;
    const short_code = rndCode(6); // we also send one explicitly

    const { data: school, error: sErr } = await sb
      .from('schools')
      .insert({ name: 'Demo School', slug: schoolSlug, short_code })
      .select('id')
      .single();

    if (sErr) throw sErr;

    // 2) Demo candidate
    const email = `demo+${Date.now()}@example.com`;
    const { data: cand, error: cErr } = await sb
      .from('candidates')
      .insert({ school_id: school.id, name: 'Demo Candidate', email })
      .select('id')
      .single();

    if (cErr) throw cErr;

    // 3) Demo blueprint (use the biggest bucket you currently have: UK / Y7)
    const programme = 'UK';
    const grade = 'Y7';
    const bpSlug = `${programme.toLowerCase()}-${grade.toLowerCase()}-core`;

    const { data: bp, error: bErr } = await sb
      .from('blueprints')
      .insert({
        school_id: school.id,
        slug: bpSlug,
        programme,
        grade,
        label: `${programme} ${grade} (Core)`
      })
      .select('id')
      .single();

    if (bErr) throw bErr;

    // 4) Session
    const token = randomUUID().replace(/-/g, '');
    const { data: sess, error: seErr } = await sb
      .from('sessions')
      .insert({
        school_id: school.id,
        candidate_id: cand.id,
        blueprint_id: bp.id,
        token,
        item_index: 0,
        status: 'active'
      })
      .select('id, token')
      .single();

    if (seErr) throw seErr;

    return NextResponse.json({
      ok: true,
      session_id: sess.id,
      token: sess.token,
      take_url: `/take/${sess.token}`
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? String(err) });
  }
}
