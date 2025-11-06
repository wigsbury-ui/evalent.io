// app/api/submit/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { sbAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();
    if (!token) return NextResponse.json({ ok: false, error: 'missing token' }, { status: 400 });

    const sb = sbAdmin();
    const { data: sess, error } = await sb
      .from('sessions')
      .select('id')
      .eq('token', token)
      .single();
    if (error || !sess) return NextResponse.json({ ok: false, error: 'session not found' }, { status: 404 });

    // No-op placeholder
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
