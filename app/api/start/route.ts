// app/api/start/route.ts
export const runtime = 'nodejs'; // avoid Edge body/crypto quirks

import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { createClient } from '@supabase/supabase-js';

function supaAdmin() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

async function startImpl(passcodeProvided?: string) {
  const expected = String(
    process.env.NEXT_PUBLIC_START_PASSCODE ?? process.env.START_PASSCODE ?? ''
  ).trim();
  if (!expected) return NextResponse.json({ error: 'Passcode not configured on server' }, { status: 500 });

  const provided = String(passcodeProvided ?? '').trim();
  if (provided !== expected) return NextResponse.json({ error: 'Unauthorized: bad passcode' }, { status: 401 });

  const supa = supaAdmin();
  const schoolId = process.env.DEFAULT_SCHOOL_ID || null;
  const token = randomBytes(6).toString('hex');

  const { data, error } = await supa
    .from('sessions')
    .insert([{ token, school_id: schoolId, status: 'active', item_index: 0 }])
    .select('token')
    .single();

  if (error) return NextResponse.json({ error: `DB error: ${error.message}` }, { status: 500 });
  return NextResponse.json({ token: data.token, link: `/t/${data.token}` });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  return startImpl(searchParams.get('passcode') || undefined);
}

export async function POST(req: Request) {
  let body: any = {};
  try { body = await req.json(); } catch {}
  return startImpl(body?.passcode);
}
