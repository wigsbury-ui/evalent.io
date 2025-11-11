// app/api/next-item/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supaAdmin } from '@/app/lib/supabase';
import { loadItems, loadAssets, toVimeoEmbedFromShare } from '@/app/lib/sheets';

// Decide which subject still has remaining quota
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
    if (!token) {
      return NextResponse.json({ ok: false, error: 'missing_token' }, { status: 400 });
    }

    const db = supaAdmin();

    // 1) Load session (must include plan saved at /start)
    const { data: session, error: sErr } = await db
      .from('sessions')
      .select('id, item_index, status, plan')
      .eq('token', token)
      .single();

    if (sErr || !session) {
      return NextResponse.json({ ok: false, error: sErr?.message || 'session_not_found' }, { status: 400 });
    }

    const plan = (session as any).plan || {};
    const programme: string = String(plan.programme ?? '').trim();
    const grade: string = String(plan.grade ?? '').trim();
    const countsBySubject: Record<string, number> = plan.countsBySubject || {};

    // If there is no plan (old sessions), signal done
    if (!programme || !grade || !Object.keys(countsBySubject).length) {
      return NextResponse.json({
        ok: true,
        done: true,
        index: session.item_index || 0,
        total: 0,
      });
    }

    // 2) Load all items once (from Sheets)
    const allItems = await loadItems();

    // Build subject quota set (normalize to lowercase)
    const allowedSubjects = new Set(
      Object.keys(countsBySubject).map((s) => String(s).trim().toLowerCase())
    );

    // Helpers to normalize values
    const norm = (v: unknown) => String(v ?? '').trim().toLowerCase();
    const gstr = (v: unknown) => String(v ?? '').trim(); // grade: compare as string

    // Filter by programme, grade, and allowed subjects
    const candidates = allItems.filter((row: any) =>
      norm(row?.programme) === norm(programme) &&
      gstr(row?.grade) === gstr(grade) &&
      allowedSubjects.has(norm(row?.subject))
    );

    // 3) Find what was already asked in this session
    const { data: attempts, error: aErr } = await db
      .from('attempts')
      .select('item_id')
      .eq('session_id', session.id);

    if (aErr) {
      return NextResponse.json({ ok: false, error: aErr.message }, { status: 400 });
    }

    const askedIds = new Set((attempts ?? []).map((a: any) => a.item_id));
    const askedBySubject: Record<string, number> = {};
    for (const a of attempts ?? []) {
      const itm = (allItems as any[]).find((x: any) => x.id === a.item_id);
      const subj = String(itm?.subject ?? '').trim();
      if (!subj) continue;
      askedBySubject[subj] = (askedBySubject[subj] ?? 0) + 1;
    }

    // 4) Decide which subject to serve next
    let nextSubj = pickSubject(countsBySubject, askedBySubject);
    if (!nextSubj) {
      // Plan exhausted
      return NextResponse.json({
        ok: true,
        done: true,
        index: session.item_index || 0,
        total: Object.values(countsBySubject).reduce((a, b) => a + b, 0),
      });
    }

    // 5) Pick the next unused item for that subject
    let pool = candidates.filter(
      (it: any) => norm(it?.subject) === norm(nextSubj) && !askedIds.has(it.id)
    );

    // If no unused item for that subject, try the next subject that still has quota
    if (!pool.length) {
      const pretendAsked = { ...askedBySubject, [nextSubj]: countsBySubject[nextSubj] };
      nextSubj = pickSubject(countsBySubject, pretendAsked);
      if (!nextSubj) {
        return NextResponse.json({
          ok: true,
          done: true,
          index: session.item_index || 0,
          total: Object.values(countsBySubject).reduce((a, b) => a + b, 0),
        });
      }
      pool = candidates.filter(
        (it: any) => norm(it?.subject) === norm(nextSubj) && !askedIds.has(it.id)
      );
      if (!pool.length) {
        // Nothing left anywhere → done
        return NextResponse.json({
          ok: true,
          done: true,
          index: session.item_index || 0,
          total: Object.values(countsBySubject).reduce((a, b) => a + b, 0),
        });
      }
    }

    const chosen = pool[Math.floor(Math.random() * pool.length)];

    // 6) Optional: attach video (from Assets; vimeo share → embed)
    let video_embed: string | undefined;
    try {
      const assets = await loadAssets();
      const a = assets.find((x: any) => String(x.item_id ?? '') === String(chosen.id ?? ''));
      const vimeo = toVimeoEmbedFromShare(a?.share_url || a?.video_url || '');
      if (vimeo) video_embed = vimeo;
    } catch {
      // ignore asset failures
    }

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
        domain: chosen.subject, // UI uses this line under "1 of N • …"
        prompt: chosen.prompt || chosen.text || chosen.text_or_html || '',
        kind: chosen.kind || 'mcq',
        options:
          chosen.options ||
          chosen.option_list ||
          (typeof chosen.options_joined === 'string'
            ? String(chosen.options_joined)
                .split('\n')
                .map((s: string) => s.trim())
                .filter(Boolean)
            : []),
        correct_index:
          typeof chosen.correct_index === 'number'
            ? chosen.correct_index
            : Number(chosen.correct ?? -1),
        video_embed,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'next_failed' }, { status: 500 });
  }
}
