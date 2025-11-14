// app/api/seed/route.ts

import { NextResponse } from 'next/server';
import { env } from '../../../lib/env';
import { supabaseAdmin } from '../../../lib/supabaseClient';

type CsvRow = Record<string, string>;

// -------- CSV helpers ------------------------------------------------------

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (ch === '"') {
      // Escaped quote ("")
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      out.push(current);
      current = '';
    } else {
      current += ch;
    }
  }

  out.push(current);
  return out;
}

function parseCsv(text: string): CsvRow[] {
  const lines = text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .filter((l) => l.trim() !== '');

  if (!lines.length) return [];

  const headers = splitCsvLine(lines[0]).map((h) => h.trim());
  const rows: CsvRow[] = [];

  for (const line of lines.slice(1)) {
    const cols = splitCsvLine(line);
    const row: CsvRow = {};
    headers.forEach((header, i) => {
      row[header] = cols[i] ?? '';
    });
    rows.push(row);
  }

  return rows;
}

async function fetchCsv(url?: string): Promise<CsvRow[]> {
  if (!url) return [];
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`CSV fetch failed: ${url} -> ${res.status} ${res.statusText}`);
  }
  const text = await res.text();
  return parseCsv(text);
}

// -------- value helpers ----------------------------------------------------

function clean(v: string | undefined): string | null {
  if (v == null) return null;
  const t = v.trim();
  return t === '' ? null : t;
}

