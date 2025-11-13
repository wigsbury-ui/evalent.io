// app/api/next-item/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);

  // Accept both new and legacy query names
  const sessionId =
    url.searchParams.get('session_id') || url.searchParams.get('sid');

  if (!sessionId) {
    return new NextResponse('session_id (or sid) query param is required', {
      status: 400,
    });
  }

  // 1) Load session to get year + current index
  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .select('id, year, item_index')
    .eq('id', sessionId)
    .maybeSingle();

  if (sessionError) {
    return new NextResponse(sessionError.message, { status: 500 });
  }
  if (!session) {
    return new NextResponse('Session not found', { status: 404 });
  }

  const index = session.item_index ?? 0;

  // 2) Pick ONE item for this year at the current index
  const { data: items, error: itemError } = await supabase
    .from('items')
    .select('id, stem, type, options, correct')
    .eq('year', session.year)
    .not('stem', 'is', null)
    .order('id', { ascending: true })
    .range(index, index); // a single row

  if (itemError) {
    return new NextResponse(itemError.message, { status: 500 });
  }

  // No more items -> we're done
  if (!items || !items.length) {
    return NextResponse.json({
      ok: true,
      item: null,
      asset: null,
      done: true,
    });
  }

  const row = items[0];

  // 3) Normalise options + type
  const rawOptions = (row as any).options;
  const options: string[] = Array.isArray(rawOptions)
    ? rawOptions.map((o) => String(o))
    : [];

  const baseType = (row.type as string | null) || (options.length >= 2 ? 'mcq' : 'short');
  const type: 'mcq' | 'short' =
    baseType.toLowerCase() === 'mcq' || options.length >= 2 ? 'mcq' : 'short';

  // 4) Optional asset (video) for this item
  const { data: asset } = await supabase
    .from('assets')
    .select(
      'item_id, video_title, video_id, share_url, download_url, player_url'
    )
    .eq('item_id', row.id)
    .maybeSingle();

  // 5) Bump item_index so next call moves on
  await supabaseAdmin
    .from('sessions')
    .update({ item_index: index + 1 })
    .eq('id', session.id);

  // 6) Return item + asset to the client
  return NextResponse.json({
    ok: true,
    done: false,
    item: {
      id: row.id,
      stem: row.stem,
      type,
      options,
    },
    asset: asset || null,
  });
}
