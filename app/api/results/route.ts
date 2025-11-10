export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { supaAdmin } from '@/lib/supa';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token') ?? '';
    if (!token) return NextResponse.json({ ok: false, error: 'missing_token' }, { status: 400 });

    const supa = supaAdmin();

    const { data: session, error: sErr } = await supa
      .from('sessions')
      .select('id, status')
      .eq('token', token)
      .single();
    if (sErr) return NextResponse.json({ ok: false, error: sErr.message }, { status: 500 });
    if (!session) return NextResponse.json({ ok: false, error: 'session_not_found' }, { status: 404 });

    // join attempts → items for domain and prompt
    const { data: attempts, error: aErr } = await supa
      .from('attempts')
      .select('is_correct, item:items(domain, prompt)')
      .eq('session_id', session.id);
    if (aErr) return NextResponse.json({ ok: false, error: aErr.message }, { status: 500 });

    // written answers
    const { data: written, error: wErr } = await supa
      .from('written_answers')
      .select('answer_text, item:items(prompt, domain)')
      .eq('session_id', session.id);
    if (wErr) return NextResponse.json({ ok: false, error: wErr.message }, { status: 500 });

    // summarize
    const byDomain: Record<string, { total: number; correct: number }> = {};
    for (const a of attempts ?? []) {
      const d = (a as any).item?.domain ?? 'General';
      byDomain[d] = byDomain[d] || { total: 0, correct: 0 };
      byDomain[d].total += 1;
      if (a.is_correct) byDomain[d].correct += 1;
    }

    return NextResponse.json({
      ok: true,
      status: session.status,
      summary: {
        total: attempts?.length ?? 0,
        correct: (attempts ?? []).filter((x) => x.is_correct).length,
        byDomain,
      },
      attempts,
      written,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
