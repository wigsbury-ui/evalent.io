// app/api/start/route.ts
import { NextResponse } from 'next/server';
import { loadBlueprints } from '@/lib/sheets';
import { supaAdmin } from '@/lib/supa';

type StartPayload = {
  passcode?: string;
  programme?: string;
  grade?: string | number;
  mode?: 'easy' | 'core' | 'hard';
};

const norm = (s: any) =>
  String(s ?? '')
    .replace(/\uFEFF/g, '')
    .replace(/\u00A0/g, ' ')
    .trim()
    .toLowerCase();

const numeric = (v: any) => {
  const n = Number(String(v ?? '').replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? n : NaN;
};

async function readParams(req: Request): Promise<Required<StartPayload>> {
  // Accept POST JSON or GET querystring (for manual testing)
  let passcode = '';
  let programme = '';
  let grade = '';
  let mode: 'easy' | 'core' | 'hard' = 'core';

  // Query first (works for GET)
  const url = new URL(req.url);
  passcode = url.searchParams.get('passcode') ?? '';
  programme = url.searchParams.get('programme') ?? '';
  grade = url.searchParams.get('grade') ?? '';
  mode = (url.searchParams.get('mode') as any) ?? mode;

  // Body (overrides query if present)
  try {
    const body = (await req.json()) as StartPayload;
    if (body) {
      passcode = body.passcode ?? passcode;
      programme = body.programme ?? programme;
      grade = (body.grade as any) ?? grade;
      mode = ((body.mode as any) ?? mode) as any;
    }
  } catch {
    // not JSON; ignore
  }

  // normalize
  programme = String(programme).trim();
  grade = String(grade).trim();
  if (!['easy', 'core', 'hard'].includes(mode)) mode = 'core';

  return { passcode, programme, grade, mode };
}

// support both GET and POST
export async function GET(req: Request) {
  return handleStart(req);
}
export async function POST(req: Request) {
  return handleStart(req);
}

async function handleStart(req: Request) {
  const { passcode, programme, grade, mode } = await readParams(req);

  if (!programme || !grade) {
    return NextResponse.json(
      { ok: false, error: 'missing_programme_or_grade' },
      { status: 400 }
    );
  }

  // TODO: real passcode check if you need one
  if (!passcode) {
    return NextResponse.json(
      { ok: false, error: 'missing_passcode' },
      { status: 400 }
    );
  }

  // --- Load & filter blueprint rows -----------------------------------------
  const all = (await loadBlueprints()) as any[];

  const rows = all.filter((r) => {
    const p = String(r?.programme ?? '').trim();
    const g = String(r?.grade ?? r?.year ?? '').trim(); // some sheets use "year"
    return p === programme && g === grade;
  });

  // --- Build countsBySubject robustly (works with both schemas) --------------
  const countsBySubject: Record<string, number> = {};

  for (const r of rows) {
    // subject column can be "subject" or "domains"
    const subjectKey =
      Object.keys(r).find((k) => norm(k) === 'subject') ??
      Object.keys(r).find((k) => norm(k) === 'domains');

    const subject = String(subjectKey ? r[subjectKey] : '').trim();
    if (!subject) continue;

    // preferred key for chosen mode
    const modeKey = Object.keys(r).find((k) => norm(k) === `${mode}_count`);

    // fallbacks when mode column is missing/blank
    const fallbacks = ['total', 'count', 'base_count', 'core', 'easy', 'hard', 'base'];

    let val = NaN;

    if (modeKey) val = numeric(r[modeKey]);

    if (!Number.isFinite(val) || val <= 0) {
      for (const fk of fallbacks) {
        const k = Object.keys(r).find((h) => norm(h) === fk);
        if (!k) continue;
        const n = numeric(r[k]);
        if (Number.isFinite(n) && n > 0) {
          val = n;
          break;
        }
      }
    }

    if (Number.isFinite(val) && val > 0) {
      countsBySubject[subject] = val;
    }
  }

  if (!Object.values(countsBySubject).some((v) => v > 0)) {
    return NextResponse.json(
      { ok: false, error: `blueprint_has_no_positive_counts_for_mode_${mode}` },
      { status: 400 }
    );
  }

  // --- Create session --------------------------------------------------------
  const token =
    (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`)
      .replace(/-/g, '')
      .slice(0, 24);

  const db = supaAdmin();

  const plan = {
    programme,
    grade,
    mode,
    countsBySubject,
  };

  const { error: iErr } = await db
    .from('sessions')
    .insert([
      {
        token,
        item_index: 0,
        status: 'new',
        plan,
        meta: {},
      },
    ]);

  if (iErr) {
    return NextResponse.json(
      { ok: false, error: 'db_insert_failed', detail: iErr.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, token, plan });
}
