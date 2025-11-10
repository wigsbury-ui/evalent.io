// app/api/results/route.ts
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { supaAdmin } from '@/lib/supa';

type AttemptRow = {
  is_correct: boolean | null;
  // Supabase may return a single object OR an array for the joined table depending on FK metadata.
  item?: { id: string; domain: string | null; prompt: string | null } | Array<{ id: string; domain: string | null; prompt: string | null }>;
};

type WrittenRow = {
  answer_text: string | null;
  item?: { id: string; domain: string | null; prompt: string | null } | Array<{ id: string; domain: string | null; prompt: string | null }>;
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');
    if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 });

    const { data: session, error: sErr } = await supaAdmin
      .from('sessions')
      .select('id, status')
      .eq('token', token)
      .single();
    if (sErr || !session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

    // MCQ attempts with item join
    const { data: attemptsRaw, error: aErr } = await supaAdmin
      .from('attempts')
      .select('is_correct, item:items(id, domain, prompt)')
      .eq('session_id', session.id);

    if (aErr) return NextResponse.json({ error: aErr.message }, { status: 400 });

    const attempts = (attemptsRaw ?? []) as AttemptRow[];

    // Written answers with item join
    const { data: writtenRaw, error: wErr } = await supaAdmin
      .from('written_answers')
      .select('answer_text, item:items(id, domain, prompt)')
      .eq('session_id', session.id);

    if (wErr) return NextResponse.json({ error: wErr.message }, { status: 400 });

    const written = (writtenRaw ?? []) as WrittenRow[];

    const total = attempts.length;
    const correct = attempts.filter(a => a.is_correct === true).length;

    // domain tally
    const byDomain: Record<string, { total: number; correct: number }> = {};
    for (const a of attempts) {
      const joined = Array.isArray(a.item) ? a.item[0] : a.item;
      const d = joined?.domain ?? 'General';
      byDomain[d] = byDomain[d] || { total: 0, correct: 0 };
      byDomain[d].total += 1;
      if (a.is_correct) byDomain[d].correct += 1;
    }

    return NextResponse.json({
      ok: true,
      status: session.status,
      summary: { total, correct, percent: total ? Math.round((correct / total) * 100) : 0 },
      byDomain,
      attempts: attempts.map(a => {
        const joined = Array.isArray(a.item) ? a.item[0] : a.item;
        return {
          domain: joined?.domain ?? null,
          prompt: joined?.prompt ?? null,
          is_correct: a.is_correct,
        };
      }),
      written: written.map(w => {
        const joined = Array.isArray(w.item) ? w.item[0] : w.item;
        return {
          domain: joined?.domain ?? null,
          prompt: joined?.prompt ?? null,
          answer_text: w.answer_text ?? '',
        };
      }),
    });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}
