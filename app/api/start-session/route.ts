// app/api/start-session/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

type StartSessionBody = {
  studentName: string;
  year: string;       // e.g. "Y4"
  passcode: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<StartSessionBody>;
    const studentName = body.studentName?.trim();
    const year = body.year?.trim();
    const passcode = body.passcode?.trim();

    if (!studentName || !year || !passcode) {
      return NextResponse.json(
        { ok: false, error: 'Missing studentName, year, or passcode' },
        { status: 400 }
      );
    }

    const schoolId = process.env.DEFAULT_SCHOOL_ID;
    if (!schoolId) {
      return NextResponse.json(
        { ok: false, error: 'DEFAULT_SCHOOL_ID is not configured on the server' },
        { status: 500 }
      );
    }

    // Insert a new row into the sessions table.
    // Adjust column names if yours differ, but keep the shape of the returned JSON:
    // { ok: true, session: { id: ... } }
    const { data, error } = await supabaseAdmin
      .from('sessions')
      .insert({
        student_name: studentName,
        year,              // assuming a "year" column storing "Y3", "Y4", etc.
        passcode,
        school_id: schoolId,
        status: 'in_progress',
      })
      .select('*')
      .single();

    if (error || !data) {
      console.error('start-session insert error', error);
      return NextResponse.json(
        { ok: false, error: 'Failed to create session in database' },
        { status: 500 }
      );
    }

    // THIS is what your frontend expects: data.session.id
    return NextResponse.json({
      ok: true,
      session: data,
    });
  } catch (err: any) {
    console.error('start-session unexpected error', err);
    return NextResponse.json(
      { ok: false, error: 'Unexpected error starting session' },
      { status: 500 }
    );
  }
}
