export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { supaAdmin } from '@/lib/supa';
import crypto from 'crypto';

function need(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export async function GET() {
  // quick diag to confirm env + DB reachability
  try {
    const urlOK = !!process.env.SUPABASE_URL;
    const keyOK = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
    const schoolOK = !!process.env.DEFAULT_SCHOOL_ID;
    return NextResponse.json({
      ok: true,
      urlOK,
      keyOK,
      schoolOK,
      passcodeSet: !!process.env.NEXT_PUBLIC_START_PASSCODE,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    // 1) Auth via passcode (kept simple)
    const expected = process.env.NEXT_PUBLIC_START_PASSCODE || '';
    const body = await req.json().catch(() => ({} as any));
    const passcode = String(body?.passcode ?? '');

    if (expected && passcode !== expected) {
      return NextResponse.json({ ok: false, error: 'bad_passcode' }, { status: 401 });
    }

    // 2) Create a session row
    const schoolId = need('DEFAULT_SCHOOL_ID');
    const token = crypto.randomUUID().replace(/-/g, '').slice(0, 12); // short human token

    const supa = supaAdmin();
    const { data, error } = await supa
      .from('sessions')
      .insert({
        token,
        status: 'active',       // must be one of: pending | active | complete
        item_index: 0,          // start at first item
        school_id: schoolId,    // optional but recommended if column exists
      })
      .select('token')
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, token: data.token });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
