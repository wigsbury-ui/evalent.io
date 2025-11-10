// app/api/start/route.ts
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { supaAdmin } from '@/lib/supa';

// One place to read the passcode (keep it server-only if you can)
// You currently store NEXT_PUBLIC_START_PASSCODE, so read that:
const PASSCODE = process.env.NEXT_PUBLIC_START_PASSCODE || 'letmein';
const DEFAULT_SCHOOL_ID = process.env.DEFAULT_SCHOOL_ID;

function makeToken(): string {
  return Math.random().toString(16).slice(2) + Math.random().toString(16).slice(2);
}

export async function POST(req: Request) {
  try {
    const { passcode } = (await req.json().catch(() => ({}))) as { passcode?: string };

    if (!passcode) {
      return NextResponse.json({ ok: false, error: 'missing_passcode' }, { status: 400 });
    }
    if (passcode !== PASSCODE) {
      return NextResponse.json({ ok: false, error: 'bad_passcode' }, { status: 401 });
    }
    if (!DEFAULT_SCHOOL_ID) {
      return NextResponse.json({ ok: false, error: 'missing_DEFAULT_SCHOOL_ID' }, { status: 500 });
    }

    const token = makeToken();

    // create session with safe defaults
    const { data, error } = await supaAdmin()
      .from('sessions')
      .insert({
        token,
        school_id: DEFAULT_SCHOOL_ID,
        item_index: 0,
        status: 'active',
      })
      .select('id')
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, token, session_id: data?.id ?? null });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
