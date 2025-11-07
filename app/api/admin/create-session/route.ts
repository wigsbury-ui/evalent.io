// app/api/admin/create-session/route.ts
import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { sbAdmin } from '@/lib/supabase';

export async function POST(_req: Request) {
  try {
    const sb = sbAdmin();
    const code = randomUUID().slice(0, 6).toUpperCase();

    // 1) School (slug/short_code filled by your DB trigger/defaults)
    const { data: school, error: schErr } = await sb
      .from('schools')
      .insert({ name: `Demo School ${code}` })
      .select('id')
      .single();
    if (schErr || !school) return NextResponse.json({ ok: false, error: schErr?.message || 'school insert failed' }, { status: 500 });

    // 2) Candidate (you added candidates.name)
    const { data: cand, error: candErr } = await sb
      .from('candidates')
      .insert({ name: `Candidate ${code}` })
      .select('id')
      .single();
    if (candErr || !cand) return NextResponse.json({ ok: false, error: candErr?.message || 'candidate insert failed' }, { status: 500 });

    // 3) Blueprint (config is jsonb not null default {})
    const { data: bp, error: bpErr } = await sb
      .from('blueprints')
      .insert({ slug: `demo-${code.toLowerCase()}`, config: {} })
      .select('id, slug')
      .single();
    if (bpErr || !bp) return NextResponse.json({ ok: false, error: bpErr?.message || 'blueprint insert failed' }, { status: 500 });

    // 4) Session (status MUST be one of: pending | in_progress | finished | cancelled)
    const token = randomUUID().replace(/-/g, '');
    const { error: sessErr } = await sb.from('sessions').insert({
      school_id:    school.id,
      candidate_id: cand.id,
      blueprint_id: bp.id,
      token,
      status: 'pending',  // <-- critical: matches the DB check
    });
    if (sessErr) return NextResponse.json({ ok: false, error: sessErr.message }, { status: 500 });

    // Return a simple payload; your UI can build a link from the token
    return NextResponse.json({ ok: true, token });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
