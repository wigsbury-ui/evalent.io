// app/api/submit/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { items } from '../../../lib/item';

type StoreEntry = {
  index: number;
  answers: Record<string, string>;
  correctMcq: number;
};

declare global {
  // eslint-disable-next-line no-var
  var __EVALENT_STORE__: Record<string, StoreEntry> | undefined;
}
const store: Record<string, StoreEntry> =
  globalThis.__EVALENT_STORE__ ?? (globalThis.__EVALENT_STORE__ = {});

function ensure(token: string): StoreEntry {
  if (!store[token]) store[token] = { index: 0, answers: {}, correctMcq: 0 };
  return store[token];
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const token: string = body?.token ?? '';
  const answer: string = (body?.answer ?? '').toString();
  if (!token) return NextResponse.json({ error: 'missing token' }, { status: 400 });

  const s = ensure(token);
  const idx = s.index;
  if (idx >= items.length) return NextResponse.json({ ok: true, done: true, index: s.index, total: items.length });

  const current = items[idx];
  // Save answer
  s.answers[current.id] = answer;

  // If MCQ, count correctness
  if (current.type === 'mcq') {
    const selected = Number(answer);
    if (!Number.isNaN(selected) && selected === current.correctIndex) s.correctMcq += 1;
  }

  // Advance
  s.index = Math.min(s.index + 1, items.length);

  const done = s.index >= items.length;
  return NextResponse.json({ ok: true, done, index: s.index, total: items.length });
}
