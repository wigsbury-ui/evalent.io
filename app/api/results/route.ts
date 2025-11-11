// app/api/results/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supaAdmin } from '@/app/lib/supa';

type ItemLite = {
  id: string;
  domain: string;
  prompt: string;
  options?: string[] | null;
  correct_index?: number | null;
} | null;

type AttemptRow = {
  id: any;
  kind: 'mcq' | 'free';
  is_correct: boolean | null;
  selected_index: number | null;
  answer_text: string | null;
  item: ItemLite;
};

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token') ?? '';
  if (!token) return NextResponse.json({ ok: false, error: 'missing_token' }, { status: 400 });

  const db = supaAdmin();
  const { data: session, error: sErr } = await db
    .from('sessions')
    .select('id, status')
    .eq('token', token)
    .single();
  if (sErr || !session) return NextResponse.json({ ok: false, error: 'session_not_found' }, { status: 404 });

  // Note: depending on FK config, PostgREST may return `item` as an array.
  const { data, error } = await db
    .from('attempts')
    .select('id, kind, is_correct, selected_index, answer_text, item:items(id, domain, prompt, options, correct_index)')
    .eq('session_id', session.id)
    .order('id', { ascending: true });

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  // Normalize item field (array or object) and coerce option types
  const attempts: AttemptRow[] = (data ?? []).map((r: any) => {
    let item: any = r.item ?? null;
    if (Array.isArray(item)) item = item[0] ?? null;

    // options sometimes come back as string (json/text) — normalize to string[]
    let options: string[] | null | undefined = item?.options ?? null;
    if (options && !Array.isArray(options)) {
      // try JSON parse; fallback to pipe/newline split
      try {
        const parsed = JSON.parse(options);
        if (Array.isArray(parsed)) options = parsed.map((x) => String(x));
        else options = String(options).split(/\r?\n|\|/).map((s) => s.trim()).filter(Boolean);
      } catch {
        options = String(options).split(/\r?\n|\|/).map((s) => s.trim()).filter(Boolean);
      }
    }

    const it: ItemLite = item
      ? {
          id: String(item.id),
          domain: String(item.domain ?? 'General'),
          prompt: String(item.prompt ?? ''),
          options: options ?? null,
          correct_index:
            item.correct_index === null || item.correct_index === undefined
              ? null
              : Number(item.correct_index),
        }
      : null;

    return {
      id: r.id,
      kind: r.kind as 'mcq' | 'free',
      is_correct: r.is_correct ?? null,
      selected_index: r.selected_index === null || r.selected_index === undefined ? null : Number(r.selected_index),
      answer_text: r.answer_text ?? null,
      item: it,
    };
  });

  // aggregate
  let totalMcq = 0,
    correctMcq = 0;
  const byDomain: Record<string, { total: number; correct: number }> = {};

  attempts.forEach((a) => {
    const domain = a.item?.domain ?? 'General';
    if (a.kind === 'mcq') {
      totalMcq += 1;
      if (a.is_correct) correctMcq += 1;
      byDomain[domain] = byDomain[domain] || { total: 0, correct: 0 };
      byDomain[domain].total += 1;
      if (a.is_correct) byDomain[domain].correct += 1;
    } else {
      byDomain[domain] = byDomain[domain] || { total: 0, correct: 0 };
    }
  });

  const review = {
    mcq: attempts
      .filter((a) => a.kind === 'mcq' && a.item)
      .map((a) => ({
        prompt: a.item!.prompt,
        domain: a.item!.domain,
        yourIndex: a.selected_index ?? null,
        correctIndex: a.item!.correct_index ?? null,
      })),
    written: attempts
      .filter((a) => a.kind === 'free' && a.item)
      .map((a) => ({
        prompt: a.item!.prompt,
        answer: a.answer_text ?? '',
      })),
  };

  const report = {
    session: { id: session.id, status: session.status || 'done' },
    mcq: {
      total: totalMcq,
      correct: correctMcq,
      percent: totalMcq ? Math.round((correctMcq / totalMcq) * 100) : 0,
    },
    domains: Object.entries(byDomain).map(([domain, v]) => ({
      domain,
      total: v.total,
      correct: v.correct,
      percent: v.total ? Math.round((v.correct / v.total) * 100) : 0,
    })),
    review,
  };

  return NextResponse.json({ ok: true, report });
}
