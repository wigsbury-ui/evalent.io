// app/api/next-item/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supaAdmin } from '@/app/lib/supa';
import { loadItems, loadBlueprints } from '@/app/lib/sheets';
import { filterByBlueprint, selectByIndex } from '@/app/lib/item';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token') ?? '';
  if (!token) return NextResponse.json({ ok: false, error: 'missing_token' }, { status: 400 });

  const db = supaAdmin();

  // find session
  const { data: session, error: sErr } = await db
    .from('sessions')
    .select('id, item_index, status, plan, meta')
    .eq('token', token)
    .single();

  if (sErr || !session) {
    return NextResponse.json({ ok: false, error: 'session_not_found' }, { status: 404 });
  }
  if (session.status && session.status !== 'active') {
    return NextResponse.json({ ok: true, done: true, index: session.item_index ?? 0, total: 0 });
  }

  const [items, blueprints] = await Promise.all([loadItems(), loadBlueprints()]);

  const meta = (session.meta || {}) as any; // { programme?, grade? }
  const { pool, total } = filterByBlueprint(items, blueprints, { programme: meta?.programme, grade: meta?.grade });

  const idx = Number(session.item_index || 0);
  if (idx >= total) {
    // mark done
    await db.from('sessions').update({ status: 'done' }).eq('id', session.id);
    return NextResponse.json({ ok: true, done: true, index: idx, total });
  }

  const item = selectByIndex(pool, idx);
  if (!item) {
    await db.from('sessions').update({ status: 'done' }).eq('id', session.id);
    return NextResponse.json({ ok: true, done: true, index: idx, total });
  }

  // advance index now (optimistic)
  await db.from('sessions').update({ item_index: idx + 1 }).eq('id', session.id);

  return NextResponse.json({ ok: true, item, index: idx, total });
}
