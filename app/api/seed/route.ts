// app/api/seed/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { env } from '@/lib/env';

type CsvRow = Record<string, string>;

// ---------- CSV helpers ----------

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

function clean(v: string | undefined): string | null {
  if (!v) return null;
  const t = v.trim();
  return t === '' ? null : t;
}

// ---------- PREP: items ----------

function prepareItems(rows: CsvRow[]) {
  const seenIds = new Set<string>();
  const prepared: any[] = [];

  for (const r of rows) {
    const id = (r['item_id'] || r['id'] || '').trim();
    if (!id || seenIds.has(id)) continue;
    seenIds.add(id);

    // options: from mcq_options_json (confirmed) or fallbacks
    let options: string[] | null = null;
    const rawOptions =
      r['mcq_options_json'] ||
      r['options_joined'] ||
      r['options'] ||
      r['mcq_options'] ||
      '';

    if (rawOptions) {
      try {
        if (rawOptions.trim().startsWith('[')) {
          const parsed = JSON.parse(rawOptions);
          options = Array.isArray(parsed)
            ? parsed.map((x: any) => String(x))
            : null;
        } else {
          options = String(rawOptions)
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean);
        }
      } catch {
        // swallow, leave options = null
      }
    }

    const correct =
      r['answer_key'] ??
      r['correct'] ??
      r['correct_answer'] ??
      null;

    const yearToken =
      (id.includes('-') && id.split('-')[0]) ||
      r['year'] ||
      r['year_label'] ||
      r['grade'] ||
      'Y7';

    prepared.push({
      id,
      year: yearToken,
      domain: r['domain'] || 'English',
      stem:
        r['display_question'] ||
        r['stimulus_text'] ||
        r['stem'] ||
        r['text'] ||
        r['prompt'] ||
        '',
      type:
        (r['type'] || 'mcq').toString().toLowerCase() === 'mcq'
          ? 'mcq'
          : 'short',
      options: options ? JSON.stringify(options) : null,
      correct: correct != null ? String(correct) : null,
      programme: r['programme'] || r['curriculum'] || 'UK',
    });
  }

  return prepared;
}

// ---------- PREP: assets ----------

function prepareAssets(rows: CsvRow[]) {
  const seenItemIds = new Set<string>();
  const prepared: any[] = [];

  for (const r of rows) {
    const itemId = (r['item_id'] || '').trim();
    if (!itemId || seenItemIds.has(itemId)) continue;
    seenItemIds.add(itemId);

    const videoUrl =
      clean(r['player_url']) ||
      clean(r['Video_URL']) ||
      clean(r['video_url']) ||
      clean(r['Share_URL']) ||
      clean(r['share_url']);

    prepared.push({
      // id will be auto-generated (uuid)
      item_id: itemId,
      video_title: clean(r['video_title']),
      video_id: clean(r['video_id']),
      share_url: clean(r['share_url']) || clean(r['Share_URL']),
      download_url: clean(r['download_url']) || clean(r['Download_URL']),
      video_thumbnail:
        clean(r['video_thumbnail']) || clean(r['Thumbnail_URL']),
      player_url: videoUrl,
      duration_seconds: clean(r['duration_seconds']),
      avatar_voice_id: clean(r['avatar_voice_id']),
      avatar_style: clean(r['avatar_style']),
      background: clean(r['background']),
      resolution: clean(r['resolution']),
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
      status: clean(r['status']) || clean(r['Status']),
      __sheet: clean(r['__sheet']),
      programme: clean(r['programme']),
      _has_vid:
        String(r['_has_vid']).toLowerCase() === 'true' ? true : false,
      _has_share:
        String(r['_has_share']).toLowerCase() === 'true' ? true : false,
      talking_photo_id: clean(r['talking_photo_id']),
      notes: clean(r['notes']) || clean(r['Notes']),
      regenerate: clean(r['regenerate']) || clean(r['Regenerate']),
    });
  }

  return prepared;
}

// ---------- PREP: blueprints ----------

function prepareBlueprints(rows: CsvRow[]) {
  const prepared: any[] = [];

  for (const r of rows) {
    if (!r['programme'] || !r['grade'] || !r['subject']) continue;

    prepared.push({
      programme: r['programme'],
      grade: Number(r['grade']),
      subject: r['subject'],
      base_count: Number(r['base_count'] || 0),
      easy_count: Number(r['easy_count'] || 0),
      core_count: Number(r['core_count'] || 0),
      hard_count: Number(r['hard_count'] || 0),
    });
  }

  return prepared;
}

// ---------- MAIN HANDLER ----------

async function handleSeed() {
  try {
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

    const itemsPrepared = prepareItems(itemsCsv);
    const assetsPrepared = prepareAssets(assetsCsv);
    const blueprintsPrepared = prepareBlueprints(blueprintsCsv);

    const inserted: Record<string, number> = {};

    // Wipe and re-insert for simplicity
    if (itemsPrepared.length) {
      await supabaseAdmin.from('items').delete().neq('id', '');
      const { error } = await supabaseAdmin
        .from('items')
        .insert(itemsPrepared);
      if (error) throw new Error(`Insert into items failed: ${error.message}`);
      inserted.items = itemsPrepared.length;
    }

    if (assetsPrepared.length) {
      await supabaseAdmin.from('assets').delete().neq('item_id', '');
      const { error } = await supabaseAdmin
        .from('assets')
        .insert(assetsPrepared);
      if (error)
        throw new Error(`Insert into assets failed: ${error.message}`);
      inserted.assets = assetsPrepared.length;
    }

    if (blueprintsPrepared.length) {
      await supabaseAdmin.from('blueprints').delete().neq('programme', '');
      const { error } = await supabaseAdmin
        .from('blueprints')
        .insert(blueprintsPrepared);
      if (error)
        throw new Error(`Insert into blueprints failed: ${error.message}`);
      inserted.blueprints = blueprintsPrepared.length;
    }

    return NextResponse.json({
      ok: true,
      csvCounts: {
        itemsCsvRows: itemsCsv.length,
        assetsCsvRows: assetsCsv.length,
        blueprintsCsvRows: blueprintsCsv.length,
      },
      inserted,
    });
  } catch (err: any) {
    console.error('[seed] error', err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? 'Unknown error in seed endpoint' },
      { status: 500 },
    );
  }
}

export async function GET() {
  return handleSeed();
}

export async function POST() {
  return handleSeed();
}
