// app/api/start-session/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const START_PASSCODE =
  process.env.NEXT_PUBLIC_START_PASSCODE ||
  process.env.START_PASSCODE ||
  'letmein';

export const dynamic = 'force-dynamic';

type StartBody = {
  candidate_name?: string;
  studentName?: string;
  year?: string;
  passcode?: string;
};

export async function POST(req: NextRequest) {
  let body: StartBody | null = null;

  try {
    body = (await req.json()) as StartBody;
  } catch {
    // If parsing fails, we'll treat it as "missing fields"
  }

  const candidateName =
    body?.candidate_name?.trim() ||
    body?.studentName?.trim() ||
    '';

  const year = body?.year?.trim() || '';
  const passcode = body?.passcode?.trim() || '';

  if (!candidateName || !year || !passcode) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Missing studentName, year, or passcode',
      },
      { status: 400 },
    );
  }

  if (START_PASSCODE && passcode !== START_PASSCODE) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Invalid passcode',
      },
      { status: 403 },
    );
  }

  const { data, error } = await supabaseAdmin
    .from('sessions')
    .insert({
      candidate_name: candidateName,
      year,
      item_index: 0,
    })
    .select('*')
    .single();

  if (error || !data) {
    console.error('start-session insert error', error);
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || 'Failed to create session',
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    sessionId: data.id,
    session: data,
  });
}
