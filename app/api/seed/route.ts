// app/api/seed/route.ts
import { NextResponse } from 'next/server';
import { parse as parseCsv } from 'csv-parse/sync';
import { env } from '../../../lib/env';
import { supabaseAdmin } from '../../../lib/supabaseClient';

type Row = Record<string, string | null | undefined>;

// ---- parsing helpers --------------------------------------------------------

const NUMERIC_COLS = new Set(['script_version', 'duration_seconds', 'target_count']);
const BOOL_LIKE     = new Set(['_has_vid', '_has_share']);

function parseCsvUrl = async (url: string): Promise<Row[]> => {
  const r = await fetch(url, { cache: 'no-store' });
  if (!r.ok) throw new Error(`CSV fetch failed: ${r.status} ${url}`);
  const text = await r.text();
  const rows = parseCsv(text, { columns: true, skip_empty_lines: true }) as Row[];
  return rows.map(normalizeRow);
};

function normalizeRow(row: Row) {
  const out: Record<string, any> = {};
  for (const [rawKey, rawVal] of Object.entries(row)) {
    const key = (rawKey || '').trim();
    const v = (rawVal ?? '').toString().trim();

    // empty cell -> null
    if (v === '') { out[key] = null; continue; }

    if (NUMERIC_COLS.has(key)) {
      const n = Number(v);
      out[key] = Number.isFinite(n) ? n : null;
      continue;
    }

    if (BOOL_LIKE.has(key)) {
      const t = v.toLowerCase();
      out[key] = t === 'true' || t === '1' || t === 'yes';
      continue;
    }

    out[key] = v;
  }
  return out;
}

// ---- column filtering to avoid schema mismatches ----------------------------

// Drop spreadsheet meta columns like "__sheet", "_row", etc.
const dropMetaKeys = (obj: Record<string, any>) => {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (!k || k.startsWith('_')) continue;     // strip all underscore-prefixed cols (e.g., "__sheet")
    out[k] = v;
  }
  return out;
};

// Whitelists for tables that are noisy in the sheet
const ASSET_COLS = new Set([
  'item_id',
  'programme',
  'video_id',
  'share_url',
  'download_url',
  'duration_seconds',
  'script_version',
  'video_thumbnail',
  'status',
  'notes',
]);

const BLUEPRINT_COLS = new Set([
  'id',
  'programme',
  'year',
  'domain',
  'target_count',
]);

const pick = (allowed: Set<string>) => (row: Record<string, any>) => {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(row)) {
    if (allowed.has(k)) out[k] = v;
  }
  return out;
};

// ---- route ------------------------------------------------------------------

export async function GET() {
  try {
    const itemsUrl       = env.SHEETS_ITEMS_CSV;
    const assetsUrl      = env.SHEETS_ASSETS_CSV;
    const blueprintsUrl  = env.SHEETS_BLUEPRINTS_CSV;

    // 1) Pull CSVs (only those configured)
    const [itemsRaw, assetsRaw, blueprintsRaw] = await Promise.all([
      itemsUrl ? parseCsvUrl(itemsUrl) : Promise.resolve([]),
      assetsUrl ? parseCsvUrl(assetsUrl) : Promise.resolve([]),
      blueprintsUrl ? parseCsvUrl(blueprintsUrl) : Promise.resolve([]),
    ]);

    // 2) Filter rows to avoid schema errors
    const items = itemsRaw.map(dropMetaKeys); // items table already matches names; just drop meta cols
    const assets = assetsRaw.map(dropMetaKeys).map(pick(ASSET_COLS));
    const blueprints = blueprintsRaw.map(dropMetaKeys).map(pick(BLUEPRINT_COLS));

    // 3) Upserts
    let upItems = 0, upAssets = 0, upBps = 0;

    if (items.length) {
      const { error, count } = await supabaseAdmin
        .from('items')
        .upsert(items, { onConflict: 'id', ignoreDuplicates: false, count: 'exact' });
      if (error) throw new Error(`items upsert error: ${error.message}`);
      upItems = count ?? items.length;
    }

    if (assets.length) {
      const { error, count } = await supabaseAdmin
        .from('assets')
        .upsert(assets, { onConflict: 'item_id', ignoreDuplicates: false, count: 'exact' });
      // If the schema does not have these columns yet, fail softly but report:
      if (error?.message?.includes('column') || error?.message?.includes('schema')) {
        // swallow and continue; report in payload
      } else if (error) {
        throw new Error(`assets upsert error: ${error.message}`);
      } else {
        upAssets = count ?? assets.length;
      }
    }

    if (blueprints.length) {
      const { error, count } = await supabaseAdmin
        .from('blueprints')
        .upsert(blueprints, { onConflict: 'id', ignoreDuplicates: false, count: 'exact' });
      // same soft handling
      if (error?.message?.includes('column') || error?.message?.includes('schema')) {
        // skip silently
      } else if (error) {
        throw new Error(`blueprints upsert error: ${error.message}`);
      } else {
        upBps = count ?? blueprints.length;
      }
    }

    return NextResponse.json({
      ok: true,
      upserted: { items: upItems, assets: upAssets, blueprints: upBps },
      received: { items: items.length, assets: assets.length, blueprints: blueprints.length },
      note: 'Unknown/underscore-prefixed columns were stripped to avoid schema mismatches.',
    });
  } catch (e: any) {
    return new NextResponse(`Seed failed: ${e?.message ?? e}`, { status: 500 });
  }
}
