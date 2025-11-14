import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

// --- small CSV helpers reused from the main seeder ---

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function parseCsv(text: string): any[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .filter((l) => l !== '');

  if (lines.length === 0) return [];

  const headerCells = splitCsvLine(lines[0]).map((h) => h.trim());
  const rows: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]);
    const row: any = {};
    headerCells.forEach((h, idx) => {
      row[h] = (cells[idx] ?? '').trim();
    });
    rows.push(row);
  }

  return rows;
}

async function fetchCsvFromEnv(envKey: string): Promise<any[]> {
  const url = process.env[envKey];
  if (!url) {
    throw new Error(`Missing env var ${envKey}`);
  }
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${envKey}: ${res.status} ${res.statusText}`);
  }
  const text = await res.text();
  return parseCsv(text);
}

function getStr(row: any, ...keys: string[]): string {
  for (const key of keys) {
    if (key in row && row[key] != null) {
      const v = String(row[key]).trim();
      if (v !== '') return v;
    }
  }
  return '';
}

function parseIntOrZero(v: string | null | undefined): number {
  if (!v) return 0;
  const n = parseInt(String(v), 10);
  return Number.isFinite(n) ? n : 0;
}

// --- blueprints shaping: programme, grade, subject only ---

function prepareBlueprints(rows: any[]) {
  const blueprints: any[] = [];

  for (const row of rows) {
    const programme = getStr(row, 'programme', 'Program') || 'UK';
    const grade = parseIntOrZero(getStr(row, 'grade', 'Grade', 'year', 'Year'));
    const subject = getStr(row, 'subject', 'domain', 'strand') || 'General';

    if (!grade) continue;

    blueprints.push({
      programme,
      grade,
      subject,
    });
  }

  return blueprints;
}

async function runSeedBlueprints() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY',
      },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // 1) Load ONLY the blueprints CSV
  const bpRows = await fetchCsvFromEnv('SHEETS_BLUEPRINTS_CSV');
  const blueprints = prepareBlueprints(bpRows);

  // 2) Wipe existing blueprints (but NOT items / assets / sessions)
  await supabase
    .from('blueprints')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  // 3) Insert new blueprints
  const { error } = await supabase.from('blueprints').insert(blueprints);
  if (error) {
    return NextResponse.json(
      {
        ok: false,
        error: `Insert into blueprints failed: ${error.message}`,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    blueprintsInserted: blueprints.length,
    csvRows: bpRows.length,
  });
}

export async function POST() {
  try {
    return await runSeedBlueprints();
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: err?.message ?? String(err),
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return POST();
}
