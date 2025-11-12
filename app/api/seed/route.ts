// app/api/seed/route.ts
import { NextResponse } from 'next/server';
import { env } from '../../../lib/env';
import { supabaseAdmin } from '../../../lib/supabaseClient';
import { parse as parseCsv } from 'csv-parse/sync';

type Row = Record<string, string | null | undefined>;
type AnyRec = Record<string, any>;

const NUMERIC_COLS = new Set(['script_version', 'duration_seconds', 'target_count']);
const BOOL_LIKE = new Set(['_has_vid', '_has_share']);

/** ---------- CSV helpers ---------- */
const fetchCsv = async (url: string): Promise<Row[]> => {
  const r = await fetch(url, { cache: 'no-store' });
  if (!r.ok) throw new Error(`CSV fetch failed: ${r.status} ${url}`);
  const text = await r.text();
  return parseCsv(text, { columns: true, skip_empty_lines: true }) as Row[];
};

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

/** ---------- Prepare rows for specific tables ---------- */
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
  const prepared: AnyRec[] = [];
  const skipped: { reason: string; sample: AnyRec }[] = [];

  for (const r of rows.map(normalizeRow)) {
    const item_id = (r.item_id ?? '').toString().trim();
    if (!item_id) {
      skipped.push({ reason: 'missing item_id', sample: r });
      continue;
    }
    prepared.push({ ...r, item_id });
  }

  // Deduplicate to align with onConflict: 'item_id'
  const seen = new Set<string>();
  const deduped: AnyRec[] = [];
  const dedupedOut: AnyRec[] = [];
  for (const a of prepared) {
    if (seen.has(a.item_id)) {
      dedupedOut.push(a);
      continue;
    }
    seen.add(a.item_id);
    deduped.push(a);
  }

  return { prepared: deduped, skipped, dedupedCount: dedupedOut.length, dedupedSamples: dedupedOut.slice(0, 5) };
};

const prepareBlueprints = (rows: Row[]) => {
  // Blueprints are simple pass-through with id mandatory
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

/** ---------- Route ---------- */
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

    // Prepare
    const itemsPrep = prepareItems(itemsCsv);
    const assetsPrep = prepareAssets(assetsCsv);
    const blueprintsPrep = prepareBlueprints(blueprintsCsv);

    // Upserts
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

    // Small log block: show a concise sample of skipped/filtered assets
    const assets_skipped_samples = assetsPrep.skipped.slice(0, 10).map(s => {
      const { reason, sample } = s;
      // Return only lightweight fields for readability
      return {
        reason,
        item_id: (sample.item_id ?? '').toString().trim() || null,
        programme: sample.programme ?? null,
        answer_key: sample.answer_key ?? null,
        // keep a tiny echo of the row id/label if present
        id: sample.id ?? null,
        label: sample.label ?? null,
      };
    });

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
        assets_skipped_samples,                 // <= requested small log block
        assets_deduped_samples: assetsPrep.dedupedSamples, // tiny extra for visibility
      },
    });
  } catch (e: any) {
    return new NextResponse(`Seed failed: ${e?.message ?? e}`, { status: 500 });
  }
}
