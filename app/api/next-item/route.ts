// app/api/next-item/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('session_id');
  if (!sessionId) {
    return new NextResponse('session_id required', { status: 400 });
  }

  // 1) Load session
  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .select('id, year, status, item_index, selected_ids')
    .eq('id', sessionId)
    .single();

  if (sessionError || !session) {
    return new NextResponse('Session not found', { status: 404 });
  }

  if (session.status === 'finished') {
    // No more questions once finished
    return NextResponse.json({ item: null });
  }

  const currentIndex = session.item_index ?? 0;

  // 2) Pick next item for the session's year (simple version: ordered by id)
  const { data: items, error: itemError } = await supabase
    .from('items')
    .select('id, stem, type, options')
    .eq('year', session.year)
    .order('id', { ascending: true })
    .range(currentIndex, currentIndex); // single row at this index

  if (itemError) {
    return new NextResponse(itemError.message, { status: 500 });
  }

  const item = items && items[0];

  if (!item) {
    // No item at this index → test is done
    return NextResponse.json({ item: null });
  }

  // 3) Optional: load associated video asset
  const { data: asset } = await supabase
    .from('assets_vw')
    .select(
      'item_id, video_title, video_id, share_url, download_url, video_thumbnail, player_url',
    )
    .eq('item_id', item.id)
    .maybeSingle();

  // 4) Update session progress (item_index and selected_ids)
  const prevSelected = Array.isArray(session.selected_ids)
    ? session.selected_ids
    : [];
  const nextSelected = [...prevSelected, item.id];

  await supabaseAdmin
    .from('sessions')
    .update({
      item_index: currentIndex + 1,
      selected_ids: nextSelected,
    })
    .eq('id', sessionId);

  // 5) Return payload in the shape the client expects
  return NextResponse.json({
    item: {
      id: item.id,
      stem: item.stem,
      type: item.type,
      options: item.options ?? undefined,
    },
    asset: asset || null,
  });
}
