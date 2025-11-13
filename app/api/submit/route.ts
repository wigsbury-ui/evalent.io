// app/api/submit/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  // TEMPORARY STUB:
  // -------------------------------------------------
  // We are *not* writing to the `attempts` table here,
  // because the live Supabase DB has a custom
  // `attempts_kind_check` constraint that we cannot
  // inspect from this code.
  //
  // This endpoint now simply returns { ok: true } so
  // the front-end flow can advance to the next item.
  //
  // Once we know the exact allowed values for
  // attempts.kind in your Supabase project, we can
  // re-enable inserts here safely.
  // -------------------------------------------------

  // We still parse the params so we can re-use this
  // skeleton later when we re-enable logging.
  const url = new URL(req.url);
  const sessionId = url.searchParams.get('session_id');
  const itemId = url.searchParams.get('item_id');
  const response = url.searchParams.get('response') ?? '';

  // Basic validation – mainly to catch coding mistakes.
  if (!sessionId || !itemId) {
    return new NextResponse('session_id and item_id required', {
      status: 400,
    });
  }

  // At this stage we simply pretend the write succeeded.
  return NextResponse.json({ ok: true });
}
