// app/api/next-item/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabaseClient';

function newSid() {
  // node 18+ has global crypto
  return `local-${crypto.randomUUID()}`;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    let sid = url.searchParams.get('sid')?.trim() || '';

    // If missing, create a fresh session at index 0
    if (!sid) {
      sid = newSid();
      const { error: upErr } = await supabaseAdmin
        .from('sessions')
        .upsert({ id: sid, item_index: 0 });
      if (upErr) {
        return new NextResponse(`Session bootstrap failed: ${upErr.message}`, { status: 500 });
      }
    }

    // Get current index for this session (default 0)
    const { data: sess, error: sErr } = await supabaseAdmin
      .from('sessions')
      .select('item_index')
      .eq('id', sid)
      .maybeSingle();
    if (sErr) {
      return new NextResponse(`Session fetch failed: ${sErr.message}`, { status: 500 });
    }
    const idx = sess?.item_index ?? 0;

    // Fetch one item deterministically
    const { data: items, error: iErr } = await supabaseAdmin
      .from('items')
      .select('*')
      .order('id', { ascending: true })
      .range(idx, idx);
    if (iErr) {
      return new NextResponse(`Items fetch failed: ${iErr.message}`, { status: 500 });
    }

    const item = items?.[0] ?? null;
    return NextResponse.json({ ok: true, sid, item });
  } catch (e: any) {
    return new NextResponse(`Next-item error: ${e?.message ?? e}`, { status: 500 });
  }
}
