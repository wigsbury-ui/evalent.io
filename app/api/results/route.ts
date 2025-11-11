// app/api/results/route.ts
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { supaAdmin } from '@/lib/supa';

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

    // attempts with joined item (NO "kind" column)
    const { data: attempts, error: aErr } = await supa
      .from('attempts')
      .select('id, is_correct, selected_index, item:items(id, domain, prompt, options)')
      .eq('session_id', session.id)
      .order('id', { ascending: true });

    if (aErr) return NextResponse.json({ ok: false, error: aErr.message }, { status: 400 });

    // Score by domain
    const byDomain: Record<string, { total: number; correct: number }> = {};
    for (const a of attempts ?? []) {
      const d = a.item?.domain ?? 'General';
      byDomain[d] = byDomain[d] || { total: 0, correct: 0 };
      byDomain[d].total += 1;
      if (a.is_correct) byDomain[d].correct += 1;
    }

    // Compute MCQ/Written in code when needed (not essential for summary)
    const normalized = (attempts ?? []).map((a) => {
      const kind =
        Array.isArray(a.item?.options) && a.item?.options?.length ? 'mcq' : 'written';
      return { ...a, computed_kind: kind };
    });

    return NextResponse.json({
      ok: true,
      summary: {
        total: attempts?.length ?? 0,
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
