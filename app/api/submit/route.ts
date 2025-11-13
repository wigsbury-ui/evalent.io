// app/api/submit/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabaseClient';

type SubmitBody = {
  session_id: string;
  item_id: string;
  response?: unknown;       // MCQ value or free-text
};

function toText(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v;
  try { return JSON.stringify(v); } catch { return String(v); }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as SubmitBody;

    const session_id = body?.session_id?.trim();
    const item_id    = body?.item_id?.trim();
    const response   = toText(body?.response).trim();

    if (!session_id) return new NextResponse('Missing session_id', { status: 400 });
    if (!item_id)    return new NextResponse('Missing item_id', { status: 400 });
    if (!response)   return new NextResponse('Missing response',  { status: 400 });

    // Insert into attempts. We store response as text so both MCQ and free-text work.
    const { data, error } = await supabaseAdmin
      .from('attempts')
      .insert({
        session_id,       // uuid
        item_id,          // text (no FK)
        response_text: response,  // <-- ensure this column exists (see SQL below)
        created_at: new Date().toISOString(), // harmless if you have a default
      })
      .select('*')
      .single();

    if (error) {
      // surface the exact DB message back to the UI so you can see what's wrong
      return new NextResponse(`attempts insert error: ${error.message}`, { status: 500 });
    }

    return NextResponse.json({ ok: true, attempt: data });
  } catch (e: any) {
    return new NextResponse(`submit handler error: ${e?.message ?? e}`, { status: 500 });
  }
}
