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

// columns that must NEVER be sent to the DB
const DROP_KEYS = new Set([
  '__sheet',
  'anchor',
  'error',
  'intro',
  'a_intro',
  'b_intro',
  'c_intro',
  'd_intro',
  'end',
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
 * Prepare a row for a specific table; return null to skip.
 */
function prepareForTable(table: 'items' | 'assets' | 'blueprints', row: Row) {
  // clone → trim all keys
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(row)) {
    const key = (k || '').trim();
    out[key] = v;
  }

  // drop helpers
  stripHelperCols(out);

  // coerce obvious scalars
  coerceScalars(out);

  if (table === 'items') {
    // rename item_id -> id (DB expects 'id')
    const candidate = (out['id'] ?? out['item_id'] ?? '').toString().trim();
    if (!candidate) return null; // skip rows with no id
    out['id'] = candidate;
    delete out['item_id'];
  }

  if (table === 'assets') {
    // assets must have a valid item_id FK
    const fk = (out['item_id'] ?? '').toString().trim();
    if (!fk) return null; // skip orphan assets
    out['item_id'] = fk;
  }

  // remove empty-string keys after coercion
  for (const [k, v] of Object.entries(out)) {
    if (v === '') out[k] = null;
  }

  return out;
}

export async function GET() {
  try {
    const itemsCsv = env.SHEETS_ITEMS_CSV || '';
    const assetsCsv = env.SHEETS_ASSETS_CSV || '';
    const blueprintsCsv = env.SHEETS_BLUEPRINTS_CSV || '';

    const [itemsRaw, assetsRaw, bpsRaw] = await Promise.all([
      itemsCsv ? fetchCsv(itemsCsv) : Promise.resolve([]),
      assetsCsv ? fetchCsv(assetsCsv) : Promise.resolve([]),
      blueprintsCsv ? fetchCsv(blueprintsCsv) : Promise.resolve([]),
    ]);

    const itemsPrepared = itemsRaw
      .map(r => prepareForTable('items', r))
      .filter((r): r is Record<string, any> => !!r);

    const assetsPrepared = assetsRaw
      .map(r => prepareForTable('assets', r))
      .filter((r): r is Record<string, any> => !!r);

    const bpsPrepared = bpsRaw
      .map(r => prepareForTable('blueprints', r))
      .filter((r): r is Record<string, any> => !!r);

    // upserts
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
