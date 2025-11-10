export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { supaAdmin } from '@/lib/supa';

export async function POST(req: Request) {
  try {
    const { token } = (await req.json()) as { token?: string };
    if (!token) return NextResponse.json({ ok: false, error: 'missing_token' }, { status: 400 });

    const supa = supaAdmin();

    const { data: session, error: sErr } = await supa
      .from('sessions')
      .select('id')
      .eq('token', token)
      .single();
    if (sErr) return NextResponse.json({ ok: false, error: sErr.message }, { status: 500 });
    if (!session) return NextResponse.json({ ok: false, error: 'session_not_found' }, { status: 404 });

    // wipe answers and reset index
    const sid = session.id as string;
    await supa.from('attempts').delete().eq('session_id', sid);
    await supa.from('written_answers').delete().eq('session_id', sid);
    await supa.from('sessions').update({ item_index: 0, status: 'active' }).eq('id', sid);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
