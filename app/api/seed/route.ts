// app/api/seed/route.ts
import { NextResponse } from 'next/server';
import { parse as parseCsv } from 'csv-parse/sync';
import { env } from '../../../lib/env';
import { supabaseAdmin } from '../../../lib/supabaseClient';

type Row = Record<string, string | null | undefined>;

// ---------- CSV helpers ------------------------------------------------------

const NUMERIC_COLS = new Set(['script_version', 'duration_seconds', 'target_count']);
const BOOL_LIKE     = new Set(['_has_vid', '_has_share']);

const parseCsvUrl = async (url: string): Promise<Row[]> => {
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

    if (!key) continue;                  // skip empty headers
    if (v === '') { out[key] = null; continue; }     // empty -> null

    if (NUMERIC_COLS.has(key)) {         // numbers
      const n = Number(v);
      out[key] = Number.isFinite(n) ? n : null;
      continue;
    }

    if (BOOL_LIKE.has(key)) {            // booleans
      const t = v.toLowerCase();
      out[key] = t === 'true' || t === '1' || t === 'yes';
      continue;
    }

    out[key] = v;                        // text
  }
  return out;
}

// Remove meta/temporary columns commonly present in sheets/exports
const stripMeta = (o: Record<string, any>) => {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(o)) {
    if (k.startsWith('_')) continue;     // drop __sheet, _row, etc.
    out[k] = v;
  }
  return out;
};

// Fetch the actual column list of a table (by reading one row)
async function getTableColumns(table: string): Promise<Set<string>> {
  const { data, error } = await supabaseAdmin.from(table).select('*').limit(1);
  if (error) throw new Error(`schema probe failed for ${table}: ${error.message}`);
  const sample = (data && data[0]) || {};
  return new Set(Object.keys(sample));
}

// Keep only keys that exist in the table
const keepOnly = (allowed: Set<string>) => (row: Record<string, any>) => {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(row)) if (allowed.has(k)) out[k] = v;
  return out;
};

// ---------- Route ------------------------------------------------------------

export async function GET() {
  try {
    const itemsUrl = env.SHEETS_ITEMS_CSV;
    const assetsUrl = env.SHEETS_ASSETS_CSV;
    const blueprintsUrl = env.SHEETS_BLUEPRINTS_CSV;

    // Parse CSVs that are configured
    const [itemsCsv, assetsCsv, blueprintsCsv] = await Promise.all([
      itemsUrl ? parseCsvUrl(itemsUrl) : Promise.resolve([]),
      assetsUrl ? parseCsvUrl(assetsUrl) : Promise.resolve([]),
      blueprintsUrl ? parseCsvUrl(blueprintsUrl) : Promise.resolve([]),
    ]);

    // Strip meta keys first
    const itemsRaw = itemsCsv.map(stripMeta);
    const assetsRaw = assetsCsv.map(stripMeta);
    const blueprintsRaw = blueprintsCsv.map(stripMeta);

    // Probe live schema & filter to real columns to avoid “column not found”
    const [itemCols, assetCols, blueprintCols] = await Promise.all([
      itemsRaw.length ? getTableColumns('items') : Promise.resolve(new Set<string>()),
      assetsRaw.length ? getTableColumns('assets') : Promise.resolve(new Set<string>()),
      blueprintsRaw.length ? getTableColumns('blueprints') : Promise.resolve(new Set<string>()),
    ]);

    const items = itemCols.size ? itemsRaw.map(keepOnly(itemCols)) : [];
    const assets = assetCols.size ? assetsRaw.map(keepOnly(assetCols)) : [];
    const blueprints = blueprintCols.size ? blueprintsRaw.map(keepOnly(blueprintCols)) : [];

    // Upserts
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
      if (error) throw new Error(`assets upsert error: ${error.message}`);
      upAssets = count ?? assets.length;
    }

    if (blueprints.length) {
      const { error, count } = await supabaseAdmin
        .from('blueprints')
        .upsert(blueprints, { onConflict: 'id', ignoreDuplicates: false, count: 'exact' });
      if (error) throw new Error(`blueprints upsert error: ${error.message}`);
      upBps = count ?? blueprints.length;
    }

    return NextResponse.json({
      ok: true,
      upserted: { items: upItems, assets: upAssets, blueprints: upBps },
      received: { items: itemsRaw.length, assets: assetsRaw.length, blueprints: blueprintsRaw.length },
      note: 'Rows were filtered to match live table schemas; unknown columns (e.g., "anchor", "__sheet") were dropped.',
    });
  } catch (e: any) {
    return new NextResponse(`Seed failed: ${e?.message ?? e}`, { status: 500 });
  }
}
