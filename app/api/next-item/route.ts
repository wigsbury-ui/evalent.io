// app/api/next-item/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('session_id');
  if (!sessionId) {
    return new NextResponse('session_id required', { status: 400 });
  }

  // 1) Load session (year + current index)
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
    .select('id, stem, type, options, correct')
    .eq('year', session.year)
    .not('stem', 'is', null)
    .order('id', { ascending: true })
    .range(index, index); // exactly one row

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

  // 3) Build options array from jsonb `options`
  const rawOptions = (row as any).options;
  const options: string[] = Array.isArray(rawOptions)
    ? rawOptions.map((v) => String(v))
    : [];

  // Decide UI type: mcq vs short
  const baseType = (row.type as string | null) || (options.length >= 2 ? 'mcq' : 'short');
  const type: 'mcq' | 'short' = baseType === 'mcq' ? 'mcq' : 'short';

  // 4) Advance session index
  await supabaseAdmin
    .from('sessions')
    .update({ item_index: index + 1 })
    .eq('id', sessionId);

  // 5) Return payload for the client
  return NextResponse.json({
    ok: true,
    item: {
      id: row.id,
      stem: row.stem,
      type,
      options: type === 'mcq' ? options : undefined,
    },
    // meta for debugging if you inspect the API directly
    meta: {
      correct: row.correct,
    },
  });
}
