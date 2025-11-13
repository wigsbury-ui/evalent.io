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

  // 1) Fetch item so we can compute correctness
  const { data: item, error: itemError } = await supabase
    .from('items')
    .select('correct')
    .eq('id', itemId)
    .maybeSingle();

  if (itemError) {
    return new NextResponse(itemError.message, { status: 500 });
  }

  // 2) Compute correctness using items.correct (seeded from answer_key)
  let correct: boolean | null = null;
  if (item && item.correct != null) {
    const key = String(item.correct).trim();
    const given = String(response).trim();
    if (key !== '') {
      correct = given === key;
    }
  }

  // 3) Insert attempt row
  //    Your Supabase attempts table has a NOT NULL + CHECK on "kind".
  //    We treat every student response as an "answer" event.
  const { error: insertError } = await supabaseAdmin.from('attempts').insert([
    {
      session_id: sessionId,
      item_id: itemId,
      kind: 'answer',   // <<< key change
      response,         // student's answer
      correct,          // true / false / null
    },
  ]);

  if (insertError) {
    return new NextResponse(insertError.message, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
