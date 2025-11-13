// app/api/next-item/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('session_id');
  if (!sessionId) {
    return new NextResponse('session_id required', { status: 400 });
  }

  // 1) Load the session (to get year + current index)
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
    .select('id, stem, kind, year, mcq_options_json, answer_key')
    .eq('year', session.year)
    .order('id', { ascending: true })
    .range(index, index); // single row

  if (itemError) {
    return new NextResponse(itemError.message, { status: 500 });
  }

  const row = items?.[0];

  // No more items → mark session finished
  if (!row) {
    await supabaseAdmin
      .from('sessions')
      .update({ status: 'finished' })
      .eq('id', sessionId);

    return NextResponse.json({ ok: true, item: null });
  }

  // 3) Build MCQ options from mcq_options_json
  let options: string[] = [];
  if (row.mcq_options_json) {
    try {
      const parsed = JSON.parse(row.mcq_options_json as unknown as string);
      if (Array.isArray(parsed)) {
        options = parsed.map((v) => String(v));
      }
    } catch {
      // if parsing fails, we just leave options as []
    }
  }

  const hasMcqOptions = options.length >= 2;

  // DB "kind" vs UI "type"
  const kind =
    (row.kind as string | null) || (hasMcqOptions ? 'mcq' : 'text');
  const type: 'mcq' | 'short' = hasMcqOptions ? 'mcq' : 'short';

  // 4) Advance the session index
  await supabaseAdmin
    .from('sessions')
    .update({ item_index: index + 1 })
    .eq('id', sessionId);

  // 5) Return payload the client expects
  return NextResponse.json({
    ok: true,
    item: {
      id: row.id,
      stem: row.stem,
      type,              // 'mcq' or 'short' for the React UI
      options: hasMcqOptions ? options : undefined,
    },
    meta: {
      kind,
      answer_key: row.answer_key, // not used by UI, but handy if you inspect
    },
  });
}
