// app/api/submit/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);

  const sessionId = url.searchParams.get('session_id');
  const itemId = url.searchParams.get('item_id');
  const response = url.searchParams.get('response') ?? '';

  if (!sessionId || !itemId) {
    return new NextResponse('session_id and item_id required', {
      status: 400,
    });
  }

  // 1) Look up the item so we can mark correct/incorrect
  const { data: item, error: itemError } = await supabase
    .from('items')
    .select('correct')
    .eq('id', itemId)
    .maybeSingle();

  if (itemError) {
    return new NextResponse(itemError.message, { status: 500 });
  }

  // 2) Work out correctness
  let correct: boolean | null = null;
  if (item && item.correct != null) {
    const key = String(item.correct).trim();
    const given = String(response).trim();
    if (key !== '') {
      correct = given === key;
    }
  }

  // 3) Insert attempt row into the real attempts table
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

// Optional: keep POST behaving the same, in case we ever call it
export async function POST(req: NextRequest) {
  const url = new URL(req.url);

  const body = await req.json().catch(() => null);
  const sessionId =
    (body && body.session_id) ||
    url.searchParams.get('session_id') ||
    null;
  const itemId =
    (body && body.item_id) || url.searchParams.get('item_id') || null;
  const response =
    (body && (body.response ?? body.answer ?? '')) ||
    url.searchParams.get('response') ||
    '';

  if (!sessionId || !itemId) {
    return new NextResponse('session_id and item_id required', {
      status: 400,
    });
  }

  // Look up item
  const { data: item, error: itemError } = await supabase
    .from('items')
    .select('correct')
    .eq('id', itemId)
    .maybeSingle();

  if (itemError) {
    return new NextResponse(itemError.message, { status: 500 });
  }

  let correct: boolean | null = null;
  if (item && item.correct != null) {
    const key = String(item.correct).trim();
    const given = String(response).trim();
    if (key !== '') {
      correct = given === key;
    }
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
