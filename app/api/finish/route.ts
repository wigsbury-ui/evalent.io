import { NextRequest, NextResponse } from 'next/server';
import { sbAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();
    if (!token) {
      return NextResponse.json({ ok: false, error: 'missing token' }, { status: 400 });
    }

    const sb = sbAdmin;

    const { data: sess, error } = await sb
      .from('sessions')
      .select('id,status')
      .eq('token', token)
      .single();

    if (error || !sess) {
      return NextResponse.json(
        { ok: false, error: error?.message || 'session not found' },
        { status: 404 }
      );
    }

    await sb
      .from('sessions')
      .update({ status: 'finished', finished_at: new Date().toISOString() })
      .eq('id', sess.id);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
await sb.from('sessions')
  .update({ status: 'finished' })
  .eq('id', sessionId);
