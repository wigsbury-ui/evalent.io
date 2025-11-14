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
          year = `Y${n}`;
        }
      }
    }

    if (!year) {
      const m = id.match(/Y(\d+)/i);
      if (m) {
        year = `Y${m[1]}`;
      } else {
        year = 'Y7'; // safe default
      }
    }

    const domain = getStr(row, 'domain', 'subject', 'strand') || 'General';

    const typeRaw = getStr(row, 'type', 'item_type').toLowerCase();
    const type = typeRaw === 'mcq' ? 'mcq' : 'short';

    let options: string[] | null = null;
    let correct = getStr(row, 'answer_key', 'correct', 'correct_answer');

    if (type === 'mcq') {
      const jsonStr = getStr(row, 'mcq_options_json');
      if (jsonStr) {
        try {
          const parsed = JSON.parse(jsonStr);
          if (Array.isArray(parsed)) {
            options = parsed.map((o: any) => String(o));
          }
        } catch {
          // ignore JSON parse error, fall through to other sources
        }
      }

      if (!options) {
        const joined =
          getStr(row, 'options_joined', 'options', 'mcq_options') || '';
        if (joined) {
          options = joined
            .split(/\r?\n/)
            .map((s) => s.trim())
            .filter((s) => s !== '');
        }
      }
    }

    const programme = getStr(row, 'programme', 'Program', 'programme_label') || 'UK';

    items.push({
      id,
      year,
      domain,
      stem,
      type,
      options: options ?? null,
      correct: correct || null,
      programme,
    });

    seenIds.add(id);
  }

  return {
    items,
    duplicateIds: Array.from(duplicateIds),
    skippedNoIdCount: skippedNoId.length,
    skippedNoStemCount: skippedNoStem.length,
  };
}

function prepareAssets(rows: any[], validItemIds: Set<string>) {
  const assets: any[] = [];

  for (const row of rows) {
    const itemId =
      getStr(row, 'item_id', 'id', 'Item_ID') ||
      '';

    if (!itemId || !validItemIds.has(itemId)) {
      continue; // skip asset rows that don't match a seeded item
    }

    const duration_seconds = parseNumericOrNull(getStr(row, 'duration_seconds', 'duration'));

    const _has_vid = parseBoolOrNull(getStr(row, '_has_vid')) ?? false;
    const _has_share = parseBoolOrNull(getStr(row, '_has_share')) ?? false;

    assets.push({
      item_id: itemId,
      video_title: getStr(row, 'video_title'),
      video_id: getStr(row, 'video_id'),
      share_url: getStr(row, 'share_url'),
      download_url: getStr(row, 'download_url'),
      duration_seconds,
      avatar_voice_id: getStr(row, 'avatar_voice_id'),
      avatar_style: getStr(row, 'avatar_style'),
      background: getStr(row, 'background'),
      resolution: getStr(row, 'resolution'),
      video_thumbnail: getStr(row, 'video_thumbnail'),
      script_audio: getStr(row, 'script_audio'),
      script_audio_original: getStr(row, 'script_audio_original'),
      intro: getStr(row, 'intro'),
      outro: getStr(row, 'outro'),
      a_intro: getStr(row, 'a_intro'),
      b_intro: getStr(row, 'b_intro'),
      c_intro: getStr(row, 'c_intro'),
      d_intro: getStr(row, 'd_intro'),
      end: getStr(row, 'end'),
      script_version: getStr(row, 'script_version'),
      current_script_hash: getStr(row, 'current_script_hash'),
      last_rendered_script_hash: getStr(row, 'last_rendered_script_hash'),
      error: getStr(row, 'error'),
      status: getStr(row, 'status'),
      __sheet: getStr(row, '__sheet'),
      programme: getStr(row, 'programme') || 'UK',
      _has_vid,
      _has_share,
      talking_photo_id: getStr(row, 'talking_photo_id'),
      notes: getStr(row, 'notes'),
      player_url: getStr(row, 'player_url'),
    });
  }

  return assets;
}

