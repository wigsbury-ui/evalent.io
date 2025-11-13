// app/api/submit/route.ts
import { NextRequest, NextResponse } from 'next/server';

async function handleSubmit(req: NextRequest) {
  const url = new URL(req.url);

  // We accept both current and legacy shapes, but we don't
  // actually *use* them yet – this is just for future-proofing.
  const sessionId =
    url.searchParams.get('session_id') ||
    url.searchParams.get('sid') ||
    null;

  const itemId = url.searchParams.get('item_id') || null;
  const responseParam = url.searchParams.get('response') ?? null;

  // If it's a POST, there *might* be a JSON body instead.
  let body: any = null;
  if (req.method === 'POST') {
    try {
      body = await req.json();
    } catch {
      body = null;
    }
  }

  const response =
    responseParam ??
    (body && (body.response ?? body.answer ?? body.value)) ??
    '';

  if (!sessionId || !itemId) {
    // Keep this strict so we notice wiring mistakes
    return new NextResponse('session_id and item_id required', {
      status: 400,
    });
  }

  // 🔒 IMPORTANT:
  // We are *not* writing to Supabase here yet, because your live
  // `attempts` table has a custom NOT NULL + CHECK constraint on
  // "kind" that we can't see from the repo.
  //
  // This endpoint now acts as a "no-op" logger so the front-end
  // flow can proceed without any database errors.
  //
  // Once we're happy with the end-to-end flow, we can reintroduce
  // proper logging to `attempts` with whatever "kind" values your
  // Supabase schema actually allows.

  console.log('SUBMIT (stub)', {
    sessionId,
    itemId,
    response,
  });

  return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest) {
  return handleSubmit(req);
}

export async function POST(req: NextRequest) {
  return handleSubmit(req);
}
