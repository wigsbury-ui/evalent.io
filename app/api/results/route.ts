// app/api/results/route.ts
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { supaAdmin } from '@/lib/supa';

type ItemRow = {
  id: string;
  domain?: string | null;
  prompt?: string | null;
  options?: any[] | null;
};

type AttemptRow = {
  id: string;
  is_correct: boolean | null;
  selected_index: number | null;
  item?: ItemRow | null;
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');
    if (!token) {
      return NextResponse.json({ ok: false, error: 'missing token' }, { status: 400 });
    }

    const supa = supaAdmin();

    // 1) Session lookup
    const { data: session, error: sErr } = await supa
      .from('sessions')
      .select('id, school_id')
      .eq('token', token)
      .single();

    if (sErr) return NextResponse.json({ ok: false, error: sErr.message }, { status: 400 });
    if (!session) return NextResponse.json({ ok: false, error: 'session not found' }, { status: 404 });

    // 2) Attempts + joined item (item may come back as an array — normalize it)
    const { data, error: aErr } = await supa
      .from('attempts')
      .select('id, is_correct, selected_index, item:items(id, domain, prompt, options)')
      .eq('session_id', session.id)
      .order('id', { ascending: true });

    if (aErr) return NextResponse.json({ ok: false, error: aErr.message }, { status: 400 });

    const raw = (data ?? []) as any[];

    const attempts: AttemptRow[] = raw.map((r) => {
      // Supabase can return relation aliases as object OR single-element array depending on path
      const joined = Array.isArray(r.item) ? (r.item[0] ?? null) : r.item ?? null;
      const item: ItemRow | null = joined
        ? {
            id: String(joined.id),
            domain: joined.domain ?? null,
            prompt: joined.prompt ?? null,
            options: joined.options ?? null,
          }
        : null;

      return {
        id: String(r.id),
        is_correct: r.is_correct ?? null,
        selected_index: r.selected_index ?? null,
        item,
      };
    });

    // 3) Score by domain
    const byDomain: Record<string, { total: number; correct: number }> = {};
    for (const a of attempts) {
      const d = a.item?.domain ?? 'General';
      byDomain[d] = byDomain[d] || { total: 0, correct: 0 };
      byDomain[d].total += 1;
      if (a.is_correct) byDomain[d].correct += 1;
    }

    // 4) Add computed kind (mcq if options exist)
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
