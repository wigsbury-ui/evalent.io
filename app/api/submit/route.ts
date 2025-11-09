// app/api/submit/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { items } from '../../../lib/item';

declare global {
  // eslint-disable-next-line no-var
  var __EVALENT_SESS__: Record<string, number> | undefined;
}
const sessions: Record<string, number> =
  globalThis.__EVALENT_SESS__ ?? (globalThis.__EVALENT_SESS__ = {});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const token: string = body?.token ?? '';
  if (!token) return NextResponse.json({ error: 'missing token' }, { status: 400 });

  const current = sessions[token] ?? 0;
  const next = Math.min(current + 1, items.length);
  sessions[token] = next;

  const done = next >= items.length;
  return NextResponse.json({ ok: true, done, index: next, total: items.length });
}
