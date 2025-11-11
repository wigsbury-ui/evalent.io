// app/api/results/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

type ItemRow = {
  id: string;
  domain: string | null;
  prompt: string | null;
  options: any[] | null;
};

type AttemptRow = {
  id: string;
  kind: 'mcq' | 'free' | null;
  is_correct: boolean | null;
  selected_index: number | null;
  answer_text: string | null;
  item: ItemRow | null;
};

function pct(correct: number, total: number) {
  return total > 0 ? (100 * correct) / total : 0;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token') ?? '';

    if (!token) {
      return NextResponse.json({ ok: false, error: 'missing token' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ ok: false, error: 'supabase not configured' }, { status: 500 });
    }
    const sb = createClient(supabaseUrl, serviceKey);

    // 1) Fetch session by token
    const { data: session, error: sErr } = await sb
      .from('sessions')
      .select('id, school_id, status, token')
      .eq('token', token)
      .maybeSingle();

    if (sErr) {
      return NextResponse.json({ ok: false, error: sErr.message }, { status: 500 });
    }
    if (!session) {
      // Still allow results by attempts.session_token if sessions row vanished
      // (We’ll continue — attempts fetch falls back to token.)
    }

    // 2) Attempts + item join
    // Prefer attempts.session_token = token; if column doesn’t exist in schema, fall back to session_id
    // We try session_token first, but if zero rows and we have a session.id, try session_id.
    let attempts: AttemptRow[] = [];

    // try by session_token
    {
      const { data, error } = await sb
        .from('attempts')
        .select(
          'id, kind, is_correct, selected_index, answer_text, item:item_id (id, domain, prompt, options)'
        )
        .eq('session_token', token)
        .order('id', { ascending: true })
        .returns<AttemptRow[]>();
      if (error && !/column .*session_token.* does not exist/i.test(error.message)) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      }
      if (data && data.length) attempts = data;
    }

    // fallback by session_id (if we have one and didn’t find any by token)
    if ((!attempts || attempts.length === 0) && session?.id) {
      const { data, error } = await sb
        .from('attempts')
        .select(
          'id, kind, is_correct, selected_index, answer_text, item:item_id (id, domain, prompt, options)'
        )
        .eq('session_id', session.id)
        .order('id', { ascending: true })
        .returns<AttemptRow[]>();
      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      }
      if (data) attempts = data;
    }

    // 3) Compute report
    const mcqOnly = attempts.filter(a => (a.kind ?? 'mcq') === 'mcq');
    const writtenOnly = attempts.filter(a => (a.kind ?? 'mcq') !== 'mcq');

    const mcqTotal = mcqOnly.length;
    const mcqCorrect = mcqOnly.reduce((acc, a) => acc + (a.is_correct ? 1 : 0), 0);

    // By domain
    const byDomain: Record<
      string,
      { total: number; correct: number }
    > = {};
    for (const a of mcqOnly) {
      const d = (a.item?.domain ?? 'General') || 'General';
      if (!byDomain[d]) byDomain[d] = { total: 0, correct: 0 };
      byDomain[d].total += 1;
      if (a.is_correct) byDomain[d].correct += 1;
    }
    const domains = Object.entries(byDomain).map(([domain, v]) => ({
      domain,
      total: v.total,
      correct: v.correct,
      percent: pct(v.correct, v.total),
    }));

    // Review blocks
    const reviewMcq = mcqOnly.map(a => ({
      prompt: a.item?.prompt ?? '',
      domain: a.item?.domain ?? null,
      yourIndex: a.selected_index,
      // We don’t store correct index on attempts; if you store it on items.options (with flag),
      // adapt this section. For now we can’t show correctIndex reliably without schema support.
      correctIndex: null as number | null,
    }));

    const reviewWritten = writtenOnly.map(a => ({
      prompt: a.item?.prompt ?? '',
      answer: a.answer_text ?? '',
    }));

    const report = {
      session: {
        id: session?.id ?? 'unknown',
        status: session?.status ?? 'complete',
      },
      mcq: {
        total: mcqTotal,
        correct: mcqCorrect,
        percent: pct(mcqCorrect, mcqTotal),
      },
      domains,
      review: {
        mcq: reviewMcq,
        written: reviewWritten,
      },
    };

    return NextResponse.json({ ok: true, report });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || 'unexpected error' },
      { status: 500 }
    );
  }
}