function prepareBlueprints(rows: any[]) {
  const blueprints: any[] = [];

  for (const row of rows) {
    const programme = getStr(row, 'programme', 'Program') || 'UK';
    const grade = parseIntOrZero(getStr(row, 'grade', 'Grade', 'year', 'Year'));
    const subject = getStr(row, 'subject', 'domain', 'strand') || 'General';

    const base_count = parseIntOrZero(getStr(row, 'base_count'));
    const easy_count = parseIntOrZero(getStr(row, 'easy_count'));
    const core_count = parseIntOrZero(getStr(row, 'core_count'));
    const hard_count = parseIntOrZero(getStr(row, 'hard_count'));

    if (!grade) continue; // skip rows without a usable grade

    blueprints.push({
      // id is default-generated UUID in DB
      programme,
      grade,
      subject,
      base_count,
      easy_count,
      core_count,
      hard_count,
    });
  }

  return blueprints;
}

// ---------- HTTP handler ----------

export async function POST() {
  try {
    // 1) Load CSVs
    const [itemsRows, assetsRows, blueprintsRows] = await Promise.all([
      fetchCsvFromEnv('SHEETS_ITEMS_CSV'),
      fetchCsvFromEnv('SHEETS_ASSETS_CSV'),
      fetchCsvFromEnv('SHEETS_BLUEPRINTS_CSV'),
    ]);

    // 2) Prepare rows (with de-duplication)
    const {
      items,
      duplicateIds,
      skippedNoIdCount,
      skippedNoStemCount,
    } = prepareItems(itemsRows);

    const validItemIdSet = new Set(items.map((i) => i.id));
    const assets = prepareAssets(assetsRows, validItemIdSet);
    const blueprints = prepareBlueprints(blueprintsRows);

    // 3) Hard reset tables (attempts → sessions → assets → blueprints → items)
    // NOTE: This wipes ALL sessions/attempts; only run from admin.
    await supabase.from('attempts').delete().neq('session_id', ''); // cheap "delete all" guard
    await supabase.from('sessions').delete().neq('id', '');
    await supabase.from('assets').delete().neq('item_id', '');
    await supabase.from('blueprints').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('items').delete().neq('id', '');

    // 4) Insert items
    const { error: itemsError } = await supabase.from('items').insert(items);

    if (itemsError) {
      return NextResponse.json(
        {
          ok: false,
          error: `Insert into items failed: ${itemsError.message}`,
          hint: 'Check for unexpected duplicate IDs or mismatched schema in the items CSV.',
          duplicateIds,
          debug: {
            itemsPrepared: items.length,
            itemsCsvRows: itemsRows.length,
            skippedNoIdCount,
            skippedNoStemCount,
          },
        },
        { status: 500 },
      );
    }

    // 5) Insert assets
    const { error: assetsError } = await supabase.from('assets').insert(assets);
    if (assetsError) {
      return NextResponse.json(
        {
          ok: false,
          error: `Insert into assets failed: ${assetsError.message}`,
        },
        { status: 500 },
      );
    }

    // 6) Insert blueprints
    const { error: blueprintsError } = await supabase.from('blueprints').insert(blueprints);
    if (blueprintsError) {
      return NextResponse.json(
        {
          ok: false,
          error: `Insert into blueprints failed: ${blueprintsError.message}`,
        },
        { status: 500 },
      );
    }

    // 7) Success
    return NextResponse.json({
      ok: true,
      csvCounts: {
        itemsCsvRows: itemsRows.length,
        assetsCsvRows: assetsRows.length,
        blueprintsCsvRows: blueprintsRows.length,
      },
      itemsInserted: items.length,
      assetsInserted: assets.length,
      blueprintsInserted: blueprints.length,
      duplicatesSkipped: duplicateIds.length,
      skippedNoIdCount,
      skippedNoStemCount,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: err?.message ?? String(err),
      },
      { status: 500 },
    );
  }
}
