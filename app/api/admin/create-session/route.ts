// app/api/admin/create-session/route.ts
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { sbAdmin } from '@/lib/supabase'; // sbAdmin MUST be a function that returns a Supabase client

// Small util to form a base URL that also works on Vercel
function getOrigin(req: NextRequest) {
  const envUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '');
  if (envUrl) return envUrl.replace(/\/+$/, '');
  const host = req.headers.get('host') ?? 'localhost:3000';
  const proto = req.headers.get('x-forwarded-proto') ?? 'http';
  return `${proto}://${host}`;
}

export async function POST(req: NextRequest) {
  try {
    const sb = sbAdmin(); // ✅ NOTE the () — it's a function

    // 1) School (DB trigger fills short_code/slug if you followed the earlier steps)
    const { data: school, error: schErr } = await sb
      .from('schools')
      .insert({ name: 'Demo School' })
      .select('id, name, short_code, slug')
      .single();
    if (schErr) throw schErr;

    // 2) Candidate (we previously added/filled the NOT NULL "name" column)
    const { data: candidate, error: candErr } = await sb
      .from('candidates')
      .insert({ name: 'Demo Candidate' })
      .select('id, name')
      .single();
    if (candErr) throw candErr;

    // 3) Blueprint (grade/programme/pass_logic/config now safe due to DB defaults,
    //    but we still send explicit values to avoid any not-null issues)
    const { data: blueprint, error: bpErr } = await sb
      .from('blueprints')
      .insert({
        name: 'Demo UK Y7',
        programme: 'UK',
        grade: 7,
        pass_logic: {}, // jsonb
        config: {},     // jsonb
        school_id: school.id,
      })
      .select('id, name, grade, programme')
      .single();
    if (bpErr) throw bpErr;

    // 4) Session with token (status defaults to 'pending' from your DB patch)
    const token = crypto.randomBytes(16).toString('hex');
    const { data: session, error: sessErr } = await sb
      .from('sessions')
      .insert({
        token,
        school_id: school.id,
        candidate_id: candidate.id,
        blueprint_id: blueprint.id,
        // status left to default 'pending'
      })
      .select('id, token')
      .single();
    if (sessErr) throw sessErr;

    // 5) Return a URL the helper can show
    const origin = getOrigin(req);

    // If your take page path is different, change here (I provide a few flavors).
    const urlTestQuery = `${origin}/test?token=${session.token}`;
    const urlTakeQuery = `${origin}/take?token=${session.token}`;
    const urlTParam = `${origin}/t/${session.token}`;

    // Most helpers expect "url". I also return "links" for convenience.
    return NextResponse.json({
      ok: true,
      token: session.token,
      url: urlTestQuery,                      // <- helper will likely read this
      links: { test: urlTestQuery, take: urlTakeQuery, t: urlTParam },
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}
// after you compute `token`
const origin = req.headers.get('x-forwarded-proto')
  ? `${req.headers.get('x-forwarded-proto')}://${req.headers.get('x-forwarded-host')}`
  : process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

// choose the route you actually use:
const url = `${origin}/t/${token}`; // or `/take?token=${token}` or `/test?token=${token}`

return NextResponse.json({ ok: true, token, url });
