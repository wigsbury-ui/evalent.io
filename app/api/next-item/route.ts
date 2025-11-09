// app/api/next-item/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { items } from '../../../lib/item';

declare global {
  // eslint-disable-next-line no-var
  var __EVALENT_SESS__: Record<string, number> | undefined;
}
const sessions: Record<string, number> =
  globalThis.__EVALENT_SESS__ ?? (globalThis.__EVALENT_SESS__ = {});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token') ?? '';
  const index = sessions[token] ?? 0;

  if (!token) return NextResponse.json({ error: 'missing token' }, { status: 400 });
  if (index >= items.length) return NextResponse.json({ done: true });

  const item = items[index];
  return NextResponse.json({ done: false, index, total: items.length, item });
}
