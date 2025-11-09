// app/api/next-item/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { items } from '../../../lib/item';

type StoreEntry = {
  index: number;                                   // next item index to serve
  answers: Record<string, string>;                 // itemId -> answer (mcq stores index as string)
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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token') ?? '';
  if (!token) return NextResponse.json({ error: 'missing token' }, { status: 400 });

  const s = ensure(token);

  // Finished? Return a summary payload
  if (s.index >= items.length) {
    const written = items
      .filter((it) => it.type === 'written')
      .map((it) => ({ id: it.id, prompt: it.prompt, answer: s.answers[it.id] ?? '' }));

    const mcq = items
      .filter((it) => it.type === 'mcq')
      .map((it) => {
        const selectedIndex = s.answers[it.id] != null ? Number(s.answers[it.id]) : null;
        return {
          id: it.id,
          prompt: it.prompt,
          options: it.options,
          correctIndex: it.correctIndex,
          selectedIndex,
          correct: selectedIndex === it.correctIndex,
        };
      });

    return NextResponse.json({
      done: true,
      total: items.length,
      correctMcq: s.correctMcq,
      answered: Object.keys(s.answers).length,
      written,
      mcq,
    });
  }

  // Otherwise return the next item
  const item = items[s.index];
  return NextResponse.json({ done: false, index: s.index, total: items.length, item });
}
