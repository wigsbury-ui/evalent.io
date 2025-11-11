// app/api/start/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supaAdmin } from '@/app/lib/supa';
import { loadBlueprints } from '@/app/lib/sheets';

type Mode = 'easy' | 'core' | 'hard';

const normalize = (s: string) =>
  String(s ?? '')
    .replace(/\uFEFF/g, '')   // strip BOM
    .replace(/\u00A0/g, ' ')  // strip nbsp
    .trim()
    .toLowerCase();

const pickCountKey = (mode: Mode) =>
  (mode === 'easy' ? 'easy_count' : mode === 'hard' ? 'hard_count' : 'core_count') as
    | 'easy_count'
    | 'core_count'
    | 'hard_count';

function makeToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function GET(req: NextRequest) {
  try {
    const url = req.nextUrl;
    const passcode = url.searchParams.get('passcode') ?? '';
    const programme = (url.searchParams.get('programme') ?? '').trim();
    const grade = (url.searchParams.get('grade') ?? '').trim();
    const mode = ((url.searchParams.get('mode') ?? 'core').trim().toLowerCase() ||
      'core') as Mode;

    const required = process.env.NEXT_PUBLIC_START_PASSCODE || 'letmein';
    if (!passcode || passcode !== required) {
      return NextResponse.json({ ok: false, error: 'bad_passcode' }, { status: 401 });
    }
    if (!programme || !grade) {
      return NextResponse.json(
        { ok: false, error: 'missing_programme_or_grade' },
        { status: 400 },
      );
    }

    // Load blueprints (CSV defined by SHEETS_BLUEPRINTS_CSV)
    const bp = (await loadBlueprints()) as Record<string, any>[];
    const modeKeyWanted = pickCountKey(mode);

    // Keys may come with stray casing/spacing/BOM; resolve them per row.
    const filtered = bp.filter((row) => {
      const keys = Object.keys(row);

      const programmeKey =
        keys.find((k) => normalize(k) === 'programme') ??
        keys.find((k) => normalize(k) === 'program'); // just in case

      const gradeKey = keys.find((k) => normalize(k) === 'grade');

      const p = programmeKey ? String(row[programmeKey]).trim().toLowerCase() : '';
      const g = gradeKey ? String(row[gradeKey]).trim() : '';

      return p === programme.toLowerCase() && g === grade;
    });

    // Build countsBySubject from blueprint rows, supporting both schemas:
    // (A) subject + [easy_count|core_count|hard_count]
    // (B) domains + total (treated as the active mode's count)
    const countsBySubject: Record<string, number> = {};

    for (const row of filtered) {
      const keys = Object.keys(row);

      // subject key can be 'subject' OR 'domains'
      const subjectKey =
        keys.find((k) => normalize(k) === 'subject') ??
        keys.find((k) => normalize(k) === 'domains');

      const subject = subjectKey ? String(row[subjectKey]).trim() : '';
      if (!subject) continue;

      // preferred: "<mode>_count"; fallback: "total"
      const modeCountKey = keys.find((k) => normalize(k) === normalize(modeKeyWanted));
      const totalKey = keys.find((k) => normalize(k) === 'total');

      const raw = modeCountKey
        ? row[modeCountKey]
        : totalKey
        ? row[totalKey]
        : undefined;

      // coerce numeric: strip non-numeric (keeps dot/minus)
      const n = Number(String(raw ?? '').replace(/[^0-9.\-]/g, ''));
      if (Number.isFinite(n) && n > 0) countsBySubject[subject] = n;
    }

    if (!Object.values(countsBySubject).some((v) => v > 0)) {
      return NextResponse.json(
        { ok: false, error: `blueprint_has_no_positive_counts_for_mode_${mode}` },
        { status: 400 },
      );
    }

    // Create a session
    const token = makeToken();
    const plan = { programme, grade, mode, countsBySubject };

    const db = supaAdmin();
    const { error: sErr } = await db.from('sessions').insert({
      token,
      status: 'active',
      item_index: 0,
      plan,
      meta: {},
    });

    if (sErr) {
      return NextResponse.json(
        { ok: false, error: 'session_insert_failed', detail: sErr.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, token });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: 'start_exception', detail: e?.message ?? String(e) },
      { status: 500 },
    );
  }
}
