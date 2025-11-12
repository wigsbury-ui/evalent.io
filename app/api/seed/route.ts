// app/api/seed/route.ts
import { NextResponse } from 'next/server';
import { env } from '../../../lib/env';
import { supabaseAdmin } from '../../../lib/supabaseClient';
import { parse as parseCsv } from 'csv-parse/sync';

type Row = Record<string, string | null | undefined>;
type AnyRec = Record<string, any>;

const NUMERIC_COLS = new Set(['script_version', 'duration_seconds', 'target_count']);
const BOOL_LIKE   = new Set(['_has_vid', '_has_share']);

/** Known asset columns in Postgres (drop anything else) */
const ASSET_ALLOWED = new Set([
  'item_id',
  'programme',
  'video_title',
  'script_audio',
  'video_id',
  'share_url',
  'download_url',
  'duration_seconds',
  'avatar_voice_id',
  'avatar_style',
  'background',
  'resolution',
  'video_thumbnail',
  'current_script_hash',
  'last_rendered_script_hash',
  'status',
  'notes',
  '_has_vid',
  '_has_share',
  '__sheet', // if you keep provenance
]);

/** ---------- helpers ---------- */
const fetchCsv = async (url: string): Promise<Row[]> => {
  const r = await fetch(url, { cache: 'no-store' });
  if (!r.ok) throw new Error(`CSV fetch failed: ${r.status} ${url}`);
  const text = await r.text();
  return parseCsv(text, { columns: true, skip_empty_lines: true }) as Row[];
};

const toSnake = (k: string) =>
  k
    .trim()
    .replace(/[\s\-\/]+/g, '_')
    .replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`) // camel/Pascal → snake
    .replace(/^_+/, '')
    .toLowerCase();

const normalizeRow = (row: Row): AnyRec => {
  const out: AnyRec = {};
  for (const [rawKey, rawVal] of Object.entries(row)) {
    const key = (rawKey ?? '').toString().trim();
    const v = (rawVal ?? '').toString().trim();
    if (!key) continue;

    if (v === '') {
      out[key] = null;
      continue;
    }

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
};

/** ---------- per-table preparation ---------- */
const prepareItems = (rows: Row[]) => {
  const prepared: AnyRec[] = [];
  const skipped: { reason: string; sample: AnyRec }[] = [];

  for (const r of rows.map(normalizeRow)) {
    const id = (r.id ?? '').toString().trim();
    if (!id) {
      skipped.push({ reason: 'missing id', sample: r });
      continue;
    }
    prepared.push({ ...r, id });
  }
  return { prepared, skipped };
};

const prepareAssets = (rows: Row[]) => {
  const preparedRaw: AnyRec[] = [];
  const skipped: { reason: string; sample: AnyRec }[] = [];
  const droppedKeySamples: AnyRec[] = [];

  for (const _r of rows.map(normalizeRow)) {
    // 1) map headers like "Download_URL", "Share URL" → snake case that matches DB
    const mapped: AnyRec = {};
    for (const [k, v] of Object.entries(_r)) {
      const snake = toSnake(k);
      mapped[snake] = v;
    }

    // 2) require item_id
    const item_id = (mapped.item_id ?? '').toString().trim();
    if (!item_id) {
      skipped.push({ reason: 'missing item_id', sample: mapped });
      continue;
    }

    // 3) filter to allowed DB columns only (unknown columns cause Supabase error)
    const filtered: AnyRec = { item_id };
    const dropped: string[] = [];
    for (const [k, v] of Object.entries(mapped)) {
      if (k === 'item_id') continue;
      if (ASSET_ALLOWED.has(k)) {
        filtered[k] = v;
      } else {
        dropped.push(k);
      }
    }
    if (dropped.length) {
      droppedKeySamples.push({ item_id, dropped });
    }

    preparedRaw.push(filtered);
  }

  // 4) de-dup by item_id (onConflict: 'item_id')
  const seen = new Set<string>();
  const prepared: AnyRec[] = [];
  const dedupedSamples: AnyRec[] = [];
  for (const a of preparedRaw) {
    if (seen.has(a.item_id)) {
      if (dedupedSamples.length < 5) dedupedSamples.push(a);
      continue;
    }
    seen.add(a.item_id);
    prepared.push(a);
  }

  return {
    prepared,
    skipped,
    dedupedCount: preparedRaw.length - prepared.length,
    dedupedSamples,
    droppedKeySamples: droppedKeySamples.slice(0, 10),
  };
};

const prepareBlueprints = (rows: Row[]) => {
  const prepared: AnyRec[] = [];
  const skipped: { reason: string; sample: AnyRec }[] = [];
  for (const r of rows.map(normalizeRow)) {
    const id = (r.id ?? '').toString().trim();
    if (!id) {
      skipped.push({ reason: 'missing id', sample: r });
      continue;
    }
    prepared.push({ ...r, id });
  }
  return { prepared, skipped };
};

/** ---------- route ---------- */
export async function GET() {
  try {
    const itemsUrl = env.SHEETS_ITEMS_CSV;
    const assetsUrl = env.SHEETS_ASSETS_CSV;
    const blueprintsUrl = env.SHEETS_BLUEPRINTS_CSV;

    const [itemsCsv, assetsCsv, blueprintsCsv] = await Promise.all([
      itemsUrl ? fetchCsv(itemsUrl) : Promise.resolve([]),
      assetsUrl ? fetchCsv(assetsUrl) : Promise.resolve([]),
      blueprintsUrl ? fetchCsv(blueprintsUrl) : Promise.resolve([]),
    ]);

    const itemsPrep = prepareItems(itemsCsv);
    const assetsPrep = prepareAssets(assetsCsv);
    const blueprintsPrep = prepareBlueprints(blueprintsCsv);

    if (itemsPrep.prepared.length) {
      const { error } = await supabaseAdmin.from('items').upsert(itemsPrep.prepared, { onConflict: 'id' });
      if (error) throw new Error(`items upsert error: ${error.message}`);
    }

    if (assetsPrep.prepared.length) {
      const { error } = await supabaseAdmin.from('assets').upsert(assetsPrep.prepared, { onConflict: 'item_id' });
      if (error) throw new Error(`assets upsert error: ${error.message}`);
    }

    if (blueprintsPrep.prepared.length) {
      const { error } = await supabaseAdmin.from('blueprints').upsert(blueprintsPrep.prepared, { onConflict: 'id' });
      if (error) throw new Error(`blueprints upsert error: ${error.message}`);
    }

    // concise visibility logs
    const assets_skipped_samples = assetsPrep.skipped.slice(0, 10);
    return NextResponse.json({
      ok: true,
      counts: {
        items_csv_rows: itemsCsv.length,
        items_prepared: itemsPrep.prepared.length,
        items_skipped_after_prepare: itemsPrep.skipped.length,

        assets_csv_rows: assetsCsv.length,
        assets_prepared: assetsPrep.prepared.length,
        assets_skipped_after_prepare: assetsPrep.skipped.length,
        assets_deduped: assetsPrep.dedupedCount,

        blueprints_csv_rows: blueprintsCsv.length,
        blueprints_prepared: blueprintsPrep.prepared.length,
        blueprints_skipped: blueprintsPrep.skipped.length,
      },
      logs: {
        assets_skipped_samples,
        assets_deduped_samples: assetsPrep.dedupedSamples,
        assets_dropped_key_samples: assetsPrep.droppedKeySamples, // shows columns we stripped (e.g., "Download_URL")
      },
    });
  } catch (e: any) {
    return new NextResponse(`Seed failed: ${e?.message ?? e}`, { status: 500 });
  }
}
