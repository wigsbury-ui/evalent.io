import { NextRequest, NextResponse } from 'next/server';
import { supaAdmin } from '@/app/lib/supabase';
import { loadItems, loadBlueprints, loadAssets, toVimeoEmbedFromShare } from '@/app/lib/sheets';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token') ?? '';
  if (!token) return NextResponse.json({ ok: false, error: 'missing token' }, { status: 400 });

// AFTER
const db = supaAdmin();  // <— instantiate the client

const { data: session, error: sErr } = await db
  .from('sessions')
  .select('id, item_index, status, plan, meta')
  .eq('token', token)
  .single();


  if (sErr || !session) return NextResponse.json({ ok: false, error: 'session not found' }, { status: 404 });

  let index = Number(session.item_index ?? 0);
  let plan: string[] = Array.isArray(session.plan) ? session.plan : [];

  // Build plan once per session
  if (!plan.length) {
    const programme = String(session.meta?.programme ?? 'UK');
    const grade = String(session.meta?.grade ?? '7');

    const [items, blue] = await Promise.all([loadItems(), loadBlueprints()]);

    // filter blueprint rows for this programme + grade
    const needs = blue.filter(b => b.programme === programme && b.grade === grade);

    const bag: string[] = [];
    const byKey = (s: string, d: string, t?: string) =>
      items.filter(i =>
        i.programme === programme &&
        i.grade_number === grade &&
        i.subject === s &&
        i.difficulty === d &&
        (t ? i.type === t : true) &&
        i.active
      );

    // for each subject/difficulty, sample that many items (prefer MCQ; include Open if pool is small)
    const take = (arr: string[], count: number) => {
      // shuffle
      for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
      return arr.slice(0, count);
    };

    for (const n of needs) {
      const wants: Array<{ diff: 'easy'|'core'|'hard'; count: number }> = [
        { diff: 'easy', count: n.easy_count },
        { diff: 'core', count: n.core_count },
        { diff: 'hard', count: n.hard_count },
      ];
      for (const w of wants) {
        if (!w.count) continue;
        const primary = byKey(n.subject, w.diff, 'MCQ').map(i => i.item_id);
        let picked = take(primary, w.count);

        if (picked.length < w.count) {
          const remain = w.count - picked.length;
          const fallback = byKey(n.subject, w.diff, 'Open')
            .filter(i => !picked.includes(i.item_id))
            .map(i => i.item_id);
          picked = picked.concat(take(fallback, remain));
        }
        bag.push(...picked);
      }
    }

    plan = bag;
    await supaAdmin.from('sessions').update({ plan }).eq('id', session.id);
    index = 0;
  }

  if (index >= plan.length) {
    return NextResponse.json({ ok: true, done: true, index, total: plan.length });
  }

  // resolve current item by id
  const [items, assets] = await Promise.all([loadItems(), loadAssets()]);
  const item = items.find(i => i.item_id === plan[index]);
  if (!item) {
    // skip broken entry
    await supaAdmin.from('sessions').update({ item_index: index + 1 }).eq('id', session.id);
    return NextResponse.json({ ok: false, error: 'missing item' }, { status: 500 });
  }

  const asset = item.video_id ? assets.get(item.video_id) : undefined;
  const video_embed = asset ? toVimeoEmbedFromShare(asset.share_url ?? null) : null;

  return NextResponse.json({
    ok: true,
    index,
    total: plan.length,
    item: {
      id: item.item_id,
      kind: item.type === 'Open' ? 'free' : 'mcq',
      domain: item.subject,      // keeps your subject label
      prompt: item.prompt,
      options: item.options,
      video_embed,               // ready-to-iframe Vimeo URL (or null)
    },
  });
}
