// app/api/next-item/route.ts
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function supaAdmin() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 });

  const supa = supaAdmin();

  // 1) Load session
  const { data: session, error: sErr } = await supa
    .from('sessions')
    .select('id, school_id, status, item_index')
    .eq('token', token)
    .single();
  if (sErr || !session) return NextResponse.json({ error: 'Invalid token' }, { status: 404 });

  // 2) Count total active items for this school (fallback to NULL-scoped)
  const { count: total, error: cErr } = await supa
    .from('items')
    .select('id', { count: 'exact', head: true })
    .or(`school_id.eq.${session.school_id ?? '00000000-0000-0000-0000-000000000000'},school_id.is.null`)
    .eq('active', true);
  if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });

  // If we’re done
  if (!total || session.item_index >= total) {
    await supa.from('sessions').update({ status: 'complete' }).eq('id', session.id);
    return NextResponse.json({ done: true, total, index: session.item_index });
  }

  // 3) Get the one item at offset item_index
  const { data: items, error: iErr } = await supa
    .from('items')
    .select('id, domain, type, prompt, options, correct_index, media_url')
    .or(`school_id.eq.${session.school_id ?? '00000000-0000-0000-0000-000000000000'},school_id.is.null`)
    .eq('active', true)
    .order('created_at', { ascending: true })
    .range(session.item_index, session.item_index); // exactly one
  if (iErr) return NextResponse.json({ error: iErr.message }, { status: 500 });

  const item = items?.[0];
  if (!item) {
    await supa.from('sessions').update({ status: 'complete' }).eq('id', session.id);
    return NextResponse.json({ done: true, total, index: session.item_index });
  }

  return NextResponse.json({
    done: false,
    total,
    index: session.item_index + 1,
    item: {
      id: item.id,
      domain: item.domain,
      type: item.type,
      prompt: item.prompt,
      options: item.options ?? null,
      media_url: item.media_url ?? null
    }
  });
}
