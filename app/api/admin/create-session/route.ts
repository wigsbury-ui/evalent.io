import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { sbAdmin } from '@/lib/supabase';

export async function POST(_req: NextRequest) {
  try {
    const sb = sbAdmin();

    // 1) Pick a usable programme/grade from items
    const { data: pgRows, error: ePG } = await sb
      .from('items')
      .select('programme, grade')
      .not('programme', 'is', null)
      .not('grade', 'is', null)
      .neq('programme', '')
      .neq('grade', '')
      .limit(1);
    if (ePG) throw ePG;

    const programme = pgRows?.[0]?.programme ?? 'UK';
    const grade = pgRows?.[0]?.grade ?? 'Y7';

    // 2) Ensure demo school
    const upSchool = await sb
      .from('schools')
      .upsert({ slug: 'demo', name: 'Demo School' }, { onConflict: 'slug' })
      .select('id')
      .maybeSingle();
    if (upSchool.error) throw upSchool.error;

    let schoolId = upSchool.data?.id as string | undefined;
    if (!schoolId) {
      const chk = await sb
        .from('schools')
        .select('id')
        .eq('slug', 'demo')
        .maybeSingle();
      if (chk.error) throw chk.error;
      schoolId = chk.data?.id as string | undefined;
    }
    if (!schoolId) throw new Error('Failed to create or find demo school');

    // 3) Ensure demo candidate (unique email so insert each time)
    const email = `demo+${Date.now()}@example.com`;
    const insCand = await sb
      .from('candidates')
      .insert({ school_id: schoolId, name: 'Demo Candidate', email })
      .select('id')
      .single(); // << IMPORTANT
    if (insCand.error) throw insCand.error;
    const candidateId = insCand.data.id as string;

    // 4) Ensure blueprint
    const bpSlug = `demo-${programme}-${grade}`.toLowerCase();
    const upBp = await sb
      .from('blueprints')
      .upsert(
        {
          school_id: schoolId,
          slug: bpSlug,
          title: `Demo ${programme} ${grade}`,
          programme,
          grade,
        },
        { onConflict: 'slug' }
      )
      .select('id')
      .maybeSingle();
    if (upBp.error) throw upBp.error;

    let blueprintId = upBp.data?.id as string | undefined;
    if (!blueprintId) {
      const chk = await sb
        .from('blueprints')
        .select('id')
        .eq('slug', bpSlug)
        .maybeSingle();
      if (chk.error) throw chk.error;
      blueprintId = chk.data?.id as string | undefined;
    }
    if (!blueprintId) throw new Error('Failed to create or find demo blueprint');

    // 5) Create session
    const token = randomUUID().replace(/-/g, '');
    const insSess = await sb
      .from('sessions')
      .insert({
        school_id: schoolId,
        candidate_id: candidateId,
        blueprint_id: blueprintId,
        token,
        item_index: 0,
      })
      .select('id')
      .single(); // << IMPORTANT
    if (insSess.error) throw insSess.error;

    return NextResponse.json({
      ok: true,
      session_id: insSess.data.id,
      token,
      take_url: `/take/${token}`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: String(err?.message || err) },
      { status: 500 }
    );
  }
}

// Allow GET to convenience-trigger the same logic
export async function GET(req: NextRequest) {
  return POST(req);
}
