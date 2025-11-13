// app/api/submit/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const sessionId = params.get('session_id');
  const itemId = params.get('item_id');
  const response = params.get('response') ?? '';

  if (!sessionId || !itemId) {
    return new NextResponse('session_id and item_id required', {
      status: 400,
    });
  }

  // 1) Fetch item metadata so we can infer kind
  const { data: item, error: itemError } = await supabase
    .from('items')
    .select('kind, option_a, option_b, option_c, option_d')
    .eq('id', itemId)
    .maybeSingle();

  if (itemError) {
    return new NextResponse(itemError.message, { status: 500 });
  }

  const options = item
    ? [item.option_a, item.option_b, item.option_c, item.option_d]
        .filter(Boolean)
        .map(String)
    : [];

  const inferredKind =
    (item && (item.kind as string | null)) ||
    (options.length >= 2 ? 'mcq' : 'text');

  // 2) Record the attempt
  const { error: insertError } = await supabaseAdmin.from('attempts').insert([
    {
      session_id: sessionId,
      item_id: itemId,
      kind: inferredKind,
      answer: response, // keep using the original "answer" column
      // we can add "correct" later; leaving it null is fine for now
    },
  ]);

  if (insertError) {
    return new NextResponse(insertError.message, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
