export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { getSupaSR } from '../../../../lib/supabase';
import { randomUUID } from 'crypto';

export async function POST(req: Request) {
  try {
    const supa = getSupaSR();
    const body = await req.json().catch(() => ({}));

    const school_name = (body.school_name ?? 'Demo School').trim();
    const school_code = (body.school_code ?? 'DEMO').trim();
    const candidate = {
      first_name: body.candidate?.first_name ?? 'Test',
      last_name: body.candidate?.last_name ?? 'Candidate',
      email: body.candidate?.email ?? 'test@example.com',
      grade_applied: body.candidate?.grade_applied ?? 'Y7'
    };

    let programme = (body.programme ?? '').trim();
    let grade = (body.grade ?? '').trim();

    // 1) Try requested pair; else pick any non-null pair; else fall back to GEN/GEN
    const hasReq = programme && grade
      ? await supa.from('items').select('programme,grade').eq('programme', programme).eq('grade', grade).limit(1)
      : { data: [] as any[] };

    if (!hasReq.data || hasReq.data.length === 0) {
      const anyPair = await supa
        .from('items')
        .select('programme,grade')
        .not('programme','is',null).not('grade','is',null)
        .neq('programme','').neq('grade','')
        .limit(1).single();

      if (anyPair.data) {
        programme = anyPair.data.programme;
        grade = anyPair.data.grade;
      } else {
        // final safe default so blueprint passes NOT NULL
        programme = 'GEN';
        grade = 'GEN';
      }
    }

    // 2) Upsert school
    const schoolUp = await supa
      .from('schools')
      .upsert({ name: school_name, short_code: school_code }, { onConflict: 'short_code' })
      .select('*').eq('short_code', school_code).single();
    if (schoolUp.error || !schoolUp.data) return NextResponse.json({ ok:false, error: schoolUp.error?.message || 'Failed to upsert school' }, { status:500 });
    const school = schoolUp.data;

    // 3) Candidate
    const candRes = await supa.from('candidates').insert({ school_id: school.id, ...candidate }).select('*').single();
    if (candRes.error || !candRes.data) return NextResponse.json({ ok:false, error: candRes.error?.message || 'Failed to create candidate' }, { status:500 });

    // 4) Blueprint (select or create for chosen programme/grade)
    let bp = await supa.from('blueprints').select('*')
      .eq('school_id', school.id).eq('programme', programme).eq('grade', grade).maybeSingle();

    if (!bp.data) {
      const ins = await supa.from('blueprints').insert({
        school_id: school.id,
        name: `${programme}-${grade}-default`,
        programme,
        grade,
        config: { counts: { English:2, Maths:2, Reasoning:2, Readiness:2 }, order: ['English','Maths','Reasoning','Readiness'], per_item_seconds: 90 },
        pass_logic: { overall_threshold: 0.6, weights: { English:0.25, Maths:0.35, Reasoning:0.3, Readiness:0.1 } }
      }).select('*').single();
      if (ins.error || !ins.data) return NextResponse.json({ ok:false, error: ins.error?.message || 'Failed to create blueprint' }, { status:500 });
      bp = ins;
    }

    // 5) Session
    const token = randomUUID().replace(/-/g,'');
    const sess = await supa.from('sessions').insert({
      school_id: school.id, candidate_id: candRes.data.id, blueprint_id: bp.data!.id, status:'created', token
    }).select('id,token').single();
    if (sess.error || !sess.data) return NextResponse.json({ ok:false, error: sess.error?.message || 'Failed to create session' }, { status:500 });

    return NextResponse.json({ ok:true, session_id: sess.data.id, token: sess.data.token, take_url: `/take/${sess.data.token}`, programme, grade });
  } catch (e:any) {
    return NextResponse.json({ ok:false, error: e.message || String(e) }, { status:500 });
  }
}
