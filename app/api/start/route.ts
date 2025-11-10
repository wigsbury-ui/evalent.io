// app/api/start/route.ts
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

function envOrThrow(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

const PASSCODE =
  process.env.NEXT_PUBLIC_START_PASSCODE ||
  process.env.START_PASSCODE ||
  'letmein';

const SUPABASE_URL = envOrThrow('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = envOrThrow('SUPABASE_SERVICE_ROLE_KEY');
const DEFAULT_SCHOOL_ID = envOrThrow('DEFAULT_SCHOOL_ID');

const supa = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function createSession() {
  // 12-hex token like "f3beec6a970a"
  const token = crypto.randomBytes(6).toString('hex');
  // Insert minimal fields your schema expects
  const { error } = await supa.from('sessions').insert([
    {
      token,
      status: 'active',
      item_index: 0,
      school_id: DEFAULT_SCHOOL_ID,
    },
  ]);
  if (error) throw error;
  return token;
}

function bad(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

async function handle(passcode: string | null) {
  if (!passcode) return bad('Missing passcode');
  if (passcode !== PASSCODE) return bad('Invalid passcode', 401);
  const token = await createSession();
  return NextResponse.json({ ok: true, token, href: `/t/${token}` });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));
    return await handle(body?.passcode ?? null);
  } catch (e: any) {
    return bad(e?.message ?? 'Unknown error', 500);
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const passcode = url.searchParams.get('passcode');
    return await handle(passcode);
  } catch (e: any) {
    return bad(e?.message ?? 'Unknown error', 500);
  }
}
