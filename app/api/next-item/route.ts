export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { supaSR } from '@/lib/supabase';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');
  const session_id = searchParams.get('session_id');

  let session: any;
  if (token) {
    const s = await supaSR.from('sessions').select('*').eq('token', token).single();
    session = s.data;
  } else if (session_id) {
    const s = await supaSR.from('sessions').select('*').eq('id', session_id).single();
    session = s.data;
  } else {
    return NextResponse.json({ ok:false, error:'missing token/session_id' }, { status:400 });
  }

  if (!session) return NextResponse.json({ ok:false, error:'session not found' }, { status:404 });

  const bp = await supaSR.from('blueprints').select('*').eq('id', session.blueprint_id).single();
  const programme = bp.data.programme;
  const grade = bp.data.grade;
  const idx = session.item_index ?? 0;

  const { data: item } = await supaSR
    .from('items')
    .select('*')
    .eq('programme', programme)
    .eq('grade', grade)
    .order('item_id', { ascending: true })
    .range(idx, idx)
    .maybeSingle();

  return NextResponse.json({ ok:true, item, index: idx });
}
