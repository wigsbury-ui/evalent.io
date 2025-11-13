// app/api/seed/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabaseClient';
import { env } from '../../../lib/env';

type CsvRow = Record<string, string>;

// --- CSV helpers ----------------------------------------------------------

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
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
    throw new Error(`Failed to fetch CSV from ${url}: ${res.status} ${res.statusText}`);
  }
  const text = await res.text();
  return parseCsv(text);
}

function cleanVal(v: string | undefined): string | null {
  if (!v) return null;
  const trimmed = v.trim();
  return trimmed === '' ? null : trimmed;
}

// --- PREPARE ITEMS --------------------------------------------------------

function prepareItems(rows: CsvRow[], schoolId: string) {
  const seenAnchors = new Set<string>();
  const prepared: any[] = [];

  for (const r of rows) {
    const anchor = (r['anchor'] || r['item_id'] || '').trim();
    if (!anchor) continue;
    if (seenAnchors.has(anchor)) continue;
    seenAnchors.add(anchor);

    // mcq_options_json (confirmed by you)
    let mcqOptions: any = null;
    const mcqRaw = r['mcq_options_json'];
    if (mcqRaw && mcqRaw.trim() !== '') {
      try {
        mcqOptions = JSON.parse(mcqRaw);
      } catch {
        mcqOptions = null;
      }
    }

    prepared.push({
      school_id: schoolId,
      anchor,

      grade_label: cleanVal(r['grade_label'] || r['grade']),
      grade_number: cleanVal(r['grade_number']),
      stage: cleanVal(r['stage']),
      domain: cleanVal(r['domain']),
      strand: cleanVal(r['strand'] || r['strand_raw']),
      standard_code_raw: cleanVal(r['standard_code_raw'] || r['standard_code']),
      language_locale: cleanVal(r['language_locale']),

      difficulty: cleanVal(r['difficulty']),
      item_kind:
        cleanVal(r['item_kind']) ||
        cleanVal(r['type']) ||
        (mcqOptions ? 'mcq' : 'prompt'),

      display_question:
        cleanVal(r['display_question']) ||
        cleanVal(r['stem']) ||
        cleanVal(r['stimulus_text']),

      stimulus_text: cleanVal(r['stimulus_text']),
      stem_text: cleanVal(r['stem'] || r['stem_text']),

      mcq_options_json: mcqOptions,
      correct_index: cleanVal(r['correct_index']),
      answer_key: cleanVal(r['answer_key']),

      share_url:
        cleanVal(r['share_url']) ||
        cleanVal(r['Share_URL']) ||
        cleanVal(r['Video_URL']) ||
        cleanVal(r['video_url']),
    });
  }

  return prepared;
}

// --- PREPARE ASSETS -------------------------------------------------------

function prepareAssets(rows: CsvRow[], schoolId: string) {
  const seenKeys = new Set<string>();
  const prepared: any[] = [];

  for (const r of rows) {
    const assetKey = (r['asset_key'] || r['item_id'] || '').trim();
    if (!assetKey) continue;
    if (seenKeys.has(assetKey)) continue;
    seenKeys.add(assetKey);

    prepared.push({
      school_id: schoolId,
      asset_key: assetKey,
      item_id: cleanVal(r['item_id']),

      video_title: cleanVal(r['video_title'] || r['Video_Title']),
      share_url:
        cleanVal(r['Video_URL']) ||
        cleanVal(r['video_url']) ||
        cleanVal(r['Share_URL']) ||
        cleanVal(r['share_url']),

      download_url: cleanVal(r['Download_URL'] || r['download_url']),
      notes: cleanVal(r['Notes'] || r['notes']),
      regenerate: cleanVal(r['Regenerate'] || r['regenerate']),
    });
  }

  return prepared;
}

// --- PREPARE BLUEPRINTS ---------------------------------------------------

function prepareBlueprints(rows: CsvRow[], schoolId: string) {
  const seenKeys = new Set<string>();
  const prepared: any[] = [];

  for (const r of rows) {
    const key = (r['key'] || '').trim();
    if (!key) continue;
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);

    prepared.push({
      school_id: schoolId,
      key,
      label: cleanVal(r['label']),
      domain: cleanVal(r['domain']),
      grade_label: cleanVal(r['grade_label']),
      grade_number: cleanVal(r['grade_number']),
      stage: cleanVal(r['stage']),
      item_ids: cleanVal(r['item_ids']),
    });
  }

  return prepared;
}

// --- MAIN HANDLER ---------------------------------------------------------

async function handleSeed() {
  try {
    const schoolId = env.DEFAULT_SCHOOL_ID;
    if (!schoolId) {
      throw new Error('DEFAULT_SCHOOL_ID is not set in env');
    }

    const itemsUrl = env.SHEETS_ITEMS_CSV;
    const assetsUrl = env.SHEETS_ASSETS_CSV;
    const blueprintsUrl = env.SHEETS_BLUEPRINTS_CSV;

    if (!itemsUrl && !assetsUrl && !blueprintsUrl) {
      throw new Error(
        'No SHEETS_*_CSV env vars are set. Please set SHEETS_ITEMS_CSV, SHEETS_ASSETS_CSV, SHEETS_BLUEPRINTS_CSV.',
      );
    }

    const [itemsCsv, assetsCsv, blueprintsCsv] = await Promise.all([
      fetchCsv(itemsUrl),
      fetchCsv(assetsUrl),
      fetchCsv(blueprintsUrl),
    ]);

    const itemsPrepared = prepareItems(itemsCsv, schoolId);
    const assetsPrepared = prepareAssets(assetsCsv, schoolId);
    const blueprintsPrepared = prepareBlueprints(blueprintsCsv, schoolId);

    // Delete everything for this school_id first (simple, predictable)
    await supabaseAdmin.from('items').delete().eq('school_id', schoolId);
    await supabaseAdmin.from('assets').delete().eq('school_id', schoolId);
    await supabaseAdmin.from('blueprints').delete().eq('school_id', schoolId);

    const results: any = {};

    if (itemsPrepared.length > 0) {
      const { error } = await supabaseAdmin.from('items').insert(itemsPrepared);
      if (error) {
        throw new Error(`Insert into items failed: ${error.message}`);
      }
      results.itemsInserted = itemsPrepared.length;
    } else {
      results.itemsInserted = 0;
    }

    if (assetsPrepared.length > 0) {
      const { error } = await supabaseAdmin.from('assets').insert(assetsPrepared);
      if (error) {
        throw new Error(`Insert into assets failed: ${error.message}`);
      }
      results.assetsInserted = assetsPrepared.length;
    } else {
      results.assetsInserted = 0;
    }

    if (blueprintsPrepared.length > 0) {
      const { error } = await supabaseAdmin
        .from('blueprints')
        .insert(blueprintsPrepared);
      if (error) {
        throw new Error(`Insert into blueprints failed: ${error.message}`);
      }
      results.blueprintsInserted = blueprintsPrepared.length;
    } else {
      results.blueprintsInserted = 0;
    }

    return NextResponse.json({
      ok: true,
      csvCounts: {
        itemsCsvRows: itemsCsv.length,
        assetsCsvRows: assetsCsv.length,
        blueprintsCsvRows: blueprintsCsv.length,
      },
      inserted: results,
    });
  } catch (err: any) {
    console.error('[seed] error', err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? 'Unknown error in seed endpoint' },
      { status: 500 },
    );
  }
}

export async function POST() {
  return handleSeed();
}

export async function GET() {
  return handleSeed();
}
