export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { supaAdmin } from '@/lib/supa';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 });

  const supa = supaAdmin();

  const { data: session, error: sErr } = await supa
    .from('sessions')
    .select('id, school_id, status, item_index')
    .eq('token', token)
    .single();

  if (sErr || !session) return NextResponse.json({ error: 'Invalid token' }, { status: 404 });

  // If completed, return flag
  if (['complete','completed'].includes(String(session.status).toLowerCase())) {
    return NextResponse.json({ done: true });
  }

  // Pull the N-th item for this school (ordered by created_at)
  const { data: items, error: iErr } = await supa
    .from('items')
    .select('id, domain, type, prompt, options, correct_index')
    .eq('active', true)
    .or(`school_id.eq.${session.school_id},school_id.is.null`)
    .order('created_at', { ascending: true });

  if (iErr) return NextResponse.json({ error: iErr.message }, { status: 500 });

  const idx = session.item_index ?? 0;
  if (!items || idx >= items.length) {
    // no more items—mark complete
    await supa.from('sessions').update({ status: 'complete' }).eq('id', session.id);
    return NextResponse.json({ done: true });
  }

  const item = items[idx];
  // Hide correct_index from client
  const safe = { id: item.id, domain: item.domain, type: item.type, prompt: item.prompt, options: item.options ?? null, index: idx + 1, total: items.length };
  return NextResponse.json({ item: safe });
}
