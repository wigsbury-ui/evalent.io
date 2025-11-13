// app/api/start-session/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { env } from '@/lib/env';

type StartBody = {
  candidate_name?: string;
  year?: string;
  passcode?: string;
};

export async function POST(req: Request) {
  let body: StartBody | null = null;
  try {
    body = (await req.json()) as StartBody;
  } catch {
    body = null;
  }

  const candidate_name = body?.candidate_name?.trim();
  const year = body?.year?.trim();
  const passcode = body?.passcode?.trim();

  if (!candidate_name || !year) {
    return new Response('candidate_name and year required', { status: 400 });
  }

  // Optional passcode gate
  if (env.NEXT_PUBLIC_START_PASSCODE) {
    if (passcode !== env.NEXT_PUBLIC_START_PASSCODE) {
      return new Response('Invalid passcode', { status: 401 });
    }
  }

  if (!env.DEFAULT_SCHOOL_ID) {
    return new Response('DEFAULT_SCHOOL_ID not configured', { status: 500 });
  }

  const { data, error } = await supabaseAdmin
    .from('sessions')
    .insert([
      {
        school_id: env.DEFAULT_SCHOOL_ID,
        year,
        candidate_name,
      },
    ])
    .select('*')
    .single();

  if (error || !data) {
    return new Response(error?.message ?? 'Failed to create session', {
      status: 500,
    });
  }

  // `sid` for backwards compatibility with the older /start client;
  // `session` for the new /test/[sessionId] flow.
  return NextResponse.json({
    ok: true,
    sid: data.id,
    session: data,
  });
}
