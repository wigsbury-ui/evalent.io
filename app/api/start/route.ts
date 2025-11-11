// app/api/start/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supaAdmin } from '@/app/lib/supabase';
import { loadBlueprints } from '@/app/lib/sheets';
import crypto from 'node:crypto';

export async function GET(req: NextRequest) {
  try {
    const passcode = req.nextUrl.searchParams.get('passcode') ?? '';
    const required = process.env.NEXT_PUBLIC_START_PASSCODE ?? '';
    if (!required || passcode !== required) {
      return NextResponse.json({ ok: false, error: 'bad_passcode' }, { status: 401 });
    }

    const programme = (req.nextUrl.searchParams.get('programme') ?? '').trim();
    const grade = (req.nextUrl.searchParams.get('grade') ?? '').trim();
    const mode = (req.nextUrl.searchParams.get('mode') ?? 'core').trim().toLowerCase(); // 'core' default

    if (!programme || !grade) {
      return NextResponse.json(
        { ok: false, error: 'missing_programme_or_grade' },
        { status: 400 }
      );
    }

    // Load blueprints CSV (case-insensitive header support)
    const rows: Record<string, any>[] = await loadBlueprints();

    // helper: case-insensitive get
    const getField = (row: Record<string, any>, name: string) => {
      const key = Object.keys(row).find(k => k.toLowerCase() === name.toLowerCase());
      return key ? row[key] : undefined;
    };

    // filter for this programme+grade
    const filtered = rows.filter(r =>
      String(getField(r, 'programme') ?? '').trim().toLowerCase() === programme.toLowerCase() &&
      String(getField(r, 'grade') ?? '').trim() === String(grade)
    );

    if (!filtered.length) {
      return NextResponse.json(
        { ok: false, error: 'no_blueprint_rows_for_programme_grade' },
        { status: 404 }
      );
    }

    // Build countsBySubject from <mode>_count (e.g., 'core_count')
    const countKey = `${mode}_count`.toLowerCase();
    const countsBySubject: Record<string, number> = {};

    for (const r of filtered) {
      // subject header can be 'subject' or 'Subject' etc.
      const subject = String(getField(r, 'subject') ?? '').trim();
      // find count with case-insensitive key
      const count =
        Number(
          (() => {
            const key = Object.keys(r).find(k => k.toLowerCase() === countKey);
            return key ? r[key] : 0;
          })()
        ) || 0;

      if (subject && Number.isFinite(count) && count > 0) {
        countsBySubject[subject] = count;
      }
    }

    if (!Object.keys(countsBySubject).length) {
      return NextResponse.json(
        { ok: false, error: `blueprint_has_no_positive_counts_for_mode_${mode}` },
        { status: 400 }
      );
    }

    const schoolId = process.env.DEFAULT_SCHOOL_ID ?? null;
    const token = crypto.randomUUID();

    const db = supaAdmin();
    const { error: insErr } = await db
      .from('sessions')
      .insert({
        token,
        status: 'active',
        item_index: 0,
        school_id: schoolId,
        // persist plan so /api/next-item can use it
        plan: {
          programme,
          grade,
          mode,
          countsBySubject,
        },
      });

    if (insErr) {
      return NextResponse.json({ ok: false, error: insErr.message }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      token,
      plan: { programme, grade, mode, countsBySubject },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'start_failed' }, { status: 500 });
  }
}
