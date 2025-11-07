import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { sbAdmin } from '@/lib/supabase';

export async function POST(_req: Request) {
  try {
    const sb = sbAdmin(); // factory → client

    // 1) School (DB fills short_code/slug via defaults/trigger)
    const { data: school, error: schErr } = await sb
      .from('schools')
      .insert({ name: 'Demo School' })
      .select('id, short_code, slug')
      .single();
    if (schErr || !school) throw schErr ?? new Error('school insert failed');

    // 2) Candidate (ensure non-null name)
    const candidateName =
      'Candidate ' + String(school.short_code ?? '').toUpperCase();
    const { data: cand, error: candErr } = await sb
      .from('candidates')
      .insert({ name: candidateName })
      .select('id')
      .single();
    if (candErr || !cand) throw candErr ?? new Error('candidate insert failed');

    // 3) Blueprint (programme is REQUIRED → set an explicit default)
    const { data: bp, error: bpErr } = await sb
      .from('blueprints')
      .insert({
        school_id: school.id,
        name: 'Default',
        programme: 'UK',     // ← important
        config: {},          // jsonb not null
      })
      .select('id')
      .single();
    if (bpErr || !bp) throw bpErr ?? new Error('blueprint insert failed');

    // 4) Session (status must be allowed; 'pending' is valid)
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
