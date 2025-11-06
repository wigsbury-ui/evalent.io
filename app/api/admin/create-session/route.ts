export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { getSupaSR } from '../../../../lib/supabase';
import { randomUUID } from 'crypto';

export async function POST(req: Request) {
  try {
    const supa = getSupaSR();
    const body = await req.json().catch(() => ({}));
    const {
      school_name = 'Demo School',
      school_code = 'DEMO',
      candidate = {
        first_name: 'Test',
        last_name: 'Candidate',
        email: 'test@example.com',
        grade_applied: 'Y7'
      },
      programme = 'UK',
      grade = 'Y7'
    } = body || {};

    // ensure school
    let { data: school, error: schoolSelErr } = await supa
      .from('schools').select('*').eq('short_code', school_code).maybeSingle();
    if (schoolSelErr) return NextResponse.json({ ok:false, error: schoolSelErr.message }, { status:500 });
    if (!school) {
      const { data: schoolIns, error: schoolInsErr } = await supa
        .from('schools').insert({ name: school_name, short_code: school_code }).select('*').single();
      if (schoolInsErr || !schoolIns)
        return NextResponse.json({ ok:false, error: schoolInsErr?.message || 'Failed to create school' }, { status:500 });
      school = schoolIns;
    }

    // candidate
    const { data: cand, error: candErr } = await supa
      .from('candidates').insert({ school_id: school.id, ...candidate }).select('*').single();
    if (candErr || !cand)
      return NextResponse.json({ ok:false, error: candErr?.message || 'Failed to create candidate' }, { status:500 });

    // blueprint
    const defaultConfig = {
      counts: { English: 2, Maths: 2, Reasoning: 2, Readiness: 2 },
      order: ['English', 'Maths', 'Reasoning', 'Readiness'],
      per_item_seconds: 90
    };
    const defaultPassLogic = {
      overall_threshold: 0.6,
      weights: { English: 0.25, Maths: 0.35, Reasoning: 0.3, Readiness: 0.1 }
    };

    let { data: bp, error: bpSelErr } = await supa
      .from('blueprints').select('*')
      .eq('school_id', school.id).eq('programme', programme).eq('grade', grade)
      .maybeSingle();
    if (bpSelErr) return NextResponse.json({ ok:false, error: bpSelErr.message }, { status:500 });

    if (!bp) {
      const { data: bpIns, error: bpInsErr } = await supa
        .from('blueprints').insert({
          school_id: school.id,
          name: `${programme}-${grade}-default`,
          programme, grade,
          config: defaultConfig,
          pass_logic: defaultPassLogic
        }).select('*').single();
      if (bpInsErr || !bpIns)
        return NextResponse.json({ ok:false, error: bpInsErr?.message || 'Failed to create blueprint' }, { status:500 });
      bp = bpIns;
    }

    // session
    const token = randomUUID().replace(/-/g, '');
    const { data: sess, error: sessErr } = await supa
      .from('sessions').insert({
        school_id: school.id,
        candidate_id: cand.id,
        blueprint_id: bp.id,
        status: 'created',
        token
      }).select('id, token').single();
    if (sessErr || !sess)
      return NextResponse.json({ ok:false, error: sessErr?.message || 'Failed to create session' }, { status:500 });

    return NextResponse.json({ ok:true, session_id: sess.id, token: sess.token, take_url: `/take/${sess.token}` });
  } catch (e:any) {
    return NextResponse.json({ ok:false, error: e.message || String(e) }, { status:500 });
  }
}
