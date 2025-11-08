import { NextResponse } from 'next/server';
import { items } from '@/lib/item';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const url   = new URL(req.url);
    const token = url.searchParams.get('token') ?? '';
    const i     = Number(url.searchParams.get('i') ?? '0');

    if (!token) return NextResponse.json({ ok:false, error:'missing token' }, { status:400 });
    if (!Number.isFinite(i) || i < 0) return NextResponse.json({ ok:false, error:'bad index' }, { status:400 });

    const item = items[i];
    if (!item) return NextResponse.json({ ok:true, done:true });

    return NextResponse.json({ ok:true, done:false, index:i, item });
  } catch (err: any) {
    return NextResponse.json({ ok:false, error: err?.message ?? 'server error' }, { status:500 });
  }
}
