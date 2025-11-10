export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { supaAdmin } from '@/lib/supa';

export async function POST(req: Request) {
  const supa = supaAdmin();
  let body: any = {};
  try { body = await req.json(); } catch {}

  const token = String(body?.token || '').trim();
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 });

  const { data: session, error: sErr } = await supa
    .from('sessions').select('id').eq('token', token).single();
  if (sErr || !session) return NextResponse.json({ error: 'Invalid token' }, { status: 404 });

  await supa.from('attempts').delete().eq('session_id', session.id);
  await supa.from('written_answers').delete().eq('session_id', session.id);
  await supa.from('sessions').update({ item_index: 0, status: 'in_progress' }).eq('id', session.id);

  return NextResponse.json({ ok: true });
}
