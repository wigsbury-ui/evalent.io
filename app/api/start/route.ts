// app/api/start/route.ts
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { supaAdmin } from '@/lib/supa';

const PASSCODE =
  process.env.NEXT_PUBLIC_START_PASSCODE ||
  process.env.START_PASSCODE ||
  ''; // allow override

const DEFAULT_SCHOOL_ID = process.env.DEFAULT_SCHOOL_ID || null;

async function createSession() {
  const token = crypto.randomUUID().replace(/-/g, '').slice(0, 12);

  const payload: any = {
    token,
    status: 'active',
    item_index: 0,
  };

  if (DEFAULT_SCHOOL_ID) payload.school_id = DEFAULT_SCHOOL_ID;

  const { error } = await supaAdmin.from('sessions').insert(payload);
  if (error) throw new Error(`DB insert failed: ${error.message}`);

  return token;
}

function passcodeOk(input: string | null) {
  // If no passcode configured, allow any input.
  if (!PASSCODE) return true;
  return (input || '').trim() === PASSCODE;
}

async function startHandler(req: Request) {
  // 1) Read passcode from JSON body, form, or query
  let given: string | null = null;

  const ct = req.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    const body = await req.json().catch(() => ({} as any));
    given = (body?.passcode ?? null) as string | null;
  } else if (ct.includes('application/x-www-form-urlencoded') || ct.includes('multipart/form-data')) {
    const form = await req.formData().catch(() => null);
    given = (form?.get('passcode') as string) ?? null;
  } else {
    const { searchParams } = new URL(req.url);
    given = searchParams.get('passcode');
  }

  if (!passcodeOk(given)) {
    return NextResponse.json({ error: 'Invalid passcode' }, { status: 401 });
  }

  try {
    const token = await createSession();
    return NextResponse.json({ ok: true, token, href: `/t/${token}` });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}

// Support both POST (form/JSON) and GET (query) to avoid 405s.
export async function POST(req: Request) {
  return startHandler(req);
}

export async function GET(req: Request) {
  return startHandler(req);
}
