// app/api/start/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/db'; // <-- keep your existing db helper

// ---------- helpers ----------
const PASSCODE = process.env.START_PASSCODE || 'letmein';
const BLUEPRINTS_CSV_URL = process.env.BLUEPRINTS_CSV_URL || '';

type CountsBySubject = Record<string, number>;
type StartOk = { ok: true; session_id: string };
type StartErr = { ok: false; error: string; detail?: any };

const json = (body: StartOk | StartErr, init?: number) =>
  NextResponse.json(body, { status: init ?? 200 });

const normalize = (s: unknown) =>
  String(s ?? '')
    .replace(/\uFEFF/g, '')      // strip BOM
    .replace(/\u00A0/g, ' ')     // strip NBSP
    .trim();

const lower = (s: unknown) => normalize(s).toLowerCase();

function parseCsvToObjects(csv: string): Array<Record<string, string>> {
  // very small CSV parser that handles quoted commas & quotes
  const rows: string[] = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < csv.length; i++) {
    const c = csv[i];
    if (c === '"') {
      if (q && csv[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        q = !q;
      }
    } else if (c === '\n' && !q) {
      rows.push(cur);
      cur = '';
    } else {
      cur += c;
    }
  }
  if (cur) rows.push(cur);

  const header = rows.shift() ?? '';
  const keys = header.split(',').map((h) => normalize(h).toLowerCase());
  return rows
    .filter((r) => r.trim().length > 0)
    .map((r) => {
      const out: Record<string, string> = {};
      const cols: string[] = [];
      // split row by commas respecting quotes (second pass is ok)
      let cell = '';
      let qq = false;
      for (let i = 0; i < r.length; i++) {
        const c = r[i];
        if (c === '"') {
          if (qq && r[i + 1] === '"') {
            cell += '"';
            i++;
          } else {
            qq = !qq;
          }
        } else if (c === ',' && !qq) {
          cols.push(cell);
          cell = '';
        } else {
          cell += c;
        }
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

  // filter by programme+grade
  const filtered = rows.filter(
    (r) => lower(r['programme']) === lower(programme) && normalize(r['grade']) === grade
  );

  const counts: CountsBySubject = {};
  for (const r of filtered) {
    // schema A → subject column; schema B → domains column
    const subjectKey = r['subject'] ? 'subject' : r['domains'] ? 'domains' : '';
    const subject = normalize(subjectKey ? r[subjectKey] : '');
    if (!subject) continue;

    // prefer "<mode>_count"; else "total"
    const modeKey = `${mode}_count`;
    const raw = r[modeKey] ?? r['total'] ?? '';
    const n = Number(String(raw).replace(/[^0-9.\-]/g, ''));
    if (Number.isFinite(n) && n > 0) counts[subject] = n;
  }
  return counts;
}

function safeMode(v: unknown): 'easy' | 'core' | 'hard' {
  const m = lower(v);
  if (m === 'easy' || m === 'core' || m === 'hard') return m;
  return 'core';
}

function newToken() {
  // 24 hex chars is fine for a session token
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

    // blueprint → counts per subject
    const countsBySubject = await loadBlueprintCounts(programme, grade, mode);
    if (!Object.values(countsBySubject).some((v) => v > 0)) {
      return json(
        { ok: false, error: `blueprint_has_no_positive_counts_for_mode_${mode}` },
        400
      );
    }

    // session payload
    const token = newToken();

    // keep your existing shapes for plan/meta as needed
    const plan = { programme, grade, mode, counts: countsBySubject };
    const meta = { ua: 'runner', started_at: new Date().toISOString() };

    // IMPORTANT: do NOT send 'status' → let DB default ('active') satisfy CHECK
    const insertRow = {
      token,
      programme,
      grade,
      mode,
      item_index: 0,
      plan,
      meta
    };

    const { data: created, error: cErr } = await db
      .from('sessions')
      .insert([insertRow])
      .select('id')
      .single();

    if (cErr) {
      return json({ ok: false, error: 'db_insert_failed', detail: cErr.message }, 500);
    }

    return json({ ok: true, session_id: created.id });
  } catch (err: any) {
    return json({ ok: false, error: 'start_failed', detail: String(err?.message ?? err) }, 500);
  }
}
