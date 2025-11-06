export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { getSupaSR } from '../../../../lib/supabase';
import { randomUUID } from 'crypto';

export async function POST(req: Request) {
  try {
    const supa = getSupaSR();
    const body = await req.json().catch(() => ({}));

    let {
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

    // --------- ensure we target an existing (programme, grade) ----------
    const hasPair = await supa
      .from('items')
      .select('programme, grade')
      .eq('programme', programme)
      .eq('grade', grade)
      .limit(1);

    if (!hasPair.data || hasPair.data.length === 0) {
      // take the first available pair from items
      const anyPair = await supa.from('items').select('programme, grade').limit(1).single();
      if (!anyPair.data) {
        return NextResponse.json(
          { ok: false, error: 'No items in database. Run /api/sheet-sync first.' },
          { status: 400 }
        );
      }
      programme = anyPair.data.programme;
      grade = anyPair.data.grade;
    }

    // --------- school (UPSERT by short_code) ----------
    const schoolUp = await supa
      .from('schools')
      .upsert({ name: school_name, short_code: school_code }, { onConflict: 'short_code' })
      .select('*')
      .eq('short_code', school_code)
      .single();

    if (schoolUp.error || !schoolUp.data) {
      return NextResponse.json(
        { ok: false, error: schoolUp.error?.message || 'Failed to upsert school' },
        { status: 500 }
      );
    }
    const school = schoolUp.data;

    // --------- candidate ----------
    const candRes = await supa
      .from('candidates')
      .insert({ school_id: school.id, ...candidate })
      .select('*')
      .single();

    if (candRes.error || !candRes.data) {
      return NextResponse.json(
        { ok: false, error: candRes.error?.message || 'Failed to create candidate' },
        { status: 500 }
      );
    }
    const cand = candRes.data;

    // --------- blueprint (select or create; ties to school/programme/grade) ----------
    const defaultConfig = {
      counts: { English: 2, Maths: 2, Reasoning: 2, Readiness: 2 },
      order: ['English', 'Maths', 'Reasoning', 'Readiness'],
      per_item_seconds: 90
    };
    const defaultPassLogic = {
      overall_threshold: 0.6,
      weights: { English: 0.25, Maths: 0.35, Reasoning: 0.3, Readiness: 0.1 }
    };

    let bp = await supa
      .from('blueprints')
      .select('*')
      .eq('school_id', school.id)
      .eq('programme', programme)
      .eq('grade', grade)
      .maybeSingle();

    if (!bp.data) {
      const bpIns = await supa
        .from('blueprints')
        .insert({
          school_id: school.id,
          name: `${programme}-${grade}-default`,
          programme,
          grade,
          config: defaultConfig,
          pass_logic: defaultPassLogic
        })
        .select('*')
        .single();

      if (bpIns.error || !bpIns.data) {
        return NextResponse.json(
          { ok: false, error: bpIns.error?.message || 'Failed to create blueprint' },
          { status: 500 }
        );
      }
      bp = bpIns;
    }

    // --------- session ----------
    const token = randomUUID().replace(/-/g, '');
    const sessRes = await supa
      .from('sessions')
      .insert({
        school_id: school.id,
        candidate_id: cand.id,
        blueprint_id: bp.data!.id,
        status: 'created',
        token
      })
      .select('id, token')
      .single();

    if (sessRes.error || !sessRes.data) {
      return NextResponse.json(
        { ok: false, error: sessRes.error?.message || 'Failed to create session' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      session_id: sessRes.data.id,
      token: sessRes.data.token,
      take_url: `/take/${sessRes.data.token}`,
      programme,
      grade
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message || String(e) }, { status: 500 });
  }
}
