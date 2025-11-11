// app/api/results/route.ts
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { supaAdmin } from '@/lib/supa';

type ItemRow = {
  id: string;
  domain?: string | null;
  prompt?: string | null;
  options?: any[] | null; // MCQ options if present
};

type AttemptRow = {
  id: string;
  is_correct: boolean | null;
  selected_index: number | null;
  item?: ItemRow | null; // joined via item:items(...)
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');
    if (!token) {
      return NextResponse.json({ ok: false, error: 'missing token' }, { status: 400 });
    }

    const supa = supaAdmin();

    // session
    const { data: session, error: sErr } = await supa
      .from('sessions')
      .select('id, school_id')
      .eq('token', token)
      .single();

    if (sErr) return NextResponse.json({ ok: false, error: sErr.message }, { status: 400 });
    if (!session) return NextResponse.json({ ok: false, error: 'session not found' }, { status: 404 });

    // attempts + joined item (note: no "kind" column is assumed)
    const { data, error: aErr } = await supa
      .from('attempts')
      .select('id, is_correct, selected_index, item:items(id, domain, prompt, options)')
      .eq('session_id', session.id)
      .order('id', { ascending: true });

    if (aErr) return NextResponse.json({ ok: false, error: aErr.message }, { status: 400 });

    const attempts: AttemptRow[] = (data ?? []) as AttemptRow[];

    // Score by domain
    const byDomain: Record<string, { total: number; correct: number }> = {};
    for (const a of attempts) {
      const d = a.item?.domain ?? 'General';
      byDomain[d] = byDomain[d] || { total: 0, correct: 0 };
      byDomain[d].total += 1;
      if (a.is_correct) byDomain[d].correct += 1;
    }

    // Add computed_kind for convenience (MCQ if options present)
    const normalized = attempts.map((a) => {
      const kind =
        Array.isArray(a.item?.options) && (a.item?.options?.length ?? 0) > 0
          ? 'mcq'
          : 'written';
      return { ...a, computed_kind: kind };
    });

    return NextResponse.json({
      ok: true,
      summary: {
        total: attempts.length,
        byDomain,
      },
      attempts: normalized,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: String(e?.message || e) },
      { status: 500 }
    );
  }
}
