// app/api/start/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ---------- server DB client ----------
const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
function db() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('missing_supabase_env');
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

// ---------- config ----------
const PASSCODE = process.env.START_PASSCODE || 'letmein';
const BLUEPRINTS_CSV_URL = process.env.BLUEPRINTS_CSV_URL || '';

// ---------- types / helpers ----------
type CountsBySubject = Record<string, number>;
type StartOk = { ok: true; session_id: string };
type StartErr = { ok: false; error: string; detail?: any };

const json = (body: StartOk | StartErr, status = 200) =>
  NextResponse.json(body, { status });

const normalize = (s: unknown) =>
  String(s ?? '')
    .replace(/\uFEFF/g, '') // BOM
    .replace(/\u00A0/g, ' ') // NBSP
    .trim();

const lower = (s: unknown) => normalize(s).toLowerCase();

function parseCsvToObjects(csv: string): Array<Record<string, string>> {
  const rows: string[] = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < csv.length; i++) {
    const c = csv[i];
    if (c === '"') {
      if (q && csv[i + 1] === '"') {
        cur += '"';
        i++;
      } else q = !q;
    } else if (c === '\n' && !q) {
      rows.push(cur);
      cur = '';
    } else cur += c;
  }
  if (cur) rows.push(cur);

  const header = rows.shift() ?? '';
  const keys = header.split(',').map((h) => lower(h));
  return rows
    .filter((r) => r.trim().length > 0)
    .map((r) => {
      const out: Record<string, string> = {};
      const cols: string[] = [];
      let cell = '';
      let qq = false;
      for (let i = 0; i < r.length; i++) {
        const c = r[i];
        if (c === '"') {
          if (qq && r[i + 1] === '"') {
            cell += '"';
            i++;
          } else qq = !qq;
        } else if (c === ',' && !qq) {
          cols.push(cell);
          cell = '';
        } else cell += c;
      }
      cols.push(cell);
      keys.forEach((k, i) => (out[k] = normalize(cols[i] ?? '')));
      return out;
    });
}

async function loadBlueprintCounts(
  programme: string,
  grade: string,
  mode: 'easy' | 'core' | 'hard'
): Promise<CountsBySubject> {
  if (!BLUEPRINTS_CSV_URL) throw new Error('missing_BLUEPRINTS_CSV_URL');
  const res = await fetch(BLUEPRINTS_CSV_URL, { cache: 'no-store' });
  if (!res.ok) throw new Error(`fetch_blueprints_failed_${res.status}`);
  const csv = await res.text();
  const rows = parseCsvToObjects(csv);

  const filtered = rows.filter(
    (r) => lower(r['programme']) === lower(programme) && normalize(r['grade']) === grade
  );

  const counts: CountsBySubject = {};
  for (const r of filtered) {
    const subjectKey = r['subject'] ? 'subject' : r['domains'] ? 'domains' : '';
    const subject = normalize(subjectKey ? r[subjectKey] : '');
    if (!subject) continue;

    const modeKey = `${mode}_count`;
    const raw = r[modeKey] ?? r['total'] ?? '';
    const n = Number(String(raw).replace(/[^0-9.\-]/g, ''));
    if (Number.isFinite(n) && n > 0) counts[subject] = n;
  }
  return counts;
}

function safeMode(v: unknown): 'easy' | 'core' | 'hard' {
  const m = lower(v);
  return m === 'easy' || m === 'core' || m === 'hard' ? m : 'core';
}

function newToken() {
  const b = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
}

// ---------- handler ----------
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const passcode = searchParams.get('passcode') ?? '';
    const programme = searchParams.get('programme') ?? '';
    const grade = searchParams.get('grade') ?? '';
    const mode = safeMode(searchParams.get('mode'));

    if (!programme || !grade) {
      return json({ ok: false, error: 'missing_programme_or_grade' }, 400);
    }
    if (PASSCODE && passcode !== PASSCODE) {
      return json({ ok: false, error: 'invalid_passcode' }, 401);
    }

    const countsBySubject = await loadBlueprintCounts(programme, grade, mode);
    if (!Object.values(countsBySubject).some((v) => v > 0)) {
      return json(
        { ok: false, error: `blueprint_has_no_positive_counts_for_mode_${mode}` },
        400
      );
    }

    const token = newToken();
    const plan = { programme, grade, mode, counts: countsBySubject };
    const meta = { ua: 'runner', started_at: new Date().toISOString() };

    // NOTE: do NOT send 'status' → let DB default 'active' satisfy CHECK constraint
    const { data, error } = await db()
      .from('sessions')
      .insert([{ token, programme, grade, mode, item_index: 0, plan, meta }])
      .select('id')
      .single();

    if (error) {
      return json({ ok: false, error: 'db_insert_failed', detail: error.message }, 500);
    }
    return json({ ok: true, session_id: data!.id });
  } catch (err: any) {
    return json({ ok: false, error: 'start_failed', detail: String(err?.message ?? err) }, 500);
  }
}
