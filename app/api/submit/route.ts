import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { token, itemId, answer } = body || {};
    if (!token || !itemId) {
      return NextResponse.json({ ok:false, error:'missing token or itemId' }, { status:400 });
    }
    return NextResponse.json({ ok:true, received:{ token, itemId, answer } });
  } catch (err: any) {
    return NextResponse.json({ ok:false, error: err?.message ?? 'server error' }, { status:500 });
  }
}
