// app/api/next-item/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supaAdmin } from '@/app/lib/supa';
import { loadItems, loadAssets, toVimeoEmbedFromShare } from '@/app/lib/sheets';

/**
 * pick the next subject that still has remaining quota
 */
function pickSubject(
  countsBySubject: Record<string, number>,
  askedBySubject: Record<string, number>
): string | null {
  for (const [subject, quota] of Object.entries(countsBySubject)) {
    const done = askedBySubject[subject] ?? 0;
    if (done < quota) return subject;
  }
  return null;
}

export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get('token') ?? '';
    if (!token) return NextResponse.json({ ok: false, error: 'missing_token' }, { status: 400 });

    const db = supaAdmin();

    // 1) Load session (including plan)
    const { data: session, error: sErr } = await db
      .from('sessions')
      .select('id, item_index, status, plan')
      .eq('token', token)
      .single();

    if (sErr || !session) {
      return NextResponse.json({ ok: false, error: sErr?.message || 'session_not_found' }, { status: 400 });
    }

    const plan = session.plan || {};
    const programme = String(plan.programme || '').trim();
    const grade = String(plan.grade || '').trim();
    const countsBySubject: Record<string, number> = plan.countsBySubject || {};

    // If there is no plan (old sessions), stop early
    if (!programme || !grade || !Object.keys(countsBySubject).length) {
      return NextResponse.json({
        ok: true,
        done: true,
        index: session.item_index || 0,
        total: 0
      });
    }

    // 2) Load all items once (from Sheets)
    const allItems = await loadItems();
    // Filter by programme & grade and only subjects that have quotas in the plan
    const allowedSubjects = new Set(Object.keys(countsBySubject));
    const candidates = allItems.filter(
      it =>
        String(it.programme || '').toLowerCase() === programme.toLowerCase() &&
        String(it.grade || '') === grade &&
        allowedSubjects.has(String(it.subject || '').trim())
    );

    // 3) Find what was already asked in this session
    const { data: attempts, error: aErr } = await db
      .from('attempts')
      .select('item_id')
      .eq('session_id', session.id);

    if (aErr) {
      return NextResponse.json({ ok: false, error: aErr.message }, { status: 400 });
    }

    const askedIds = new Set((attempts || []).map(a => a.item_id));
    const askedBySubject: Record<string, number> = {};
    for (const a of attempts || []) {
      const itm = allItems.find(x => x.id === a.item_id);
      const subj = String(itm?.subject || '').trim();
      if (!subj) continue;
      askedBySubject[subj] = (askedBySubject[subj] || 0) + 1;
    }

    // 4) Decide which subject to serve next
    const nextSubj = pickSubject(countsBySubject, askedBySubject);
    if (!nextSubj) {
      // plan exhausted
      return NextResponse.json({
        ok: true,
        done: true,
        index: session.item_index || 0,
        total: Object.values(countsBySubject).reduce((a, b) => a + b, 0),
      });
    }

    // 5) Pick the next item for that subject that hasn't been asked
    const pool = candidates.filter(
      it => String(it.subject || '').trim() === nextSubj && !askedIds.has(it.id)
    );

    if (!pool.length) {
      // no unused item available for that subject => mark done if all subjects exhausted
      const another = pickSubject(
        countsBySubject,
        { ...askedBySubject, [nextSubj]: countsBySubject[nextSubj] }
      );
      if (!another) {
        return NextResponse.json({
          ok: true,
          done: true,
          index: session.item_index || 0,
          total: Object.values(countsBySubject).reduce((a, b) => a + b, 0),
        });
      }
    }

    const chosen = pool[Math.floor(Math.random() * pool.length)];

    // 6) Optional: attach video (from Assets)
    let video_embed: string | undefined;
    try {
      const assets = await loadAssets();
      const a = assets.find(x => String(x.item_id || '') === String(chosen.id || ''));
      const vimeo = toVimeoEmbedFromShare(a?.share_url || a?.video_url || '');
      if (vimeo) video_embed = vimeo;
    } catch {}

    // 7) Return the item
    const idx = (session.item_index ?? 0) + 1;
    return NextResponse.json({
      ok: true,
      done: false,
      index: idx,
      total: Object.values(countsBySubject).reduce((a, b) => a + b, 0),
      item: {
        id: chosen.id,
        subject: chosen.subject,
        domain: chosen.subject,   // UI shows this as the line under “1 of N • …”
        prompt: chosen.prompt || chosen.text || chosen.text_or_html || '',
        kind: chosen.kind || 'mcq', // we don’t change your headers; fallback is mcq
        options: chosen.options || chosen.option_list || chosen.options_joined?.split('\n') || [],
        correct_index: Number(chosen.correct_index ?? chosen.correct),
        video_embed,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'next_failed' }, { status: 500 });
  }
}
