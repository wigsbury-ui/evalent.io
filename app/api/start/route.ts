export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { supaAdmin as createAdmin } from '@/lib/supa'; // alias we added

async function handle(urlOrPass: string) {
  // read passcode from URL
  const u = urlOrPass.startsWith('http')
    ? new URL(urlOrPass)
    : new URL('http://x/start?passcode=' + encodeURIComponent(urlOrPass));

  const pass = u.searchParams.get('passcode') ?? '';
  if (pass !== (process.env.NEXT_PUBLIC_START_PASSCODE || '')) {
    return NextResponse.json({ error: 'Invalid passcode' }, { status: 401 });
  }

  const db = createAdmin();
  // token: short & unique enough for demo
  const token = Math.random().toString(16).slice(2, 10) + Date.now().toString(16).slice(-4);

  const { error } = await db
    .from('sessions')
    .insert({ token, status: 'active', item_index: 0 })
    .select('token')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, token, link: `/t/${token}` });
}

export async function GET(req: Request) {
  return handle(req.url);
}

export async function POST(req: Request) {
  // body: { passcode?: string }
  const body = await req.json().catch(() => ({} as any));
  const url = new URL(req.url);
  if (body?.passcode) url.searchParams.set('passcode', body.passcode);
  return handle(url.toString());
}
