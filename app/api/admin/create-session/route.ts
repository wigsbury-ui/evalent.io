export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { supaSR } from '@/lib/supabase';
import { randomUUID } from 'crypto';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      school_name = 'Demo School',
      school_code = 'DEMO',
      candidate = { first_name:'Test', last_name:'Candidate', email:'test@example.com', grade_applied:'Y7' },
      programme = 'UK',
      grade = 'Y7'
    } = body || {};

    // school
    let { data: school } = await supaSR.from('schools').select('*').eq('short_code', school_code).maybeSingle();
    if (!school) {
      const ins = await supaSR.from('schools').insert({ name: school_name, short_code: school_code }).select('*').single();
      school = ins.data;
    }

    // candidate
    const candIns = await supaSR.from('candidates').insert({
      school_id: school.id, ...candidate
    }).select('*').single();

    // blueprint (default)
    const config = {
      counts: { English: 2, Maths: 2, Reasoning: 2, Readiness: 2 },
      order: ['English','Maths','Reasoning','Readiness'],
      per_item_seconds: 90
    };
    const pass_logic = { overall_threshold: 0.6, weights: { English: 0.25, Maths: 0.35, Reasoning: 0.3, Readiness: 0.1 } };

    let { data: bp } = await supaSR
      .from('blueprints')
      .select('*')
      .eq('school_id', school.id)
      .eq('programme', programme).eq('grade', grade)
      .maybeSingle();

    if (!bp) {
      const ins = await supaSR.from('blueprints').insert({
        school_id: school.id, name: `${programme}-${grade}-default`,
        programme, grade, config, pass_logic
      }).select('*').single();
      bp = ins.data;
    }

    // session
    const token = randomUUID().replace(/-/g,'');
    const sess = await supaSR.from('sessions').insert({
      school_id: school.id,
      candidate_id: candIns.data.id,
      blueprint_id: bp.id,
      status: 'created',
      token
    }).select('id, token').single();

    return NextResponse.json({
      ok: true,
      session_id: sess.data.id,
      token: sess.data.token,
      take_url: `/take/${sess.data.token}`
    });
  } catch (e:any) {
    return NextResponse.json({ ok:false, error: e.message || String(e) }, { status: 500 });
  }
}
