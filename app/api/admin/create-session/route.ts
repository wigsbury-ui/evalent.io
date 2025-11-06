import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { sbAdmin } from '@/lib/supabase';

function rndCode(len = 6) {
  // Fallback usable code in case you ever need it in-app
  return Math.random().toString(36).slice(2, 2 + len).toUpperCase();
}

export async function POST(_req: Request) {
  try {
    const sb = sbAdmin();

    // 1) School (DB fills short_code/slug via defaults + trigger you added)
    const { data: school, error: schErr } = await sb
      .from('schools')
      .insert({ name: 'Demo School' })
      .select('id, short_code, slug')
      .single();
    if (schErr || !school) {
      return NextResponse.json({ ok: false, error: schErr?.message ?? 'school insert failed' }, { status: 500 });
    }

    // 2) Candidate (ensure it has a name + email)
    const email = `demo+${Date.now()}@example.com`;
    const { data: cand, error: candErr } = await sb
      .from('candidates')
      .insert({ school_id: school.id, name: 'Demo Candidate', email })
      .select('id')
      .single();
    if (candErr || !cand) {
      return NextResponse.json({ ok: false, error: candErr?.message ?? 'candidate insert failed' }, { status: 500 });
    }

    // 3) Blueprint (minimal columns; config has {} default in DB)
    const { data: bp, error: bpErr } = await sb
      .from('blueprints')
      .upsert(
        { school_id: school.id, slug: 'demo-y7', name: 'Demo Y7' },
        { onConflict: 'school_id,slug' }
      )
      .select('id')
      .single();
    if (bpErr || !bp) {
      return NextResponse.json({ ok: false, error: bpErr?.message ?? 'blueprint upsert failed' }, { status: 500 });
    }

    // 4) Session (force 'pending' to be explicit; token for the link)
    const token = randomUUID();
    const { data: sess, error: sessErr } = await sb
      .from('sessions')
      .insert({
        school_id: school.id,
        candidate_id: cand.id,
        blueprint_id: bp.id,
        token,
        status: 'pending', // <- important: no 'created' anymore
      })
      .select('id, token')
      .single();

    if (sessErr || !sess) {
      return NextResponse.json({ ok: false, error: sessErr?.message ?? 'session insert failed' }, { status: 500 });
    }

    // 5) Return a simple helper link (adjust path if your app uses another route)
    const url = `${process.env.NEXT_PUBLIC_BASE_URL ?? ''}/test/${sess.token}`;
    return NextResponse.json({ ok: true, url, token: sess.token });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message ?? e) }, { status: 500 });
  }
}
