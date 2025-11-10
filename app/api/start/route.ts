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
  const token = crypto.randomBytes(6).toString('hex');

  // Insert only columns that exist & have sane defaults elsewhere.
  const { error } = await supa.from('sessions').insert([
    {
      token,
      status: 'active',
      item_index: 0,
      school_id: DEFAULT_SCHOOL_ID,
    },
  ]);

  if (error) {
    // Log to Vercel function logs, and return useful details to client
    console.error('[start/createSession] Supabase insert error:', error);
    const msg = error.message || 'insert failed';
    // Pass back explicit error info
    throw new Error(`DB: ${msg}`);
  }

  return token;
}

function j(ok: boolean, extra: Record<string, any> = {}, status = 200) {
  return NextResponse.json({ ok, ...extra }, { status });
}

async function handle(passcode: string | null) {
  if (!passcode) return j(false, { error: 'Missing passcode' }, 400);
  if (passcode !== PASSCODE) return j(false, { error: 'Invalid passcode' }, 401);

  const token = await createSession();
  return j(true, { token, href: `/t/${token}` });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const pass = body?.passcode ?? null;
    return await handle(pass);
  } catch (e: any) {
    console.error('[start/POST] error:', e);
    return j(false, { error: String(e?.message || e) }, 500);
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const pass = url.searchParams.get('passcode');
    return await handle(pass);
  } catch (e: any) {
    console.error('[start/GET] error:', e);
    return j(false, { error: String(e?.message || e) }, 500);
  }
}
