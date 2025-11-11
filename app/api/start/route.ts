// app/api/start/route.ts
import { NextResponse } from 'next/server';
import { db } from '../../../lib/db'; // present for compatibility if you later persist sessions
import { loadBlueprints } from '../../../lib/loaders';

type Counts = Record<string, number>;

const clean = (s: string) =>
  String(s ?? '')
    .replace(/\uFEFF/g, '')
    .replace(/\u00A0/g, ' ')
    .trim();

const lower = (s: string) => clean(s).toLowerCase();

function safeNum(v: any): number {
  const n = Number(String(v ?? '').replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

/**
 * Build countsBySubject from blueprint rows, supporting both schemas:
 *  A) columns: programme, grade, subject, easy_count|core_count|hard_count
 *  B) columns: programme, grade, domains, total   (treat total as the <mode> count)
 */
function buildCounts(rows: Record<string, string>[], programme: string, grade: string, mode: string): Counts {
  const filtered = rows.filter(
    (r) =>
      lower(r['programme']) === lower(programme) &&
      clean(r['grade']) === clean(grade)
  );

  const counts: Counts = {};

  for (const r of filtered) {
    // subject name can be under 'subject' or 'domains'
    const subject =
      clean(r['subject']) ||
      clean(r['domains']) ||
      '';

    if (!subject) continue;

    // prefer "<mode>_count"
    const modeKey = `${lower(mode)}_count`;
    let n = 0;

    if (r.hasOwnProperty(modeKey)) {
      n = safeNum(r[modeKey]);
    } else if (r.hasOwnProperty('total')) {
      // fallback schema: domains + total
      n = safeNum(r['total']);
    }

    if (n > 0) counts[subject] = n;
  }

  return counts;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const programme = String(body?.programme ?? '').trim();
    const grade = String(body?.grade ?? '').trim();
    const mode = String(body?.mode ?? 'core').trim().toLowerCase();

    if (!programme || !grade) {
      return NextResponse.json(
        { ok: false, error: 'missing_programme_or_grade' },
        { status: 400 }
      );
    }

    const blueprints = await loadBlueprints();
    if (!blueprints.length) {
      return NextResponse.json(
        { ok: false, error: 'no_blueprints_loaded_from_csv' },
        { status: 400 }
      );
    }

    const countsBySubject = buildCounts(blueprints, programme, grade, mode);

    if (!Object.values(countsBySubject).some((v) => v > 0)) {
      return NextResponse.json(
        { ok: false, error: `blueprint_has_no_positive_counts_for_mode_${mode}` },
        { status: 400 }
      );
    }

    // Generate a lightweight token so the UI can proceed; you can persist if desired.
    const token = [
      'T',
      Date.now().toString(36),
      Math.random().toString(36).slice(2, 8),
    ].join('_');

    // If you later want to persist, uncomment and ensure the table exists:
    // await db.from('sessions').insert({
    //   token,
    //   item_index: 0,
    //   status: 'active',
    //   plan: { programme, grade, mode, countsBySubject },
    // });

    return NextResponse.json({
      ok: true,
      token,
      plan: { programme, grade, mode, countsBySubject },
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || 'start_route_unexpected_error' },
      { status: 500 }
    );
  }
}

// GET → 405 (clarifies the /start endpoint is POST-only)
export async function GET() {
  return NextResponse.json({ ok: false, error: 'method_not_allowed' }, { status: 405 });
}
