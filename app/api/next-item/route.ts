// app/api/next-item/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { sbAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();
    if (!token) return NextResponse.json({ ok: false, error: 'missing token' }, { status: 400 });

    const sb = sbAdmin();
    const { data: session, error } = await sb
      .from('sessions')
      .select('id, status')
      .eq('token', token)
      .single();
    if (error || !session) return NextResponse.json({ ok: false, error: 'session not found' }, { status: 404 });

    // Return a minimal placeholder payload (keeps build/runtime happy)
    return NextResponse.json({ ok: true, session_id: session.id, status: session.status, item: null });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
