import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { getSid } from '@/lib/getSid';

export async function POST(req: NextRequest) {
  const sid = getSid(req);
  if (!sid) return NextResponse.json({ ok: false, error: 'missing_sid' }, { status: 400 });

  const body = await req.json();
  const { item_id, answer } = body || {};
  if (!item_id) return NextResponse.json({ ok: false, error: 'missing_item_id' }, { status: 400 });

  const { error } = await supabase.from('attempts').insert([{ sid, item_id, answer: String(answer ?? '') }]);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
