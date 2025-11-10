// app/api/ping/route.ts
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ ok: true, via: 'GET' }, { headers: { 'cache-control': 'no-store' } });
}

export async function POST(req: Request) {
  const body = await req.text().catch(() => '');
  return NextResponse.json(
    { ok: true, via: 'POST', received: body || '(empty)' },
    { headers: { 'cache-control': 'no-store' } }
  );
}
