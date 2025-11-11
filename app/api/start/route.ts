import { NextRequest, NextResponse } from 'next/server';
import { supaAdmin } from '@/app/lib/supa';
import { loadBlueprints } from '@/app/lib/sheets';

export const dynamic = 'force-dynamic';

type Counts = Record<string, number>;

function norm(s: unknown): string {
  return String(s ?? '')
    .replace(/\uFEFF/g, '')      // BOM
    .replace(/\u00A0/g, ' ')     // nbsp
    .trim()
    .toLowerCase();
}

function safeNum(v: unknown): number {
  const n = Number(String(v ?? '').replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

async function createSession(passcode: string, programme: string, grade: string, mode: string) {
  // simple passcode check
  const required =
    process.env.NEXT_PUBLIC_START_PASSCODE ||
    process.env.START_PASSCODE ||
    '';
  if (required && passcode !== required) {
    return NextResponse.json({ ok: false, error: 'bad_passcode' }, { status: 401 });
  }

  // load blueprints CSV
  const all = await loadBlueprints();

  // filter for programme+grade
  const rows = all.filter((r: Record<string, unknown>) => {
    const p = norm((r as any)['programme']);
    const g = String((r as any)['grade'] ?? '').trim();
    return p === norm(programme) && g === String(grade);
  });

  // build countsBySubject (supports either schema)
  const countsBySubject: Counts = {};
  for (const r of rows as Record<string, unknown>[]) {
    // subject header can be "subject" or "domains"
    const subjectKey =
      Object.keys(r).find(k => norm(k) === 'subject') ??
      Object.keys(r).find(k => norm(k) === 'domains');

    const subject = String(subjectKey ? (r as any)[subjectKey] : '').trim();
    if (!subject) continue;

    // prefer "<mode>_count" else "total"
    const modeKey = Object.keys(r).find(k => norm(k) === `${mode}_count`);
    const totalKey = Object.keys(r).find(k => norm(k) === 'total');

    const raw = modeKey ? (r as any)[modeKey] : totalKey ? (r as any)[totalKey] : undefined;
    const n = safeNum(raw);
    if (n > 0) countsBySubject[subject] = n;
  }

  if (!Object.values(countsBySubject).some(v => v > 0)) {
    return NextResponse.json(
      { ok: false, error: `blueprint_has_no_positive_counts_for_mode_${mode}` },
      { status: 400 }
    );
  }

  // create session in DB
  const token = crypto.randomUUID();
  const db = supaAdmin();
  const { error } = await db
    .from('sessions' as any)
    .insert({
      token,
      status: 'active',
      item_index: 0,
      plan: { mode, counts: countsBySubject },
      meta: { programme, grade, mode },
    } as any);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message || 'db_insert_failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, token });
}

function readParams(req: NextRequest) {
  const url = req.nextUrl;
  const passcode = url.searchParams.get('passcode') ?? '';
  const programme = url.searchParams.get('programme') ?? '';
  const grade = url.searchParams.get('grade') ?? '';
  const mode = (url.searchParams.get('mode') ?? 'core').toLowerCase();
  return { passcode, programme, grade, mode };
}

// GET support (useful for query-string starts)
export async function GET(req: NextRequest) {
  const { passcode, programme, grade, mode } = readParams(req);
  return createSession(passcode, programme, grade, mode);
}

// POST support (what the UI uses)
export async function POST(req: NextRequest) {
  // prefer body, but also allow query-string
  let passcode = '';
  let programme = '';
  let grade = '';
  let mode = 'core';

  try {
    const ct = req.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      const body = (await req.json()) as any;
      passcode = body?.passcode ?? '';
      programme = body?.programme ?? '';
      grade = body?.grade ?? '';
      mode = (body?.mode ?? 'core').toLowerCase();
    } else if (ct.includes('application/x-www-form-urlencoded')) {
      const fd = await req.formData();
      passcode = String(fd.get('passcode') ?? '');
      programme = String(fd.get('programme') ?? '');
      grade = String(fd.get('grade') ?? '');
      mode = String(fd.get('mode') ?? 'core').toLowerCase();
    }
  } catch {
    // fall through to query parsing
  }

  if (!programme || !grade) {
    const q = readParams(req);
    passcode ||= q.passcode;
    programme ||= q.programme;
    grade ||= q.grade;
    mode ||= q.mode;
  }

  return createSession(passcode, programme, grade, mode);
}
