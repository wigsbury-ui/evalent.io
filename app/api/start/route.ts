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
    const mode = (req.nextUrl.searchParams.get('mode') ?? 'core').trim().toLowerCase();

    if (!programme || !grade) {
      return NextResponse.json(
        { ok: false, error: 'missing_programme_or_grade' },
        { status: 400 }
      );
    }

    const rows: Record<string, any>[] = await loadBlueprints();

    // helpers: case-insensitive, TRIMMED key/field access
    const findKeyCI = (obj: Record<string, any>, target: string) =>
      Object.keys(obj).find(
        (k) => k.trim().toLowerCase() === target.trim().toLowerCase()
      );
    const getField = (row: Record<string, any>, name: string) => {
      const key = findKeyCI(row, name);
      return key ? row[key] : undefined;
    };

    const filtered = rows.filter(
      (r) =>
        String(getField(r, 'programme') ?? '').trim().toLowerCase() ===
          programme.toLowerCase() &&
        String(getField(r, 'grade') ?? '').trim() === String(grade).trim()
    );

    if (!filtered.length) {
      return NextResponse.json(
        { ok: false, error: 'no_blueprint_rows_for_programme_grade' },
        { status: 404 }
      );
    }

    const countKey = `${mode}_count`;
    const countsBySubject: Record<string, number> = {};

    for (const r of filtered) {
      const subject = String(getField(r, 'subject') ?? '').trim();
      const key = findKeyCI(r, countKey); // <— TRIMMED header match
      const raw = key ? r[key] : 0;

      // Be tolerant of CSV formatting: strip non-numeric except dot/minus
      const n = Number(String(raw).replace(/[^0-9.\-]/g, ''));
      if (subject && Number.isFinite(n) && n > 0) countsBySubject[subject] = n;
    }

    if (!Object.keys(countsBySubject).length) {
      return NextResponse.json(
        { ok: false, error: `blueprint_has_no_positive_counts_for_mode_${mode}` },
        { status: 400 }
      );
    }

    const token = crypto.randomUUID();
    const schoolId = process.env.DEFAULT_SCHOOL_ID ?? null;

    const db = supaAdmin();
    const { error: insErr } = await db.from('sessions').insert({
      token,
      status: 'active',
      item_index: 0,
      school_id: schoolId,
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

// Build countsBySubject from blueprint rows, supporting both schemas:
// (A) subject + [easy_count|core_count|hard_count]
// (B) domains + total (treated as the active mode's count)
//
// Also normalizes headers (lowercase, trims, strips BOM/nbsp)
const normalize = (s: string) =>
  String(s ?? '')
    .replace(/\uFEFF/g, '')
    .replace(/\u00A0/g, ' ')
    .trim()
    .toLowerCase();

const countsBySubject: Record<string, number> = {};

for (const row of filtered) {
  // find a subject-like column
  const subjectKey =
    Object.keys(row).find(k => normalize(k) === 'subject') ??
    Object.keys(row).find(k => normalize(k) === 'domains'); // fallback

  const subject = String(subjectKey ? row[subjectKey] : '').trim();
  if (!subject) continue;

  // find the numeric count: prefer "<mode>_count"; else "total"
  const modeKey = Object.keys(row).find(k => normalize(k) === `${mode}_count`);
  const totalKey = Object.keys(row).find(k => normalize(k) === 'total');

  const raw = modeKey ? row[modeKey] : totalKey ? row[totalKey] : undefined;
  const n = Number(String(raw ?? '').replace(/[^0-9.\-]/g, ''));

  if (Number.isFinite(n) && n > 0) countsBySubject[subject] = n;
}

if (!Object.values(countsBySubject).some(v => v > 0)) {
  return NextResponse.json(
    { ok: false, error: `blueprint_has_no_positive_counts_for_mode_${mode}` },
    { status: 400 }
  );
}
