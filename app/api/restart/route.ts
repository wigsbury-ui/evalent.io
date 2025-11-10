// app/api/restart/route.ts
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { supaAdmin } from '@/lib/supa';

export async function POST(req: Request) {
  try {
    const { token } = (await req.json()) as { token: string };
    if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 });

    const { data: session, error: sErr } = await supaAdmin
      .from('sessions')
      .select('id')
      .eq('token', token)
      .single();
    if (sErr || !session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

    // Clear attempts
    const { error: delA } = await supaAdmin.from('attempts').delete().eq('session_id', session.id);
    if (delA) return NextResponse.json({ error: delA.message }, { status: 400 });

    const { error: delW } = await supaAdmin.from('written_answers').delete().eq('session_id', session.id);
    if (delW) return NextResponse.json({ error: delW.message }, { status: 400 });

    // Reset session
    const { error: upd } = await supaAdmin
      .from('sessions')
      .update({ item_index: 0, status: 'pending' })
      .eq('id', session.id);
    if (upd) return NextResponse.json({ error: upd.message }, { status: 400 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}
