// app/api/submit/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { token, item_id, kind, selected_index, answer_text } = await req.json();

    if (!token || !item_id) {
      return NextResponse.json({ ok: false, error: 'missing token or item_id' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const sb = createClient(supabaseUrl, serviceKey);

    // Find session (optional but nice to have the id)
    const { data: session } = await sb
      .from('sessions')
      .select('id, item_index')
      .eq('token', token)
      .maybeSingle();

    // Load item to compute correctness (for MCQ)
    const { data: item, error: iErr } = await sb
      .from('items')
      .select('id, correct_index, options, kind')
      .eq('id', item_id)
      .maybeSingle();
    if (iErr || !item) {
      return NextResponse.json({ ok: false, error: iErr?.message || 'item not found' }, { status: 400 });
    }

    const attemptKind: 'mcq' | 'free' =
      (kind as 'mcq' | 'free') || (item.kind === 'free' ? 'free' : 'mcq');

    let is_correct: boolean | null = null;
    if (attemptKind === 'mcq' && typeof selected_index === 'number' && item.correct_index != null) {
      is_correct = selected_index === item.correct_index;
    }

    // Insert attempt (accept both session_token and session_id)
    const payload: any = {
      session_token: token,
      session_id: session?.id ?? null,
      item_id,
      kind: attemptKind,
      selected_index: attemptKind === 'mcq' ? selected_index ?? null : null,
      answer_text: attemptKind === 'free' ? (answer_text ?? '') : null,
      is_correct,
    };

    const { error: aErr } = await sb.from('attempts').insert(payload);
    if (aErr) {
      return NextResponse.json({ ok: false, error: aErr.message }, { status: 500 });
    }

    // (Optional) advance session index server-side
    if (session?.id != null) {
      await sb
        .from('sessions')
        .update({ item_index: (session.item_index ?? 0) + 1 })
        .eq('id', session.id);
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'unexpected error' }, { status: 500 });
  }
}
