// app/api/admin/create-session/route.ts
import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { sbAdmin } from '@/lib/supabase';

export async function POST() {
  try {
    const sb = sbAdmin();

    // 1) School
    const { data: school, error: schErr } = await sb
      .from('schools')
      .insert({ name: `Demo School` })
      .select('id, slug, short_code')
      .single();
    if (schErr) throw schErr;

    // 2) Candidate
    const email = `demo+${Date.now()}@example.com`;
    const { data: cand, error: candErr } = await sb
      .from('candidates')
      .insert({ school_id: school.id, name: 'Demo Candidate', email })
      .select('id')
      .single();
    if (candErr) throw candErr;

    // 3) Blueprint
    const { data: bp, error: bpErr } = await sb
      .from('blueprints')
      .insert({ school_id: school.id, name: 'Default', slug: 'default', config: {} })
      .select('id')
      .single();
    if (bpErr) throw bpErr;

    // 4) Session (status must be allowed by check; use 'pending')
    const token = randomUUID().replace(/-/g, '');
    const { data: sess, error: sessErr } = await sb
      .from('sessions')
      .insert({
        school_id: school.id,
        candidate_id: cand.id,
        blueprint_id: bp.id,
        token,
        status: 'pending',
      })
      .select('id')
      .single();
    if (sessErr) throw sessErr;

    return NextResponse.json({ ok: true, token, session_id: sess.id });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
