// app/api/next-item/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabaseClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const UUID_RX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function newUuid(): string {
  return crypto.randomUUID();
}

function noStore(res: NextResponse) {
  res.headers.set('Cache-Control', 'no-store, no-cache, max-age=0, must-revalidate');
  return res;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    let sid = (url.searchParams.get('sid') || '').trim();
    // allow a cache buster param (ignored by logic) to defeat any edge cache
    // const cb = url.searchParams.get('cb'); // ignored

    if (!UUID_RX.test(sid)) sid = newUuid();

    // ensure session row exists
    {
      const { error } = await supabaseAdmin
        .from('sessions')
        .upsert({ id: sid, item_index: 0 }, { onConflict: 'id' });
      if (error) {
        return noStore(
          new NextResponse(`Session bootstrap failed: ${error.message}`, { status: 500 })
        );
      }
    }

    // read current index
    const { data: sess, error: sErr } = await supabaseAdmin
      .from('sessions')
      .select('item_index')
      .eq('id', sid)
      .maybeSingle();
    if (sErr) {
      return noStore(new NextResponse(`Session fetch failed: ${sErr.message}`, { status: 500 }));
    }
    const idx = sess?.item_index ?? 0;

    // fetch deterministic next item
    const { data: items, error: iErr } = await supabaseAdmin
      .from('items')
      .select('*')
      .order('id', { ascending: true })
      .range(idx, idx);
    if (iErr) {
      return noStore(new NextResponse(`Items fetch failed: ${iErr.message}`, { status: 500 }));
    }

    const item = items?.[0] ?? null;
    const res = NextResponse.json({ ok: true, sid, item });
    return noStore(res);
  } catch (e: any) {
    return noStore(new NextResponse(`Next-item error: ${e?.message ?? e}`, { status: 500 }));
  }
}
