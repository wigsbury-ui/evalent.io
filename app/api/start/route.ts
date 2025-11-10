// app/api/start/route.ts
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { supaAdmin } from '@/lib/supa';
import { DEFAULT_SCHOOL_ID, START_PASSCODE } from '@/lib/env';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const pass = searchParams.get('passcode') ?? '';
    if (pass !== START_PASSCODE) {
      return NextResponse.json({ error: 'Invalid passcode' }, { status: 401 });
    }

    const token = randomUUID().replace(/-/g, '').slice(0, 12);

    const { data, error } = await supaAdmin
      .from('sessions')
      .insert({
        token,                       // text or varchar
        school_id: DEFAULT_SCHOOL_ID,
        status: 'pending',           // passes CHECK ('pending','active','complete')
        item_index: 0,
      })
      .select('token')
      .single();

    if (error) return NextResponse.json({ error: `DB error: ${error.message}` }, { status: 400 });

    return NextResponse.json({ ok: true, token: data.token });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}
