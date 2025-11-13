// app/api/next-item/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabaseClient';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sidParam = searchParams.get('sid');
    const sid =
      sidParam && /^[0-9a-f-]{36}$/i.test(sidParam) ? sidParam : randomUUID();

    // pick any item (you can replace with your real selection logic)
    const { data, error } = await supabaseAdmin
      .from('items')
      .select('id, stem, prompt')
      .limit(1);

    if (error) throw new Error(error.message);

    const item =
      data?.[0] ??
      ({
        id: 'demo-item',
        stem: 'In “The cat sat on the mat,” what did the cat sit on?',
        prompt: null,
      } as const);

    return NextResponse.json({ sid, item }, { headers: { 'cache-control': 'no-store' } });
  } catch (e: any) {
    return new NextResponse(e?.message ?? 'next-item failed', { status: 500 });
  }
}
