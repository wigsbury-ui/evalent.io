// app/api/next-item/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('session_id');
  if (!sessionId) {
    return new NextResponse('session_id required', { status: 400 });
  }

  // 1) Load the session
  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .select('id, year, status, item_index')
    .eq('id', sessionId)
    .single();

  if (sessionError || !session) {
    return new NextResponse('Session not found', { status: 404 });
  }

  if (session.status === 'finished') {
    return NextResponse.json({ ok: true, item: null });
  }

  const index = session.item_index ?? 0;

  // 2) Pick the next item for this year
  const { data: items, error: itemError } = await supabase
    .from('items')
    .select('id, stem, kind, year, option_a, option_b, option_c, option_d')
    .not('stem', 'is', null)
    .eq('year', session.year)
    .order('id', { ascending: true })
    .range(index, index); // get a single row at this index

  if (itemError) {
    return new NextResponse(itemError.message, { status: 500 });
  }

  const row = items?.[0];

  // No more items → mark finished
  if (!row) {
    await supabaseAdmin
      .from('sessions')
      .update({ status: 'finished' })
      .eq('id', sessionId);

    return NextResponse.json({ ok: true, item: null });
  }

  // 3) Build options array
  const options = [row.option_a, row.option_b, row.option_c, row.option_d]
    .filter(Boolean)
    .map(String);

  const isMcq = options.length >= 2;

  // DB "kind" (for logging, analytics) and UI "type" (for rendering)
  const kind = (row.kind as string | null) || (isMcq ? 'mcq' : 'text');
  const type: 'mcq' | 'short' = isMcq ? 'mcq' : 'short';

  // 4) Advance the session index
  await supabaseAdmin
    .from('sessions')
    .update({ item_index: index + 1 })
    .eq('id', sessionId);

  // 5) Return exactly what the client expects
  return NextResponse.json({
    ok: true,
    item: {
      id: row.id,
      stem: row.stem,
      type,
      options: isMcq ? options : undefined,
    },
    // meta is optional; client ignores it, but it’s useful if you inspect the API response
    meta: { kind },
  });
}
