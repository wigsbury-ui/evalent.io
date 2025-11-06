import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { sbAdmin } from '@/lib/supabase';

async function ensureRowId<T extends Record<string, any>>(
  promise: Promise<{ data: T | null; error: any }>
): Promise<string> {
  const { data, error } = await promise;
  if (error) throw error;
  const id = (data as any)?.id as string | undefined;
  if (!id) throw new Error('Row upsert/insert returned null id');
  return id;
}

export async function POST(_req: NextRequest) {
  try {
    const sb = sbAdmin();

    // 1) Pick a usable (programme, grade) from items
    const { data: pgRows, error: ePG } = await sb
      .from('items')
      .select('programme, grade')
      .neq('programme', '')
      .neq('grade', '')
      .not('programme', 'is', null)
      .not('grade', 'is', null)
      .limit(1);

    if (ePG) throw ePG;
    const programme = pgRows?.[0]?.programme || 'UK';
    const grade = pgRows?.[0]?.grade || 'Y7';

    // 2) Ensure demo school
    // Try upsert; if it doesn’t return a row, do a follow-up select.
    const schoolId = await (async () => {
      const { data, error } = await sb
        .from('schools')
        .upsert({ slug: 'demo', name: 'Demo School' }, { onConflict: 'slug' })
        .select('id')
        .maybeSingle();
      if (error) throw error;
      if (data?.id) return data.id;

      const { data: chk, error: e2 } = await sb
        .from('schools')
        .select('id')
        .eq('slug', 'demo')
        .maybeSingle();
      if (e2) throw e2;
      if (!chk?.id) throw new Error('Failed to create or find demo school');
      return chk.id;
    })();

    // 3) Ensure demo candidate (unique-ish email so we can insert freely)
    const email = `demo+${Date.now()}@example.com`;
    const candidateId = await ensureRowId(
      sb
        .from('candidates')
        .insert({ school_id: schoolId, name: 'Demo Candidate', email })
        .select('id')
        .single()
    );

    // 4) Ensure blueprint for the chosen programme/grade
    const bpSlug = `demo-${programme}-${grade}`.toLowerCase();
    const blueprintId = await (async () => {
      const { data, error } = await sb
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
      if (error) throw error;
      if (data?.id) return data.id;

      const { data: chk, error: e2 } = await sb
        .from('blueprints')
        .select('id')
        .eq('slug', bpSlug)
        .maybeSingle();
      if (e2) throw e2;
      if (!chk?.id) throw new Error('Failed to create or find demo blueprint');
      return chk.id;
    })();

    // 5) Create session
    const token = randomUUID().replace(/-/g, '');
    const sessionId = await ensureRowId(
      sb
        .from('sessions')
        .insert({
          school_id: schoolId,
          candidate_id: candidateId,
          blueprint_id: blueprintId,
          token,
          item_index: 0,
        })
        .select('id')
        .single()
    );

    return NextResponse.json({
      ok: true,
      session_id: sessionId,
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

export async function GET(req: NextRequest) {
  // convenience for clicking the button
  return POST(req);
}
