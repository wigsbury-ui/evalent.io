import { NextResponse, NextRequest } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { getSid } from '@/lib/getSid';

export async function GET(req: NextRequest) {
  const sid = getSid(req);
  if (!sid) return NextResponse.json({ ok: false, error: 'missing_sid' }, { status: 400 });

  // TODO: use sessions.item_index; for now just pick the first not-null stem
  const { data, error } = await supabase
    .from('items')
    .select('id, stem, kind, option_a, option_b, option_c, option_d')
    .not('stem', 'is', null)
    .order('id', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ ok: false, done: true });

  const options = [data.option_a, data.option_b, data.option_c, data.option_d]
    .filter(Boolean)
    .map(String);

  return NextResponse.json({
    ok: true,
    item: {
      id: data.id,
      stem: data.stem,
      kind: options.length >= 2 ? 'mcq' : (data.kind ?? 'text'),
      options
    }
  });
}
