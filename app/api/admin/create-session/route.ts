import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { sbAdmin } from '@/lib/supabase';

export async function POST(_req: Request) {
  try {
    const sb = sbAdmin; // sbAdmin is a client instance (not a function)

    // 1) School (DB fills short_code/slug via defaults/trigger)
    const { data: school, error: schErr } = await sb
      .from('schools')
      .insert({ name: 'Demo School' })
      .select('id, short_code, slug')
      .single();
    if (schErr || !school) throw schErr ?? new Error('school insert failed');

    // 2) Candidate (ensure a non-null name)
    const { data: cand, error: candErr } = await sb
      .from('candidates')
      .insert({ name: 'Candidate ' + String(school.short_code ?? '').toUpperCase() })
      .select('id')
      .single();
    if (candErr || !cand) throw candErr ?? new Error('candidate insert failed');

    // 3) Blueprint (name + {} config required)
    const { data: bp, error: bpErr } = await sb
      .from('blueprints')
      .insert({
        school_id: school.id,
        name: 'Default',
        config: {}, // jsonb
      })
      .select('id')
      .single();
    if (bpErr || !bp) throw bpErr ?? new Error('blueprint insert failed');

    // 4) Session (status 'pending' is now valid; token drives test URL)
    const token = randomUUID().replace(/-/g, '');
    const { data: sess, error: sessErr } = await sb
      .from('sessions')
      .insert({
        token,
        school_id: school.id,
        candidate_id: cand.id,
        blueprint_id: bp.id,
        status: 'pending',
        item_index: 0,
      })
      .select('id')
      .single();
    if (sessErr || !sess) throw sessErr ?? new Error('session insert failed');

    return NextResponse.json({
      ok: true,
      session_id: sess.id,
      token,
      url: `/test/${token}`,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? String(e) },
      { status: 400 }
    );
  }
}
