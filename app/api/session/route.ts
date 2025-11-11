// app/api/session/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/app/lib/db';

// GET /api/session?token=...
export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get('token') ?? '';
    if (!token) {
      return NextResponse.json(
        { ok: false, error: 'missing_token' },
        { status: 400 }
      );
    }

    const { data, error } = await db()
      .from('sessions')
      .select('id, token, status, item_index, plan, meta, created_at, updated_at')
      .eq('token', token)
      .single();

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, session: data });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || 'session_get_error' },
      { status: 500 }
    );
  }
}

// POST /api/session  { token?:string, plan?:any, meta?:any }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const token: string =
      body.token ||
      Math.random().toString(36).slice(2) + Date.now().toString(36);

    const payload = {
      token,
      status: 'active',
      item_index: 0,
      plan: body.plan ?? null,
      meta: body.meta ?? null,
    };

    // Upsert on token so repeated calls don’t explode
    const { data, error } = await db()
      .from('sessions')
      .upsert(payload, { onConflict: 'token' })
      .select('id, token, status, item_index, plan, meta, created_at, updated_at')
      .single();

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true, session: data });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || 'session_post_error' },
      { status: 500 }
    );
  }
}
