// app/api/submit/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const sid = String(body?.sid || '');
    const item_id = String(body?.item_id || '');
    const answer_text = String(body?.answer_text || '');

    if (!sid || !item_id) {
      return new NextResponse('Missing sid or item_id', { status: 400 });
    }

    // store attempt (adjust to your schema)
    const { error } = await supabaseAdmin.from('attempts').insert({
      session_id: sid,
      item_id,
      answer_text,
    });
    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true }, { headers: { 'cache-control': 'no-store' } });
  } catch (e: any) {
    return new NextResponse(e?.message ?? 'submit failed', { status: 500 });
  }
}
