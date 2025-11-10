export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { supaAdmin } from '@/lib/supa';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token') ?? '';
    if (!token) return NextResponse.json({ ok: false, error: 'missing_token' }, { status: 400 });

    // fetch session
    const { data: session, error: sErr } = await supaAdmin()
      .from('sessions')
      .select('id, school_id, item_index, status')
      .eq('token', token)
      .single();

    if (sErr) return NextResponse.json({ ok: false, error: sErr.message }, { status: 500 });
    if (!session) return NextResponse.json({ ok: false, error: 'session_not_found' }, { status: 404 });
    if (session.status === 'complete') return NextResponse.json({ ok: true, done: true });

    // fetch next item by offset (simple demo ordering)
    const { data: items, error: iErr } = await supaAdmin()
      .from('items')
      .select('id, prompt, domain, kind, options, correct_index, active')
      .eq('active', true)
      .eq('school_id', session.school_id)
      .order('id', { ascending: true })
      .range(session.item_index, session.item_index); // 1 item

    if (iErr) return NextResponse.json({ ok: false, error: iErr.message }, { status: 500 });
    const item = items?.[0];
    if (!item) {
      // nothing more -> mark complete
      await supaAdmin().from('sessions').update({ status: 'complete' }).eq('id', session.id);
      return NextResponse.json({ ok: true, done: true });
    }

    return NextResponse.json({ ok: true, session: { index: session.item_index }, item });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
