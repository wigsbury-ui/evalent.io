// app/api/next-item/route.ts
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { supaAdmin } from '@/lib/supa';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');
    if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 });

    const { data: session, error: sErr } = await supaAdmin
      .from('sessions')
      .select('id, school_id, item_index, status')
      .eq('token', token)
      .single();

    if (sErr || !session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

    // Pull the next active item for this school
    const { data: items, error: iErr } = await supaAdmin
      .from('items')
      .select('id, domain, prompt, options, correct_index, kind')
      .eq('school_id', session.school_id)
      .eq('active', true)
      .order('ordinal', { ascending: true, nullsFirst: false })
      .order('id', { ascending: true })
      .range(session.item_index, session.item_index); // one row

    if (iErr) return NextResponse.json({ error: iErr.message }, { status: 400 });

    if (!items || items.length === 0) {
      // no more items
      return NextResponse.json({ done: true });
    }

    const item = items[0];
    // never leak the correct index to the client
    const safe = {
      id: item.id,
      domain: item.domain,
      prompt: item.prompt,
      options: item.options ?? null, // null for written response items
      kind: item.kind ?? 'mcq',      // 'mcq' | 'written'
      index: session.item_index + 1, // 1-based for UI
    };

    // mark session active if still pending
    if (session.status === 'pending') {
      await supaAdmin.from('sessions').update({ status: 'active' }).eq('id', session.id);
    }

    return NextResponse.json({ done: false, item: safe });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}
