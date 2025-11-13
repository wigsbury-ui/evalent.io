// app/api/next-item/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabaseClient';

const UUID_RX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function newUuid(): string {
  return crypto.randomUUID(); // valid UUID v4
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);

    // Accept sid from URL if it *looks* like a UUID, else make a fresh one
    let sid = url.searchParams.get('sid')?.trim() || '';
    if (!UUID_RX.test(sid)) sid = newUuid();

    // Ensure a session row exists
    const { error: upErr } = await supabaseAdmin
      .from('sessions')
      .upsert({ id: sid, item_index: 0 }, { onConflict: 'id' });
    if (upErr) {
      return new NextResponse(
        `Session bootstrap failed: ${upErr.message}`,
        { status: 500 }
      );
    }

    // Get current index for this session (default 0)
    const { data: sess, error: sErr } = await supabaseAdmin
      .from('sessions')
      .select('item_index')
      .eq('id', sid)
      .maybeSingle();
    if (sErr) {
      return new NextResponse(`Session fetch failed: ${sErr.message}`, {
        status: 500,
      });
    }
    const idx = sess?.item_index ?? 0;

    // Pull the next item deterministically
    const { data: items, error: iErr } = await supabaseAdmin
      .from('items')
      .select('*')
      .order('id', { ascending: true })
      .range(idx, idx);
    if (iErr) {
      return new NextResponse(`Items fetch failed: ${iErr.message}`, {
        status: 500,
      });
    }

    const item = items?.[0] ?? null;
    return NextResponse.json({ ok: true, sid, item });
  } catch (e: any) {
    return new NextResponse(`Next-item error: ${e?.message ?? e}`, {
      status: 500,
    });
  }
}
