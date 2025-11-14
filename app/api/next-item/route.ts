import { NextRequest, NextResponse } from 'next/server';
import supabaseAdmin from '@/lib/supabaseAdmin';

const QUESTIONS_PER_SESSION = 8;

type SessionRow = {
  id: string;
  programme: string | null;
  year: string | null;
  grade: number | null;
  item_index: number | null;
  selected_ids: string[] | null;
};

function getSessionId(req: NextRequest): string | null {
  const url = new URL(req.url);

  const fromQuery =
    url.searchParams.get('sessionId') ??
    url.searchParams.get('session_id') ??
    url.searchParams.get('sid');

  return fromQuery || null;
}

function normaliseSelectedIds(raw: SessionRow['selected_ids']): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw
      .map(String)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  // Fallback if it ever gets stored as a comma-separated string
  return String(raw)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

// Tell Next.js not to cache this route
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const sessionId = getSessionId(req);

    if (!sessionId) {
      return NextResponse.json(
        { ok: false, error: 'Missing sessionId' },
        { status: 400 },
      );
    }

    // 1. Load the session
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (sessionError) {
      console.error('next-item sessionError', sessionError);
      return NextResponse.json(
        { ok: false, error: 'Failed to load session' },
        { status: 500 },
      );
    }

    if (!session) {
      return NextResponse.json(
        { ok: false, error: 'Session not found' },
        { status: 404 },
      );
    }

    const year =
      (session.year ||
        (session.grade ? `Y${session.grade}` : '') ||
        'Y7')
        .toString()
        .trim();

    // We *store* programme but deliberately don't filter on it yet.
    // This avoids any mismatch while you only have UK content.
    const programme =
      (session.programme || 'UK').toString().trim() || 'UK';

    const selectedIds = normaliseSelectedIds(
      (session as SessionRow).selected_ids,
    );

    // 2. Candidate items: by year only
    const { data: items, error: itemsError } = await supabaseAdmin
      .from('items')
      .select(
        'id, year, programme, domain, stem, type, options, correct',
      )
      .eq('year', year);

    if (itemsError) {
      console.error('next-item itemsError', itemsError);
      return NextResponse.json(
        { ok: false, error: 'Failed to load items' },
        { status: 500 },
      );
    }

    if (!items || items.length === 0) {
      // Genuine “no content for this year” case
      return NextResponse.json({
        ok: true,
        done: true,
        reason: 'no_items_for_session',
        sessionId,
        year,
        programme,
        itemsCount: 0,
      });
    }

    // 3. If we've already asked enough questions, we’re done
    if (selectedIds.length >= QUESTIONS_PER_SESSION) {
      await supabaseAdmin
        .from('sessions')
        .update({
          item_index: selectedIds.length,
          selected_ids: selectedIds,
        })
        .eq('id', sessionId);

      return NextResponse.json({
        ok: true,
        done: true,
        reason: 'question_limit_reached',
        sessionId,
        year,
        programme,
        totalAnswered: selectedIds.length,
        totalAvailable: items.length,
      });
    }

    // 4. Pick the next unused item (simple sequential strategy)
    const used = new Set(selectedIds);
    const remaining = items.filter((it) => !used.has(it.id));

    if (remaining.length === 0) {
      // All items for this year have been used – also “done”
      await supabaseAdmin
        .from('sessions')
        .update({
          item_index: selectedIds.length,
          selected_ids: selectedIds,
        })
        .eq('id', sessionId);

      return NextResponse.json({
        ok: true,
        done: true,
        reason: 'no_unused_items_remaining',
        sessionId,
        year,
        programme,
        totalAnswered: selectedIds.length,
        totalAvailable: items.length,
      });
    }

    const nextItem = remaining[0];
    const updatedSelected = [...selectedIds, nextItem.id];

    // 5. Update progress on the session
    await supabaseAdmin
      .from('sessions')
      .update({
        item_index: updatedSelected.length,
        selected_ids: updatedSelected,
      })
      .eq('id', sessionId);

    // 6. Optional asset lookup for this item
    const { data: assetRows, error: assetError } = await supabaseAdmin
      .from('assets')
      .select('*')
      .eq('item_id', nextItem.id)
      .limit(1);

    if (assetError) {
      // Non-fatal – just log it
      console.warn('next-item assetError (non-fatal)', assetError);
    }

    const asset =
      assetRows && assetRows.length > 0 ? assetRows[0] : null;

    // 7. Return the next item
    return NextResponse.json({
      ok: true,
      done: false,
      sessionId,
      year,
      programme,
      itemIndex: updatedSelected.length - 1,
      totalAnswered: updatedSelected.length,
      totalAvailable: items.length,
      item: nextItem,
      asset,
    });
  } catch (err: any) {
    console.error('next-item unexpected error', err);
    return NextResponse.json(
      { ok: false, error: err?.message || String(err) },
      { status: 500 },
    );
  }
}
