// app/api/results/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

type ItemRow = {
  id: string;
  domain: string | null;
  prompt: string | null;
  options: any[] | null;     // array of strings or {text:string}
  correct_index: number | null;
};

type AttemptRow = {
  id: string;
  kind: 'mcq' | 'free' | null;
  is_correct: boolean | null;
  selected_index: number | null;
  answer_text: string | null;
  item: ItemRow | null;
};

function pct(c: number, t: number) { return t > 0 ? (100 * c) / t : 0; }
function optText(options: any[] | null | undefined, idx: number | null | undefined): string | null {
  if (!options || idx == null || idx < 0 || idx >= options.length) return null;
  const v = options[idx as number];
  return typeof v === 'string' ? v : (v?.text ?? String(v));
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token') ?? '';
    if (!token) return NextResponse.json({ ok: false, error: 'missing token' }, { status: 400 });

    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: session } = await sb
      .from('sessions').select('id, status').eq('token', token).maybeSingle();

    // Try session_token first, then session_id
    let attempts: AttemptRow[] = [];
    {
      const { data, error } = await sb
        .from('attempts')
        .select(
          'id, kind, is_correct, selected_index, answer_text, item:item_id (id, domain, prompt, options, correct_index)'
        )
        .eq('session_token', token)
        .order('id', { ascending: true })
        .returns<AttemptRow[]>();
      if (!error && data?.length) attempts = data;
    }
    if ((!attempts || attempts.length === 0) && session?.id) {
      const { data, error } = await sb
        .from('attempts')
        .select(
          'id, kind, is_correct, selected_index, answer_text, item:item_id (id, domain, prompt, options, correct_index)'
        )
        .eq('session_id', session.id)
        .order('id', { ascending: true })
        .returns<AttemptRow[]>();
      if (!error && data) attempts = data;
    }

    const mcqOnly = attempts.filter(a => (a.kind ?? 'mcq') === 'mcq');
    const writtenOnly = attempts.filter(a => (a.kind ?? 'mcq') !== 'mcq');

    const total = mcqOnly.length;
    const correct = mcqOnly.reduce((n, a) => n + (a.is_correct ? 1 : 0), 0);

    const byDomain: Record<string, { total: number; correct: number }> = {};
    for (const a of mcqOnly) {
      const d = (a.item?.domain ?? 'General') || 'General';
      if (!byDomain[d]) byDomain[d] = { total: 0, correct: 0 };
      byDomain[d].total += 1;
      if (a.is_correct) byDomain[d].correct += 1;
    }
    const domains = Object.entries(byDomain).map(([domain, v]) => ({
      domain, total: v.total, correct: v.correct, percent: pct(v.correct, v.total),
    }));

    const review = {
      mcq: mcqOnly.map(a => ({
        prompt: a.item?.prompt ?? '',
        domain: a.item?.domain ?? null,
        yourIndex: a.selected_index,
        yourText: optText(a.item?.options, a.selected_index),
        correctIndex: a.item?.correct_index ?? null,
        correctText: optText(a.item?.options, a.item?.correct_index ?? null),
      })),
      written: writtenOnly.map(a => ({
        prompt: a.item?.prompt ?? '',
        answer: a.answer_text ?? '',
      }))
    };

    const report = {
      session: { id: session?.id ?? 'unknown', status: session?.status ?? 'complete' },
      mcq: { total, correct, percent: pct(correct, total) },
      domains,
      review,
    };

    return NextResponse.json({ ok: true, report });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'unexpected error' }, { status: 500 });
  }
}
