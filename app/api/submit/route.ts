// app/api/submit/route.ts
export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { supaAdmin } from '@/lib/supa';

type ApiOk = { ok: true; next_index: number };
type ApiErr = { ok: false; error: string };

export async function POST(req: Request): Promise<Response> {
  try {
    const body = await req.json().catch(() => ({}));
    const { token, item_id, kind, selected_index, answer_text, is_correct } = body ?? {};

    if (!token || !item_id || !kind) {
      return NextResponse.json<ApiErr>({ ok: false, error: 'missing_fields' }, { status: 400 });
    }

    // Validate payload by type
    if (kind === 'mcq' && (selected_index === undefined || selected_index === null)) {
      return NextResponse.json<ApiErr>({ ok: false, error: 'selected_index_required' }, { status: 400 });
    }
    if (kind === 'free' && (typeof answer_text !== 'string')) {
      return NextResponse.json<ApiErr>({ ok: false, error: 'answer_text_required' }, { status: 400 });
    }

    const admin = supaAdmin();

    // 1) Load session
    const { data: session, error: sErr } = await admin
      .from('sessions')
      .select('id, item_index, status')
      .eq('token', token)
      .single();

    if (sErr || !session) {
      return NextResponse.json<ApiErr>({ ok: false, error: sErr?.message ?? 'session_not_found' }, { status: 404 });
    }

    // 2) Insert attempt (minimal columns you configured)
    const attemptPayload: any = {
      session_token: token,
      item_id,
      is_correct: typeof is_correct === 'boolean' ? is_correct : null,
      selected_index: kind === 'mcq' ? Number(selected_index) : null,
      kind,
    };
    if (kind === 'free') attemptPayload.answer_text = answer_text;

    const { error: aErr } = await admin.from('attempts').insert(attemptPayload);
    if (aErr) return NextResponse.json<ApiErr>({ ok: false, error: aErr.message }, { status: 400 });

    // 3) Advance session index
    const nextIdx = (session.item_index ?? 0) + 1;
    const { error: uErr } = await admin
      .from('sessions')
      .update({ item_index: nextIdx, status: 'active', updated_at: new Date().toISOString() })
      .eq('token', token);
    if (uErr) return NextResponse.json<ApiErr>({ ok: false, error: uErr.message }, { status: 400 });

    return NextResponse.json<ApiOk>({ ok: true, next_index: nextIdx });
  } catch (e: any) {
    return NextResponse.json<ApiErr>({ ok: false, error: e?.message ?? 'server_error' }, { status: 500 });
  }
}
