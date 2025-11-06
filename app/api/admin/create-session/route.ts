export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { getSupaSR } from '../../../../lib/supabase';
import { randomUUID } from 'crypto';

type CreateBody = {
  school_name?: string;
  school_code?: string;
  candidate?: {
    first_name?: string;
    last_name?: string;
    email?: string;
    grade_applied?: string;
  };
  programme?: string;
  grade?: string;
};

export async function POST(req: Request) {
  try {
    const supa = getSupaSR();
    const body = (await req.json().catch(() => ({}))) as CreateBody;

    const school_name = (body.school_name ?? 'Demo School').trim();
    const school_code = (body.school_code ?? 'DEMO').trim();
    const candidate = {
      first_name: body.candidate?.first_name ?? 'Test',
      last_name: body.candidate?.last_name ?? 'Candidate',
      email: body.candidate?.email ?? 'test@example.com',
      grade_applied: body.candidate?.grade_applied ?? 'Y7'
    };

    // ---- Try to honor requested programme/grade, else pick a NON-NULL pair from items
    let programme = (body.programme ?? '').trim();
    let grade = (body.grade ?? '').trim();

    // If requested pair is missing, query a valid pair from items
    async function pickValidPair() {
      const q = await supa
        .from('items')
        .select('programme, grade')
        .not('programme', 'is', null)
        .not('grade', 'is', null)
        .neq('programme', '')
        .neq('grade', '')
        .limit(1)
        .single();
      return q.data as { programme: string; grade: string } | null;
    }

    if (programme && grade) {
      const chk = await supa
        .from('items')
        .select('programme, grade')
        .eq('programme', programme)
        .eq('grade', grade)
        .limit(1);
      if (!chk.data || chk.data.length === 0) {
        const any = await pickValidPair();
        if (!any) {
          return NextResponse.json(
            { ok: false, error: 'No usable (programme, grade) found in items. Run /api/sheet-sync and ensure columns "programme" and "grade" are populated.' },
            { status: 400 }
          );
        }
        programme = any.programme;
        grade = any.grade;
      }
    } else {
      const any = await pickValidPair();
      if (!any) {
        return NextResponse.json(
          { ok: false, error: 'No usable (programme, grade) found in items. Run /api/sheet-sync and ensure columns "programme" and "grade" are populated.' },
          { status: 400 }
        );
      }
      programme = any.programme;
      grade = any.grade;
    }

    // ---- Upsert school by short_code
    const schoolUp = await supa
      .from('schools')
      .upsert({ name: school_name, short_code: school_code }, { onConflict: 'short_code' })
      .select('*')
      .eq('short_code', school_code)
      .single();
    if (schoolUp.error || !schoolUp.data) {
      return NextResponse.json({ ok: false, error: schoolUp.error?.message || 'Failed to upsert school' }, { status: 500 });
    }
    const school = schoolUp.data;

    // ---- Create candidate
    const candRes = await supa
      .from('candidates')
      .insert({ school_id: school.id, ...candidate })
      .select('*')
      .single();
    if (candRes.error || !candRes.data) {
      return NextResponse.json({ ok: false, error: candRes.error?.message || 'Failed to create candidate' }, { status: 500 });
    }
    const cand = candRes.data;

    // ---- Blueprint (select or create)
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
        return NextResponse.json({ ok: false, error: bpIns.error?.message || 'Failed to create blueprint' }, { status: 500 });
      }
      bp = bpIns;
    }

    // ---- Session
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
      return NextResponse.json({ ok: false, error: sessRes.error?.message || 'Failed to create session' }, { status: 500 });
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
