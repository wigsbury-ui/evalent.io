import { NextResponse } from 'next/server';
import { sbAdmin } from '@/lib/supabase';
import { randomUUID } from 'crypto';

export async function POST(_req: Request) {
  try {
    const sb = sbAdmin;

    // 1) School (slug/short_code now handled in DB with triggers/defaults)
    const { data: school, error: schErr } = await sb
      .from('schools')
      .insert({ name: 'Demo School' })
      .select('id, short_code, slug')
      .single();
    if (schErr) throw schErr;
    const schoolId = school.id;

    // 2) Candidate (name column exists; we backfilled earlier)
    const email = `demo+${Date.now()}@example.com`;
    const { data: cand, error: candErr } = await sb
      .from('candidates')
      .insert({ school_id: schoolId, name: 'Demo Candidate', email })
      .select('id')
      .single();
    if (candErr) throw candErr;
    const candidateId = cand.id;

    // 3) Blueprint (config jsonb default {} ensured in DB)
    const { data: bp, error: bpErr } = await sb
      .from('blueprints')
      .insert({ school_id: schoolId, name: 'Y7 Core', slug: 'y7-core', config: {} })
      .select('id')
      .single();
    if (bpErr) throw bpErr;
    const blueprintId = bp.id;

    // 4) Session (rely on DB default status='pending'; just set token)
    const token = randomUUID().replace(/-/g, '');
    const { error: sessErr } = await sb
      .from('sessions')
      .insert({ school_id: schoolId, candidate_id: candidateId, blueprint_id: blueprintId, token })
      .select('token')
      .single();
    if (sessErr) throw sessErr;

    return NextResponse.json({ ok: true, token, link: `/test?token=${token}` });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 400 });
  }
}
