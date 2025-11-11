// app/api/next-item/route.ts
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { supaAdmin } from '@/lib/supa';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');
    if (!token) {
      return NextResponse.json({ ok: false, error: 'missing token' }, { status: 400 });
    }

    const supa = supaAdmin();

    // 1) Load the session
    const { data: session, error: sErr } = await supa
      .from('sessions')
      .select('id, school_id, item_index, status')
      .eq('token', token)
      .single();

    if (sErr) {
      return NextResponse.json({ ok: false, error: sErr.message }, { status: 400 });
    }
    if (!session) {
      return NextResponse.json({ ok: false, error: 'session not found' }, { status: 404 });
    }
    if (session.status === 'complete') {
      return NextResponse.json({ ok: true, done: true });
    }

    const idx = Number(session.item_index ?? 0);

    // 2) Fetch exactly one active item for this school at the current index.
    //    IMPORTANT: do NOT select a non-existent "kind" column.
    //    We’ll compute "kind" from options below.
    const { data: items, error: iErr } = await supa
      .from('items')
      .select('id, prompt, domain, options, correct_index, active')
      .eq('active', true)
      .eq('school_id', session.school_id)
      .order('id', { ascending: true })
      .range(idx, idx); // one row at the current index

    if (iErr) {
      return NextResponse.json({ ok: false, error: iErr.message }, { status: 400 });
    }

    const item = items?.[0];
    if (!item) {
      // No more items → mark complete
      await supa.from('sessions').update({ status: 'complete' }).eq('id', session.id);
      return NextResponse.json({ ok: true, done: true });
    }

    // 3) Compute "kind" from presence of options
    const kind =
      Array.isArray(item.options) && item.options.length > 0 ? 'mcq' : 'written';

    return NextResponse.json({
      ok: true,
      item: {
        id: item.id,
        prompt: item.prompt,
        domain: item.domain ?? 'General',
        kind,                          // computed
        options: item.options ?? [],   // MCQ options (if any)
      },
      index: idx,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: String(e?.message || e) },
      { status: 500 }
    );
  }
}
