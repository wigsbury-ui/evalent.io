import { NextResponse } from 'next/server';
import { sbAdmin } from '@/lib/supabase';

export async function POST() {
  try {
    const sb = sbAdmin(); // NOTE: call it (function returns a client)

    // 1) School (DB fills short_code/slug via defaults/trigger)
    const { data: school, error: schErr } = await sb
      .from('schools')
      .insert({ name: 'Demo School' })
      .select('id, short_code, slug')
      .single();
    if (schErr || !school) {
      throw new Error(schErr?.message || 'failed to create school');
    }

    // 2) Candidate (ensure name exists)
    const { data: cand, error: candErr } = await sb
      .from('candidates')
      .insert({ name: 'Demo Candidate' })
      .select('id')
      .single();
    if (candErr || !cand) {
      throw new Error(candErr?.message || 'failed to create candidate');
    }

    // 3) Blueprint (respect NOT NULLs: name, programme, grade, pass_logic, config)
    const { data: bp, error: bpErr } = await sb
      .from('blueprints')
      .insert({
        name: 'Default',
        programme: 'UK',
        grade: 7,
        pass_logic: {},   // jsonb
        config: {},       // jsonb
        // school_id: school.id, // uncomment if your schema has this FK (nullable is fine)
      })
      .select('id')
      .single();
    if (bpErr || !bp) {
      throw new Error(bpErr?.message || 'failed to create blueprint');
    }

    // 4) Session (use allowed status and a token)
    const token = crypto.randomUUID().replace(/-/g, '').slice(0, 32);
    const { data: sess, error: sessErr } = await sb
      .from('sessions')
      .insert({
        school_id: school.id,
        candidate_id: cand.id,
        blueprint_id: bp.id,
        status: 'pending', // must match the CHECK constraint
        token,
      })
      .select('id, token')
      .single();
    if (sessErr || !sess) {
      throw new Error(sessErr?.message || 'failed to create session');
    }

    return NextResponse.json({
      ok: true,
      token: sess.token,
      // adjust this path to your actual start page:
      link: `/start?token=${sess.token}`,
      school,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}
