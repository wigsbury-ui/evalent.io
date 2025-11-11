import { NextRequest, NextResponse } from 'next/server';

// Your existing GET implementation should already exist.
// We'll factor the handler so GET and POST can both call it.

async function handleStart(params: URLSearchParams) {
  // >>> call the same logic you use inside GET right now <<<
  // i.e., read programme/grade/mode/passcode from params,
  // load blueprints/items/assets, build counts, create session, return JSON.
}

// KEEP your GET as-is, or adapt it to call handleStart
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  return handleStart(url.searchParams);
}

// NEW: accept JSON { passcode, programme, grade, mode }
export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const body = await req.json().catch(() => ({} as any));

  const params = new URLSearchParams(url.searchParams);
  if (body.passcode) params.set('passcode', String(body.passcode));
  if (body.programme) params.set('programme', String(body.programme));
  if (body.grade) params.set('grade', String(body.grade));
  if (body.mode) params.set('mode', String(body.mode));

  return handleStart(params);
}
