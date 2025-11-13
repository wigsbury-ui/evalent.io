// app/api/next-item/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabaseClient';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const sid = url.searchParams.get('sid')?.trim();
    if (!sid) return new NextResponse('Missing sid', { status: 400 });

    // ensure session row exists
    const { data: sess, error: sErr } = await supabaseAdmin
      .from('sessions')
      .select('item_index')
      .eq('id', sid)
      .maybeSingle();

    if (sErr) {
      return new NextResponse(`Session fetch failed: ${sErr.message}`, { status: 500 });
    }
    const idx = sess?.item_index ?? 0;

    // items are served in deterministic order by id
    const { data: items, error: iErr } = await supabaseAdmin
      .from('items')
      .select('*')
      .order('id', { ascending: true })
      .range(idx, idx);

    if (iErr) {
      return new NextResponse(`Items fetch failed: ${iErr.message}`, { status: 500 });
    }

    const item = items?.[0] ?? null;
    return NextResponse.json({ ok: true, item });
  } catch (e: any) {
    return new NextResponse(`Next-item error: ${e?.message ?? e}`, { status: 500 });
  }
}