function numOrNull(v: string | undefined): number | null {
  if (v == null) return null;
  const t = v.trim();
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function boolFromCell(v: string | undefined): boolean {
  if (v == null) return false;
  const t = String(v).trim().toLowerCase();
  return t === 'true' || t === 'yes' || t === 'y' || t === '1';
}

// -------- prepare ITEMS ----------------------------------------------------

function prepareItems(rows: CsvRow[]) {
  const prepared: any[] = [];
  const seenIds = new Set<string>();

  for (const r of rows) {
    const rawId = (r['item_id'] || r['id'] || '').trim();
    if (!rawId) continue;
    if (seenIds.has(rawId)) continue;
    seenIds.add(rawId);

    // Year token – follow the CLI script logic
    const yearToken = (() => {
      if (rawId.includes('-')) return rawId.split('-')[0];
      return (
        r['year'] ||
        r['year_label'] ||
        r['grade'] ||
        'Y7'
      );
    })();

    // Options (MCQ choices)
    const options = (() => {
      const raw =
        r['mcq_options_json'] ||
        r['options_joined'] ||
        r['options'] ||
        r['mcq_options'] ||
        '';

      try {
        if (typeof raw === 'string' && raw.trim().startsWith('[')) {
          return JSON.parse(raw).map((x: any) => String(x));
        }
      } catch {
        // fall through to line-split handling
      }

      return String(raw)
        .split('\n')
        .filter(Boolean)
        .map((x: any) => String(x));
    })();

    const correct =
      r['answer_key'] !== undefined && r['answer_key'] !== null && r['answer_key'] !== ''
        ? String(r['answer_key'])
        : (r['correct'] || r['correct_answer'] || null);

    const stem =
      r['display_question'] ||
      r['stimulus_text'] ||
      r['stem'] ||
      r['text'] ||
      r['prompt'] ||
      '';

    if (!stem.trim()) continue; // must have a question to show

    const typeCell = (r['type'] || 'MCQ').toString().toLowerCase();
    const type = typeCell === 'mcq' ? 'mcq' : 'short';

    prepared.push({
      id: rawId,
      year: yearToken,
      domain: r['domain'] || 'English',
      stem,
      type,
      options,
      correct: correct == null ? null : String(correct),
      programme: r['programme'] || r['curriculum'] || 'UK',
    });
  }

  return prepared;
}

// -------- prepare ASSETS ---------------------------------------------------

function prepareAssets(rows: CsvRow[], validItemIds: Set<string>) {
  const prepared: any[] = [];
  const seenItemIds = new Set<string>();

  for (const r of rows) {
    const rawItemId = (r['item_id'] || '').trim();
    if (!rawItemId) continue;
    if (!validItemIds.has(rawItemId)) continue; // avoid FK violations
    if (seenItemIds.has(rawItemId)) continue; // one assets row per item_id
    seenItemIds.add(rawItemId);

    prepared.push({
      item_id: rawItemId,
      video_title: clean(r['video_title']),
      video_id: clean(r['video_id']),
      share_url: clean(r['share_url']),
      download_url: clean(r['download_url']),
      duration_seconds: numOrNull(r['duration_seconds']),
      avatar_voice_id: clean(r['avatar_voice_id']),
      avatar_style: clean(r['avatar_style']),
      background: clean(r['background']),
      resolution: clean(r['resolution']),
      video_thumbnail: clean(r['video_thumbnail']),
      script_audio: clean(r['script_audio']),
      script_audio_original: clean(r['script_audio_original']),
      intro: clean(r['intro']),
      outro: clean(r['outro']),
      a_intro: clean(r['a_intro']),
      b_intro: clean(r['b_intro']),
      c_intro: clean(r['c_intro']),
      d_intro: clean(r['d_intro']),
      end: clean(r['end']),
      script_version: clean(r['script_version']),
      current_script_hash: clean(r['current_script_hash']),
      last_rendered_script_hash: clean(r['last_rendered_script_hash']),
      error: clean(r['error']),
      status: clean(r['status']),
      __sheet: clean(r['__sheet']),
      programme: clean(r['programme']),
      _has_vid: boolFromCell(r['_has_vid']),
      _has_share: boolFromCell(r['_has_share']),
      talking_photo_id: clean(r['talking_photo_id']),
      notes: clean(r['notes']),
      player_url: clean(r['player_url']),
    });
  }

  return prepared;
}

// -------- prepare BLUEPRINTS ----------------------------------------------

function intOrZero(v: string | undefined): number {
  if (v == null) return 0;
  const t = v.trim();
  if (t === '') return 0;
  const n = Number(t);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

function prepareBlueprints(rows: CsvRow[]) {
  const prepared: any[] = [];

  for (const r of rows) {
    const programme = (r['programme'] || '').trim();
    const gradeStr = (r['grade'] || '').trim();
    const subject = (r['subject'] || '').trim();

    if (!programme || !gradeStr || !subject) continue;

    prepared.push({
      programme,
      grade: Number(gradeStr),
      subject,
      base_count: intOrZero(r['base_count']),
      easy_count: intOrZero(r['easy_count']),
      core_count: intOrZero(r['core_count']),
      hard_count: intOrZero(r['hard_count']),
    });
  }

  return prepared;
}

// -------- main handler ----------------------------------------------------

async function handleSeed() {
  try {
    const itemsUrl = env.SHEETS_ITEMS_CSV;
    const assetsUrl = env.SHEETS_ASSETS_CSV;
    const blueprintsUrl = env.SHEETS_BLUEPRINTS_CSV;

    if (!itemsUrl && !assetsUrl && !blueprintsUrl) {
      throw new Error(
        'No SHEETS_*_CSV env vars are set. Please set SHEETS_ITEMS_CSV, SHEETS_ASSETS_CSV, SHEETS_BLUEPRINTS_CSV.'
      );
    }

    // Fetch CSVs in parallel
    const [itemsCsv, assetsCsv, blueprintsCsv] = await Promise.all([
      fetchCsv(itemsUrl),
      fetchCsv(assetsUrl),
      fetchCsv(blueprintsUrl),
    ]);

    // Build rows to insert
    const itemsRows = prepareItems(itemsCsv);
    const validItemIds = new Set<string>(itemsRows.map((r) => r.id as string));
    const assetsRows = prepareAssets(assetsCsv, validItemIds);
    const blueprintsRows = prepareBlueprints(blueprintsCsv);

    // Hard reset tables (simple + predictable)
    await supabaseAdmin.from('attempts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabaseAdmin.from('sessions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabaseAdmin.from('assets').delete();
    await supabaseAdmin.from('items').delete();
    await supabaseAdmin.from('blueprints').delete();

    const results: Record<string, any> = {
      csvCounts: {
        itemsCsvRows: itemsCsv.length,
        assetsCsvRows: assetsCsv.length,
        blueprintsCsvRows: blueprintsCsv.length,
      },
    };

    if (itemsRows.length) {
      const { error } = await supabaseAdmin.from('items').insert(itemsRows);
      if (error) throw new Error(`Insert into items failed: ${error.message}`);
      results.itemsInserted = itemsRows.length;
    } else {
      results.itemsInserted = 0;
    }

    if (assetsRows.length) {
      const { error } = await supabaseAdmin.from('assets').insert(assetsRows);
      if (error) throw new Error(`Upsert into assets failed: ${error.message}`);
      results.assetsInserted = assetsRows.length;
    } else {
      results.assetsInserted = 0;
    }

    if (blueprintsRows.length) {
      const { error } = await supabaseAdmin.from('blueprints').insert(blueprintsRows);
      if (error) throw new Error(`Insert into blueprints failed: ${error.message}`);
      results.blueprintsInserted = blueprintsRows.length;
    } else {
      results.blueprintsInserted = 0;
    }

    return NextResponse.json({ ok: true, ...results }, { status: 200 });
  } catch (err: any) {
    console.error('[seed] error', err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? 'Unknown error in seed endpoint' },
      { status: 500 }
    );
  }
}

export async function POST() {
  return handleSeed();
}

export async function GET() {
  return handleSeed();
}
