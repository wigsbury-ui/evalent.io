export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { supaAdmin } from '@/lib/supa';

type Attempt = { item_id: string; selected_index: number|null; is_correct: boolean|null };
type Item = { id: string; domain: string|null; type: 'mcq'|'written'|string; prompt: string; correct_index: number|null };

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 });

  const supa = supaAdmin();

  // session
  const { data: session, error: sErr } = await supa
    .from('sessions')
    .select('id, school_id, status')
    .eq('token', token)
    .single();
  if (sErr || !session) return NextResponse.json({ error: 'Invalid token' }, { status: 404 });

  // attempts + written answers
  const [{ data: attempts = [] }, { data: written = [] }] = await Promise.all([
    supa.from('attempts').select('item_id, selected_index, is_correct').eq('session_id', session.id),
    supa.from('written_answers').select('item_id, answer_text').eq('session_id', session.id),
  ]);

  // fetch the items referenced by attempts + written
  const itemIds = Array.from(new Set([...attempts.map(a => a.item_id), ...written.map((w:any)=>w.item_id)]));
  let items: Item[] = [];
  if (itemIds.length) {
    const { data } = await supa
      .from('items')
      .select('id, domain, type, prompt, correct_index')
      .in('id', itemIds);
    items = (data || []) as Item[];
  }

  // join helpers
  const itemById = new Map(items.map(i => [i.id, i]));

  // MCQ summary
  const mcqRows = attempts
    .map(a => ({ attempt: a as Attempt, item: itemById.get(a.item_id) as Item|undefined }))
    .filter(r => r.item && r.item.type === 'mcq');

  const mcqTotal = mcqRows.length;
  const mcqCorrect = mcqRows.reduce((n, r) => n + (r.attempt.is_correct ? 1 : 0), 0);

  // domain breakdown from MCQs
  const domainMap = new Map<string, { domain: string; total: number; correct: number }>();
  mcqRows.forEach(({ attempt, item }) => {
    const d = (item!.domain || 'General') as string;
    if (!domainMap.has(d)) domainMap.set(d, { domain: d, total: 0, correct: 0 });
    const e = domainMap.get(d)!;
    e.total += 1;
    e.correct += attempt.is_correct ? 1 : 0;
  });
  const domainBreakdown = Array.from(domainMap.values()).map(d => ({
    ...d, percent: d.total ? Math.round((d.correct / d.total) * 100) : 0
  }));

  // per-item review (MCQ)
  const mcqReview = mcqRows.map(({ attempt, item }) => ({
    prompt: item!.prompt,
    domain: item!.domain,
    yourIndex: attempt.selected_index,
    correctIndex: item!.correct_index,
    correct: !!attempt.is_correct
  }));

  // written responses with prompts
  const writtenReview = written.map((w:any) => {
    const it = itemById.get(w.item_id);
    return { prompt: it?.prompt || '(written)', answer: w.answer_text ?? '' };
  });

  return NextResponse.json({
    session: { id: session.id, status: session.status },
    mcq: { total: mcqTotal, correct: mcqCorrect, percent: mcqTotal ? Math.round(100*mcqCorrect/mcqTotal) : 0 },
    domains: domainBreakdown,
    review: { mcq: mcqReview, written: writtenReview },
  });
}
