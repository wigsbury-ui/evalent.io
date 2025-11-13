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

  // 1) Fetch item to infer kind + correctness
  const { data: item, error: itemError } = await supabase
    .from('items')
    .select('type, options, correct')
    .eq('id', itemId)
    .maybeSingle();

  if (itemError) {
    return new NextResponse(itemError.message, { status: 500 });
  }

  const rawOptions = item ? (item as any).options : null;
  const options: string[] = Array.isArray(rawOptions)
    ? rawOptions.map((v: any) => String(v))
    : [];

  const baseType =
    (item?.type as string | null) || (options.length >= 2 ? 'mcq' : 'short');
  const inferredKind = baseType === 'mcq' ? 'mcq' : 'short';

  // 2) Compute correctness using `items.correct`
  let correct: boolean | null = null;
  if (item && item.correct != null) {
    const key = String(item.correct).trim();
    const given = String(response).trim();
    if (key !== '') {
      correct = given === key;
    }
  }

  // 3) Insert attempt row
  // NOTE: your Supabase `attempts` table currently has a NOT NULL `kind` column,
  // so we *always* send it here.
  const { error: insertError } = await supabaseAdmin.from('attempts').insert([
    {
      session_id: sessionId,
      item_id: itemId,
      kind: inferredKind,
      response,     // student's answer (works with schema.sql)
      correct,      // true / false / null
    },
  ]);

  if (insertError) {
    return new NextResponse(insertError.message, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
