// app/api/finish/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { sbAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();
    if (!token) return NextResponse.json({ ok: false, error: 'missing token' }, { status: 400 });

    const sb = sbAdmin();
    const { error } = await sb
      .from('sessions')
      .update({ status: 'finished' })
      .eq('token', token);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
