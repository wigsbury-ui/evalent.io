// app/api/next-item/route.ts
export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { supaAdmin } from '@/lib/supa';

type ApiOk =
  | { ok: true; done: true; index: number; total: number }
  | { ok: true; done: false; index: number; total: number; item: ItemRow };

type ApiErr = { ok: false; error: string };

type ItemRow = {
  id: string;
  domain: string | null;
  prompt: string;
  kind: 'mcq' | 'free';
  options: string[] | null; // null for free-text
};

export async function GET(req: Request): Promise<Response> {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');
    const schoolId = searchParams.get('school_id'); // optional override

    if (!token) return NextResponse.json<ApiErr>({ ok: false, error: 'missing_token' }, { status: 400 });

    const admin = supaAdmin();

    // 1) Read session
    const { data: session, error: sErr } = await admin
      .from('sessions')
      .select('id, school_id, item_index, status')
      .eq('token', token)
      .single();

    if (sErr || !session) {
      return NextResponse.json<ApiErr>({ ok: false, error: sErr?.message ?? 'session_not_found' }, { status: 404 });
    }

    const sid = session.school_id ?? schoolId; // allow override if provided
    // 2) Count items
    const { count, error: cErr } = await admin
      .from('items')
      .select('id', { count: 'estimated', head: true })
      .eq('active', true)
      .or(sid ? `school_id.eq.${sid},school_id.is.null` : 'school_id.is.null'); // serve demo + null-school items
    if (cErr) return NextResponse.json<ApiErr>({ ok: false, error: cErr.message }, { status: 400 });

    const total = count ?? 0;
    const index = session.item_index ?? 0;

    if (total === 0) {
      return NextResponse.json<ApiErr>({ ok: false, error: 'no_items_available' }, { status: 400 });
    }

    // 3) Done?
    if (index >= total) {
      return NextResponse.json<ApiOk>({ ok: true, done: true, index, total });
    }

    // 4) Fetch the next item (stable order)
    const { data: rows, error: iErr } = await admin
      .from('items')
      .select('id, domain, prompt, kind, options')
      .eq('active', true)
      .or(sid ? `school_id.eq.${sid},school_id.is.null` : 'school_id.is.null')
      .order('created_at', { ascending: true })
      .range(index, index); // just one

    if (iErr) return NextResponse.json<ApiErr>({ ok: false, error: iErr.message }, { status: 400 });
    const item = rows?.[0];
    if (!item) return NextResponse.json<ApiErr>({ ok: false, error: 'item_not_found' }, { status: 404 });

    const shape: ItemRow = {
      id: item.id,
      domain: item.domain ?? null,
      prompt: item.prompt,
      kind: (item.kind as 'mcq' | 'free') ?? 'mcq',
      options: item.options ?? null,
    };

    return NextResponse.json<ApiOk>({
      ok: true,
      done: false,
      index,
      total,
      item: shape,
    });
  } catch (e: any) {
    return NextResponse.json<ApiErr>({ ok: false, error: e?.message ?? 'server_error' }, { status: 500 });
  }
}
