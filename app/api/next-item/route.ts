// app/api/next-item/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// For now we keep a simple fixed length per sitting.
// Later this can be driven by the blueprint record.
const QUESTIONS_PER_SESSION = 8;

/**
 * GET /api/next-item?session_id=...
 *
 * Response:
 *   { ok: true, done: false, item, asset }  -> next question
 *   { ok: true, done: true, item: null }    -> no more questions
 *   { ok: false, error }                    -> error (400/500)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      return NextResponse.json(
        { ok: false, error: 'Missing session_id' },
        { status: 400 },
      );
    }

    // 1. Load the session
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .maybeSingle();

    if (sessionError) {
      console.error('next-item: error loading session', sessionError);
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

    const currentIndex: number = session.item_index ?? 0;

    // 2. If we already served the quota, mark finished and return done
    if (currentIndex >= QUESTIONS_PER_SESSION) {
      await supabaseAdmin
        .from('sessions')
        .update({ status: 'finished' })
        .eq('id', sessionId);

      return NextResponse.json(
        { ok: true, done: true, item: null },
        { status: 200 },
      );
    }

    // 3. Pick the next item for this year / programme.
    //    For now we simply select items for the session's year,
    //    ordered by id, and use item_index as the offset.
    const year = session.year;
    const programme = session.programme;

    let query = supabaseAdmin
      .from('items')
      .select('*')
      .eq('year', year)
      .order('id', { ascending: true });

    if (programme) {
      query = query.eq('programme', programme);
    }

    const { data: items, error: itemsError } = await query.range(
      currentIndex,
      currentIndex, // one row at this offset
    );

    if (itemsError) {
      console.error('next-item: error loading items', itemsError);
      return NextResponse.json(
        { ok: false, error: 'Failed to load items' },
        { status: 500 },
      );
    }

    const item = items?.[0];

    // No more items available for this session -> finished
    if (!item) {
      await supabaseAdmin
        .from('sessions')
        .update({ status: 'finished' })
        .eq('id', sessionId);

      return NextResponse.json(
        { ok: true, done: true, item: null },
        { status: 200 },
      );
    }

    // 4. Try to fetch a matching asset (video / image) for this item.
    //    We look up by the logical item_id, which is what assets.csv uses.
    let asset: any = null;
    if (item.item_id) {
      const { data: assetRow, error: assetError } = await supabaseAdmin
        .from('assets')
        .select('*')
        .eq('item_id', item.item_id)
        .maybeSingle();

      if (assetError) {
        console.warn('next-item: asset lookup failed', assetError);
      } else {
        asset = assetRow;
      }
    }

    // 5. Bump the session's item_index so the next call advances.
    const { error: updateError } = await supabaseAdmin
      .from('sessions')
      .update({ item_index: currentIndex + 1 })
      .eq('id', sessionId);

    if (updateError) {
      console.error('next-item: failed to update item_index', updateError);
      // Still return the item; worst case the same question may repeat.
    }

    return NextResponse.json(
      { ok: true, done: false, item, asset },
      { status: 200 },
    );
  } catch (err) {
    console.error('next-item: unexpected error', err);
    return NextResponse.json(
      { ok: false, error: 'Unexpected server error' },
      { status: 500 },
    );
  }
}
