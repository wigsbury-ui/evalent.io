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

  // 1) Fetch item so we can infer kind + correctness
  const { data: item, error: itemError } = await supabase
    .from('items')
    .select('kind, mcq_options_json, answer_key')
    .eq('id', itemId)
    .maybeSingle();

  if (itemError) {
    return new NextResponse(itemError.message, { status: 500 });
  }

  // Infer kind (mcq vs text) based on sheet structure
  let options: string[] = [];
  if (item?.mcq_options_json) {
    try {
      const parsed = JSON.parse(item.mcq_options_json as unknown as string);
      if (Array.isArray(parsed)) {
        options = parsed.map((v) => String(v));
      }
    } catch {
      options = [];
    }
  }

  const inferredKind =
    (item && (item.kind as string | null)) ||
    (options.length >= 2 ? 'mcq' : 'text');

  // 2) Compute "correct" flag where we can
  let correct: boolean | null = null;
  if (item && item.answer_key != null) {
    const key = String(item.answer_key).trim();
    const given = String(response).trim();
    if (key !== '') {
      correct = given === key;
    }
  }

  // 3) Insert attempt row – MUST include kind (NOT NULL in DB)
  const { error: insertError } = await supabaseAdmin.from('attempts').insert([
    {
      session_id: sessionId,
      item_id: itemId,
      kind: inferredKind,        // aligns with NOT NULL constraint
      answer: response,          // student's answer text / option value
      correct,                   // true / false / null
    },
  ]);

  if (insertError) {
    return new NextResponse(insertError.message, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
