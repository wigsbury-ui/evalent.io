// app/api/start-session/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const SESSION_COOKIE = 'evalent_session_id';

export async function POST(req: NextRequest) {
  const supabase: any = supabaseAdmin;

  // Optional: allow programme/grade in body, but don’t depend on them
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const schoolId = process.env.DEFAULT_SCHOOL_ID || null;

  const insertPayload: any = {
    item_index: 0,          // *** THIS IS THE IMPORTANT PART ***
  };

  if (schoolId) insertPayload.school_id = schoolId;
  if (body.programme) insertPayload.programme = body.programme;
  if (body.grade) insertPayload.grade = body.grade;

  const { data, error } = await supabase
    .from('sessions')
    .insert(insertPayload)
    .select('id, item_index')
    .single();

  if (error || !data) {
    return NextResponse.json(
      { ok: false, error: error?.message || 'Failed to create session' },
      { status: 500 }
    );
  }

  const res = NextResponse.json({
    ok: true,
    sessionId: data.id,
  });

  // Set a cookie so /api/next-item can find the session automatically
  res.cookies.set(SESSION_COOKIE, data.id, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60, // 1 hour
  });

  return res;
}
