// app/api/start/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supaAdmin } from '@/app/lib/supa';
import { loadBlueprints } from '@/app/lib/sheets';
import { randomUUID } from 'crypto';

type CountsBySubject = Record<string, number>;

const norm = (v: any) =>
  String(v ?? '')
    .replace(/\uFEFF/g, '')   // BOM
    .replace(/\u00A0/g, ' ')   // nbsp
    .trim()
    .toLowerCase();

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;

    const passcode = sp.get('passcode') ?? '';
    const programme = sp.get('programme') ?? '';
    const grade = sp.get('grade') ?? '';
    const mode = (sp.get('mode') ?? 'core').toLowerCase();

    if (!programme || !grade) {
      return NextResponse.json(
        { ok: false, error: 'missing_programme_or_grade' },
        { status: 400 }
      );
    }

    const expected =
      process.env.NEXT_PUBLIC_START_PASSCODE ?? process.env.START_PASSCODE ?? '';
    if (!expected || passcode !== expected) {
      return NextResponse.json(
        { ok: false, error: 'invalid_passcode' },
        { status: 401 }
      );
    }

    // --------- Load & filter blueprint rows ---------
    const bps = await loadBlueprints();
    const rows = (bps as any[]).filter(
      (r) =>
        norm(r.programme) === norm(programme) &&
        String(r.grade ?? '').trim() === String(grade).trim()
    );

    // --------- Build counts map (supports both schemas) ---------
    const countsBySubject: CountsBySubject = {};

    for (const row of rows) {
      // subject: either "subject" (old) or "domains" (new)
      const subjectKey =
        Object.keys(row).find((k) => norm(k) === 'subject') ??
        Object.keys(row).find((k) => norm(k) === 'domains');

      const subject = String(subjectKey ? row[subjectKey] : '').trim();
      if (!subject) continue;

      // count: either "<mode>_count" (old) or "total" (new)
      const modeKey = Object.keys(row).find((k) => norm(k) === `${mode}_count`);
      const totalKey = Object.keys(row).find((k) => norm(k) === 'total');

      const raw = modeKey ? row[modeKey] : totalKey ? row[totalKey] : undefined;
      const n = Number(String(raw ?? '').replace(/[^0-9.\-]/g, ''));

      if (Number.isFinite(n) && n > 0) countsBySubject[subject] = n;
    }

    if (!Object.values(countsBySubject).some((v) => v > 0)) {
      return NextResponse.json(
        { ok: false, error: `blueprint_has_no_positive_counts_for_mode_${mode}` },
        { status: 400 }
      );
    }

    // --------- Create a session in Supabase ---------
    const token = randomUUID().replace(/-/g, '').slice(0, 24);
    const plan = {
      programme,
      grade,
      mode,
      countsBySubject,
    };

    const db = supaAdmin(); // NOTE: call the function to get the client
    const { error: insErr } = await db.from('sessions').insert({
      token,
      item_index: 0,
      status: 'active',
      plan,
      meta: { programme, grade, mode },
    } as any);

    if (insErr) {
      return NextResponse.json(
        { ok: false, error: `db_insert_failed:${insErr.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, token, plan });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: `start_route_exception:${e?.message ?? e}` },
      { status: 500 }
    );
  }
}
