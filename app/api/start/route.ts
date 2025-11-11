// app/api/start/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { loadBlueprints } from '@/app/lib/sheets';
import { supaAdmin } from '@/app/lib/supa';

export const dynamic = 'force-dynamic';

function norm(s: any): string {
  return String(s ?? '')
    .replace(/\uFEFF/g, '')
    .replace(/\u00A0/g, ' ')
    .trim()
    .toLowerCase();
}
function safeNum(v: any): number {
  const n = Number(String(v ?? '').replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

type StartParams = {
  passcode?: string;
  programme?: string;
  grade?: string;
  mode?: string; // easy|core|hard
};

async function doStart(params: StartParams) {
  const PASS = process.env.NEXT_PUBLIC_START_PASSCODE || 'letmein';

  const programme = (params.programme ?? 'UK').trim();
  const grade = (params.grade ?? '').trim();
  const mode = (params.mode ?? 'core').trim().toLowerCase();

  if (!programme || !grade) {
    return NextResponse.json(
      { ok: false, error: 'missing_programme_or_grade' },
      { status: 400 }
    );
  }
  if ((params.passcode || '').trim() !== PASS) {
    return NextResponse.json({ ok: false, error: 'bad_passcode' }, { status: 401 });
  }

  // 1) Load blueprints and filter by programme + grade
  const blueprints = await loadBlueprints(); // rows: Record<string,any>[]
  const filtered = blueprints.filter(r =>
    norm(r.programme) === norm(programme) && String(r.grade ?? '').trim() === grade
  );

  // 2) Build countsBySubject with BOTH schemas supported
  const countsBySubject: Record<string, number> = {};
  for (const r of filtered) {
    // subject can be "subject" (old) or "domains" (new)
    const subjectKey =
      Object.keys(r).find(k => norm(k) === 'subject') ??
      Object.keys(r).find(k => norm(k) === 'domains');

    if (!subjectKey) continue;
    const subject = String(r[subjectKey] ?? '').trim();
    if (!subject) continue;

    // count can be "<mode>_count" (old) or "total" (new)
    const modeKey = Object.keys(r).find(k => norm(k) === `${mode}_count`);
    const totalKey = Object.keys(r).find(k => norm(k) === 'total');
    const raw = modeKey ? r[modeKey] : totalKey ? r[totalKey] : undefined;

    const n = safeNum(raw);
    if (n > 0) countsBySubject[subject] = n;
  }

  if (!Object.values(countsBySubject).some(v => v > 0)) {
    return NextResponse.json(
      { ok: false, error: `blueprint_has_no_positive_counts_for_mode_${mode}` },
      { status: 400 }
    );
  }

  // 3) Create session
  const token = crypto.randomUUID().replace(/-/g, '');
  const db = supaAdmin();
  const { error } = await db
    .from('sessions')
    .insert([
      {
        token,
        item_index: 0,
        status: 'active',
        plan: { programme, grade, mode, countsBySubject },
        meta: { programme, grade, mode },
      },
    ]);

  if (error) {
    return NextResponse.json({ ok: false, error: String(error.message || error) }, { status: 500 });
  }

  return NextResponse.json({ ok: true, token, plan: { programme, grade, mode, countsBySubject } });
}

// Accept GET (querystring) …
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const params: StartParams = {
    passcode: url.searchParams.get('passcode') ?? undefined,
    programme: url.searchParams.get('programme') ?? undefined,
    grade: url.searchParams.get('grade') ?? undefined,
    mode: url.searchParams.get('mode') ?? undefined,
  };
  return doStart(params);
}

// …and POST (JSON body) to avoid 405 from the Start page
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as StartParams;
  return doStart(body);
}
