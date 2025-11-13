// app/api/submit/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabaseClient';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const session_id = String(body.session_id ?? '').trim();
    const item_id = String(body.item_id ?? '').trim();
    const response = String(body.response ?? '').trim();
    const meta = body.meta ?? null;

    if (!session_id || !item_id || !response) {
      return new NextResponse('Missing session_id, item_id or response', { status: 400 });
    }

    // 1) insert attempt
    const { error: insErr } = await supabaseAdmin.from('attempts').insert({
      session_id,
      item_id,
      response_text: response,
      meta,
    });
    if (insErr) {
      return new NextResponse(`Attempt insert failed: ${insErr.message}`, { status: 500 });
    }

    // 2) bump session index (read → update)
    const { data: sessRows, error: selErr } = await supabaseAdmin
      .from('sessions')
      .select('item_index')
      .eq('id', session_id)
      .maybeSingle();

    if (selErr) {
      return new NextResponse(`Session fetch failed: ${selErr.message}`, { status: 500 });
    }

    const nextIdx = (sessRows?.item_index ?? 0) + 1;

    const { error: upErr } = await supabaseAdmin
      .from('sessions')
      .upsert({ id: session_id, item_index: nextIdx });

    if (upErr) {
      return new NextResponse(`Session update failed: ${upErr.message}`, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return new NextResponse(`Submit error: ${e?.message ?? e}`, { status: 500 });
  }
}
