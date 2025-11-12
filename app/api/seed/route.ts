// app/api/seed/route.ts
import { NextResponse } from 'next/server';
import { env } from '../../../lib/env';
import { supabaseAdmin } from '../../../lib/supabaseClient';
import { parse as parseCsv } from 'csv-parse/sync';

type Row = Record<string, string | null | undefined>;

const NUMERIC_COLS = new Set([
  'script_version',
  'duration_seconds',
  'target_count',
]);

const BOOL_LIKE = new Set([
  '_has_vid',
  '_has_share',
]);

// helper-only columns we never want to send even if they exist in sheets
const DROP_KEYS = new Set<string>([
  '__sheet',
  'anchor',
  'error',
  // multi-variant intro/end/script helpers we saw in earlier runs
  'intro', 'a_intro', 'b_intro', 'c_intro', 'd_intro', 'end',
  'script_audio_original',
]);

async function fetchCsv(url: string): Promise<Row[]> {
  const r = await fetch(url, { cache: 'no-store' });
  if (!r.ok) throw new Error(`CSV fetch failed: ${r.status} ${url}`);
  const text = await r.text();
  return parseCsv(text, { columns: true, skip_empty_lines: true }) as Row[];
}

function coerceScalars(obj: Record<string, any>) {
  for (const [k, raw] of Object.entries(obj)) {
    if (raw === undefined || raw === null) continue;
    const v = String(raw).trim();

    if (v === '') { obj[k] = null; continue; }

    if (NUMERIC_COLS.has(k)) {
      const n = Number(v);
      obj[k] = Number.isFinite(n) ? n : null;
      continue;
    }

    if (BOOL_LIKE.has(k)) {
      const t = v.toLowerCase();
      obj[k] = t === 'true' || t === '1' || t === 'yes';
      continue;
    }

    obj[k] = v;
  }
}

function stripHelperCols(obj: Record<string, any>) {
  for (const k of Object.keys(obj)) {
    if (DROP_KEYS.has(k)) delete obj[k];
  }
}

/**
 * Read live column names from a table by selecting 1 row.
 * If the table is empty, fall back to a minimal allow-list.
 */
async function getTableColumns(table: 'items' | 'assets' | 'blueprints'): Promise<Set<string>> {
  const { data, error } = await supabaseAdmin.from(table).select('*').limit(1);
  if (!error && data && data.length > 0) {
    return new Set(Object.keys(data[0] as Record<string, any>));
  }
  // minimal safe fallback if table is empty (adjust if needed later)
  if (table === 'items') return new Set(['id']);
  if (table === 'assets') return new Set(['item_id']);
  return new Set(['id']);
}

/**
 * Prepare a row for a specific table; return null to skip.
 * Then filter keys to only those that exist in the live schema.
 */
function prepareForTable(
  table: 'items' | 'assets' | 'blueprints',
  row: Row,
  columnSet: Set<string>,
) {
  // clone → trim all keys
  const tmp: Record<string, any> = {};
  for (const [k, v] of Object.entries(row)) {
    const key = (k || '').trim();
    tmp[key] = v;
  }

  // hard drop helper sheet-only keys
  stripHelperCols(tmp);

  // coerce scalars (numbers/bools)
  coerceScalars(tmp);

  if (table === 'items') {
    // items.id is required: map item_id → id if present
    const candidate = (tmp['id'] ?? tmp['item_id'] ?? '').toString().trim();
    if (!candidate) return null;
    tmp['id'] = candidate;
    delete tmp['item_id'];
  }

  if (table === 'assets') {
    const fk = (tmp['item_id'] ?? '').toString().trim();
    if (!fk) return null;
    tmp['item_id'] = fk;
  }

  // remove empty strings after coercion
  for (const [k, v] of Object.entries(tmp)) {
    if (v === '') tmp[k] = null;
  }

  // **schema filter**: only keep keys that are real columns
  const out: Record<string, any> = {};
  for (const k of Object.keys(tmp)) {
    if (columnSet.has(k)) out[k] = tmp[k];
  }

  // if after filtering we lost required keys, skip
  if (table === 'items' && !out['id']) return null;
  if (table === 'assets' && !out['item_id']) return null;

  return out;
}

export async function GET() {
  try {
    const itemsCsv = env.SHEETS_ITEMS_CSV || '';
    const assetsCsv = env.SHEETS_ASSETS_CSV || '';
    const blueprintsCsv = env.SHEETS_BLUEPRINTS_CSV || '';

    const [itemsCols, assetsCols, bpsCols] = await Promise.all([
      getTableColumns('items'),
      getTableColumns('assets'),
      getTableColumns('blueprints'),
    ]);

    const [itemsRaw, assetsRaw, bpsRaw] = await Promise.all([
      itemsCsv ? fetchCsv(itemsCsv) : Promise.resolve([]),
      assetsCsv ? fetchCsv(assetsCsv) : Promise.resolve([]),
      blueprintsCsv ? fetchCsv(blueprintsCsv) : Promise.resolve([]),
    ]);

    const itemsPrepared = itemsRaw
      .map(r => prepareForTable('items', r, itemsCols))
      .filter((r): r is Record<string, any> => !!r);

    const assetsPrepared = assetsRaw
      .map(r => prepareForTable('assets', r, assetsCols))
      .filter((r): r is Record<string, any> => !!r);

    const bpsPrepared = bpsRaw
      .map(r => prepareForTable('blueprints', r, bpsCols))
      .filter((r): r is Record<string, any> => !!r);

    if (itemsPrepared.length) {
      const { error } = await supabaseAdmin
        .from('items')
        .upsert(itemsPrepared, { onConflict: 'id' });
      if (error) throw new Error(`items upsert error: ${error.message}`);
    }

    if (assetsPrepared.length) {
      const { error } = await supabaseAdmin
        .from('assets')
        .upsert(assetsPrepared, { onConflict: 'item_id' });
      if (error) throw new Error(`assets upsert error: ${error.message}`);
    }

    if (bpsPrepared.length) {
      const { error } = await supabaseAdmin
        .from('blueprints')
        .upsert(bpsPrepared, { onConflict: 'id' });
      if (error) throw new Error(`blueprints upsert error: ${error.message}`);
    }

    return NextResponse.json({
      ok: true,
      counts: {
        items_csv_rows: itemsRaw.length,
        items_upserted: itemsPrepared.length,
        items_skipped: itemsRaw.length - itemsPrepared.length,
        assets_csv_rows: assetsRaw.length,
        assets_upserted: assetsPrepared.length,
        assets_skipped: assetsRaw.length - assetsPrepared.length,
        blueprints_csv_rows: bpsRaw.length,
        blueprints_upserted: bpsPrepared.length,
        blueprints_skipped: bpsRaw.length - bpsPrepared.length,
      },
    });
  } catch (e: any) {
    return new NextResponse(`Seed failed: ${e.message ?? e}`, { status: 500 });
  }
}
