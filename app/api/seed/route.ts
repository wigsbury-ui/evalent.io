// app/api/seed/route.ts
import { NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { supabaseAdmin } from '@/lib/supabaseClient';

type CsvRow = Record<string, string | undefined>;

// ---------- CSV helpers ----------------------------------------------------

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (ch === '"') {
      // handle escaped quotes ("")
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
    throw new Error(`CSV fetch failed: ${res.status} ${res.statusText}`);
  }
  const text = await res.text();
  return parseCsv(text);
}

function clean(v: string | undefined | null): string | null {
  if (v == null) return null;
  const t = String(v).trim();
  return t === '' ? null : t;
}

// ---------- Prepare ITEMS (matches public.items) ---------------------------

function prepareItems(rows: CsvRow[]) {
  const seenIds = new Set<string>();
  const out: any[] = [];

  for (const r of rows) {
    const id = (r['item_id'] || r['id'] || '').trim();
    if (!id || seenIds.has(id)) continue;
    seenIds.add(id);

    // Year token (e.g. "Y7-ENG-..." -> "Y7")
    const yearToken =
      (id.includes('-') ? id.split('-')[0] : undefined) ||
      r['year'] ||
      r['year_label'] ||
      r['grade'] ||
      'Y7';

    // Options: try JSON array first, else split on newlines
    const options = (() => {
      const raw =
        r['mcq_options_json'] ||
        r['options_joined'] ||
        r['options'] ||
        r['mcq_options'] ||
        '';

      if (typeof raw === 'string') {
        const trimmed = raw.trim();
        if (trimmed.startsWith('[')) {
          try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) {
              return parsed.map((x) => String(x));
            }
          } catch {
            // fall through to newline split
          }
        }
        return trimmed
          .split('\n')
          .map((x) => x.trim())
          .filter(Boolean);
      }

      return [];
    })();

    const correct =
      r['answer_key'] !== undefined && r['answer_key'] !== null
        ? String(r['answer_key'])
        : r['correct'] || r['correct_answer'] || null;

    const typeRaw = (r['type'] || 'MCQ').toString().toLowerCase();
    const type: 'mcq' | 'short' = typeRaw === 'mcq' ? 'mcq' : 'short';

    const stem =
      r['display_question'] ||
      r['stimulus_text'] ||
      r['stem'] ||
      r['text'] ||
      r['prompt'] ||
      '';

    out.push({
      id,
      year: String(yearToken),
      domain: (r['domain'] || 'English').toString(),
      stem: String(stem),
      type,
      options,
      correct: correct == null ? null : String(correct),
      programme: (r['programme'] || r['curriculum'] || 'UK').toString(),
    });
  }

  return out;
}

// ---------- Prepare ASSETS (matches public.assets) -------------------------

function prepareAssets(rows: CsvRow[]) {
  const seenItemIds = new Set<string>();
  const out: any[] = [];

  for (const r of rows) {
    const itemId = (r['item_id'] || '').trim();
    if (!itemId || seenItemIds.has(itemId)) continue;
    seenItemIds.add(itemId);

    out.push({
      item_id: itemId,
      video_title: clean(r['video_title']),
      video_id: clean(r['video_id']),
      share_url: clean(r['share_url']),
      download_url: clean(r['download_url']),
      duration_seconds: clean(r['duration_seconds']),
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
      _has_vid:
        String(r['_has_vid'] ?? '')
          .trim()
          .toLowerCase() === 'true',
      _has_share:
        String(r['_has_share'] ?? '')
          .trim()
          .toLowerCase() === 'true',
      talking_photo_id: clean(r['talking_photo_id']),
      notes: clean(r['notes']),
      player_url: clean(r['player_url']),
      // IMPORTANT: we deliberately do NOT send any `regenerate` field here,
      // because there is no `regenerate` column in the Supabase `assets` table.
    });
  }

  return out;
}

// ---------- Prepare BLUEPRINTS (matches public.blueprints) -----------------

function prepareBlueprints(rows: CsvRow[]) {
  const seenKeys = new Set<string>();
  const out: any[] = [];

  for (const r of rows) {
    // Minimal uniqueness: programme + grade + subject
    const key = `${r['programme'] || ''}|${r['grade'] || ''}|${
      r['subject'] || ''
    }`;
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);

    out.push({
      programme: r['programme'],
      grade: Number(r['grade'] ?? 0),
      subject: r['subject'],
      base_count: Number(r['base_count'] ?? 0),
      easy_count: Number(r['easy_count'] ?? 0),
      core_count: Number(r['core_count'] ?? 0),
      hard_count: Number(r['hard_count'] ?? 0),
    });
  }

  return out;
}

// ---------- Upsert helper --------------------------------------------------

async function upsert(table: string, rows: any[]) {
  if (!rows.length) return { count: 0 };
  const { error } = await supabaseAdmin.from(table).upsert(rows);
  if (error) {
    throw new Error(`Upsert into ${table} failed: ${error.message}`);
  }
  return { count: rows.length };
}

// ---------- Main handler ---------------------------------------------------

async function handleSeed() {
  try {
    const itemsUrl = env.SHEETS_ITEMS_CSV;
    const assetsUrl = env.SHEETS_ASSETS_CSV;
    const blueprintsUrl = env.SHEETS_BLUEPRINTS_CSV;

    if (!itemsUrl && !assetsUrl && !blueprintsUrl) {
      throw new Error(
        'No SHEETS_*_CSV env vars set. Please set SHEETS_ITEMS_CSV, SHEETS_ASSETS_CSV, SHEETS_BLUEPRINTS_CSV.'
      );
    }

    const [itemsCsv, assetsCsv, blueprintsCsv] = await Promise.all([
      fetchCsv(itemsUrl),
      fetchCsv(assetsUrl),
      fetchCsv(blueprintsUrl),
    ]);

    const itemsPrepared = prepareItems(itemsCsv);
    const assetsPrepared = prepareAssets(assetsCsv);
    const blueprintsPrepared = prepareBlueprints(blueprintsCsv);

    const itemsResult = await upsert('items', itemsPrepared);
    const assetsResult = await upsert('assets', assetsPrepared);
    const blueprintsResult = await upsert('blueprints', blueprintsPrepared);

    return NextResponse.json({
      ok: true,
      csvCounts: {
        itemsCsvRows: itemsCsv.length,
        assetsCsvRows: assetsCsv.length,
        blueprintsCsvRows: blueprintsCsv.length,
      },
      upserted: {
        items: itemsResult.count,
        assets: assetsResult.count,
        blueprints: blueprintsResult.count,
      },
    });
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
