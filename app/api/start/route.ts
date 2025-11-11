// app/api/start/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getEnv } from '@/lib/env';
import { loadBlueprintRows } from '@/lib/sheets'; // if you have a sheets helper; otherwise inline fetch below

const PASSCODE = process.env.START_PASSCODE || 'letmein';

// ✅ read YOUR key; keep backwards-compat with the old name
const BLUEPRINTS_CSV_URL =
  getEnv('SHEETS_BLUEPRINTS_CSV') || getEnv('BLUEPRINTS_CSV_URL');

function fail(msg: string, detail?: string, status = 400) {
  return NextResponse.json(
    { ok: false, error: msg, detail },
    { status }
  );
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const pass = url.searchParams.get('passcode') || '';
    const programme = (url.searchParams.get('programme') || '').trim();
    const grade = (url.searchParams.get('grade') || '').trim();
    const mode = (url.searchParams.get('mode') || 'core').trim().toLowerCase();

    if (pass !== PASSCODE) return fail('bad_passcode');
    if (!programme || !grade) return fail('missing_programme_or_grade');

    // --- load blueprint
    if (!BLUEPRINTS_CSV_URL) {
      return fail(
        'start_failed',
        'missing_SHEETS_BLUEPRINTS_CSV (or BLUEPRINTS_CSV_URL)'
      );
    }

    // fetch CSV
    const res = await fetch(BLUEPRINTS_CSV_URL, { cache: 'no-store' });
    if (!res.ok) return fail('start_failed', `csv_fetch_${res.status}`);

    const csv = await res.text();

    // very light CSV parse (first line headers, comma-separated)
    const [head, ...lines] = csv.trim().split(/\r?\n/);
    const headers = head.split(',').map(h =>
      h.replace(/\uFEFF/g, '').replace(/\u00A0/g, ' ').trim().toLowerCase()
    );

    const rows = lines.map(line => {
      const cols = line.split(',');
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => (obj[h] = (cols[i] ?? '').trim()));
      return obj;
    });

    // filter to programme+grade
    const filtered = rows.filter(
      r =>
        String(r.programme || '').toLowerCase() === programme.toLowerCase() &&
        String(r.grade || r.year || '') === grade
    );

    // build countsBySubject supporting either:
    // (A) subject + {easy_count|core_count|hard_count}
    // (B) domains + total
    const countsBySubject: Record<string, number> = {};
    for (const r of filtered) {
      const subject =
        (r.subject ?? r.domains ?? '').toString().trim();
      if (!subject) continue;

      const raw =
        r[`${mode}_count`] ??
        r.total ??
        '';

      const n = Number(String(raw).replace(/[^0-9.\-]/g, ''));
      if (Number.isFinite(n) && n > 0) countsBySubject[subject] = n;
    }

    if (!Object.values(countsBySubject).some(v => v > 0)) {
      return fail(
        `blueprint_has_no_positive_counts_for_mode_${mode}`,
        JSON.stringify({ programme, grade, mode, headers })
      );
    }

    // create a session
    const plan = {
      programme,
      grade,
      mode,
      subjects: countsBySubject,
    };

    const token = Math.random().toString(36).slice(2) + Date.now().toString(36);

    const { error } = await db
      .from('sessions')
      .insert({
        token,
        status: 'active',      // <- satisfies CHECK constraint
        item_index: 0,
        plan,
      } as any);

    if (error) return fail('db_insert_failed', error.message, 500);

    return NextResponse.json({ ok: true, token });
  } catch (e: any) {
    return fail('start_failed', String(e?.message || e), 500);
  }
}
