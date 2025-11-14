import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ---------- CSV helpers ----------

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
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

function parseNumericOrNull(v: string | null | undefined): number | null {
  if (v == null) return null;
  const s = String(v).trim();
  if (s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function parseBoolOrNull(v: string | null | undefined): boolean | null {
  if (v == null) return null;
  const s = String(v).trim().toLowerCase();
  if (['true', 't', '1', 'yes', 'y'].includes(s)) return true;
  if (['false', 'f', '0', 'no', 'n'].includes(s)) return false;
  return null;
}

// ---------- Prepare data ----------

function prepareItems(rows: any[]) {
  const items: any[] = [];
  const seenIds = new Set<string>();
  const duplicateIds = new Set<string>();
  const skippedNoId: string[] = [];
  const skippedNoStem: string[] = [];

  for (const row of rows) {
    // ID
    const rawId =
      getStr(row, 'id', 'item_id', 'Item_ID', 'itemId') ||
      getStr(row, 'ID');

    if (!rawId) {
      skippedNoId.push(JSON.stringify(row));
      continue;
    }

    const id = rawId.trim();
    if (!id) {
      skippedNoId.push(JSON.stringify(row));
      continue;
    }

    if (seenIds.has(id)) {
      duplicateIds.add(id);
      continue; // skip duplicate
    }

    // Stem
    const stem =
      getStr(row, 'display_question', 'stimulus_text', 'stem', 'text', 'prompt', 'question_html');
    if (!stem) {
      skippedNoStem.push(id);
      continue;
    }

    // Year
    let year =
      getStr(row, 'year', 'year_label', 'Year') || '';

    if (!year) {
      const gradeStr = getStr(row, 'grade', 'Grade');
      if (gradeStr) {
        const n = parseInt(gradeStr, 10);
        if (!Number.isNaN(n)) {
          year =
