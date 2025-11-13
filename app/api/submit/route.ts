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

  // Optional correctness check based on items.correct
  let correct: boolean | null = null;

  const { data: item, error: itemError } = await supabase
    .from('items')
    .select('correct')
    .eq('id', itemId)
    .maybeSingle();

  if (!itemError && item && item.correct != null) {
    const expected = String(item.correct).trim();
    correct = expected !== '' ? expected === String(response).trim() : null;
  }

  const { error: insertError } = await supabaseAdmin.from('attempts').insert([
    {
      session_id: sessionId,
      item_id: itemId,
      response,
      correct,
    },
  ]);

  if (insertError) {
    return new NextResponse(insertError.message, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
