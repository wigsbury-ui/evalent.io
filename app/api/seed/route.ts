// app/api/seed/route.ts
import { NextResponse } from 'next/server';
import { parse as parseCsv } from 'csv-parse/sync';
import { supabaseAdmin } from '../../../lib/supabaseClient';

type CsvRow = Record<string, string>;

/* ---------- helpers ---------- */

async function loadCsvFromUrl(url: string | undefined, label: string) {
  if (!url) return { rows: [], label };

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${label} CSV (${res.status})`);
  }
  const text = await res.text();
  const rows = parseCsv(text, {
    columns: true,
    skip_empty_lines: true,
  }) as CsvRow[];

  return { rows, label };
}

function normaliseId(id: string | number | null | undefined) {
  return (id ?? '').toString().trim();
}

/* These are intentionally small & forgiving. Adapt column names if needed. */
function prepareItemsCsv(rows: CsvRow[]) {
  const prepared: CsvRow[] = [];
  const skipped: CsvRow[] = [];

  for (const raw of rows) {
    const id = normaliseId(raw.item_id ?? raw.id);
    if (!id) {
      skipped.push(raw);
      continue;
    }
    prepared.push({ ...raw, item_id: id });
  }
  return { prepared, skipped };
}

function prepareAssetsCsv(rows: CsvRow[]) {
  const prepared: CsvRow[] = [];
  const skipped: CsvRow[] = [];

  for (const raw of rows) {
    const id = normaliseId(raw.item_id ?? raw.id);
    if (!id) {
      skipped.push(raw);
      continue;
    }
    prepared.push({ ...raw, item_id: id });
  }
  return { prepared, skipped };
}

function prepareBlueprintsCsv(rows: CsvRow[]) {
  const prepared: CsvRow[] = [];
  const skipped: CsvRow[] = [];

  for (const raw of rows) {
    const id = normaliseId(raw.id);
    if (!id) {
      skipped.push(raw);
      continue;
    }
    prepared.push({ ...raw, id });
  }
  return { prepared, skipped };
}

/* ---------- main handler ---------- */

async function handleSeed() {
  try {
    const itemsUrl = process.env.SHEETS_ITEMS_CSV;
    const assetsUrl = process.env.SHEETS_ASSETS_CSV;
    const blueprintsUrl = process.env.SHEETS_BLUEPRINTS_CSV;

    // 1) Load CSVs (URL or published Google-Sheet CSVs)
    const [itemsCsv, assetsCsv, blueprintsCsv] = await Promise.all([
      loadCsvFromUrl(itemsUrl, 'items'),
      loadCsvFromUrl(assetsUrl, 'assets'),
      loadCsvFromUrl(blueprintsUrl, 'blueprints'),
    ]);

    if (
      !itemsCsv.rows.length &&
      !assetsCsv.rows.length &&
      !blueprintsCsv.rows.length
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'No CSV rows found. Check SHEETS_ITEMS_CSV / SHEETS_ASSETS_CSV / SHEETS_BLUEPRINTS_CSV.',
        },
        { status: 400 },
      );
    }

    // 2) Prepare rows
    const itemsPrep = prepareItemsCsv(itemsCsv.rows);
    const assetsPrep = prepareAssetsCsv(assetsCsv.rows);
    const blueprintsPrep = prepareBlueprintsCsv(blueprintsCsv.rows);

    // 3) Upsert into Supabase using the admin client
    const [itemsRes, assetsRes, blueprintsRes] = await Promise.all([
      itemsPrep.prepared.length
        ? supabaseAdmin
            .from('items')
            .upsert(itemsPrep.prepared, { onConflict: 'item_id' })
        : Promise.resolve({ error: null }),
      assetsPrep.prepared.length
        ? supabaseAdmin
            .from('assets')
            .upsert(assetsPrep.prepared, { onConflict: 'item_id' })
        : Promise.resolve({ error: null }),
      blueprintsPrep.prepared.length
        ? supabaseAdmin
            .from('blueprints')
            .upsert(blueprintsPrep.prepared, { onConflict: 'id' })
        : Promise.resolve({ error: null }),
    ]);

    if (itemsRes.error) throw itemsRes.error;
    if (assetsRes.error) throw assetsRes.error;
    if (blueprintsRes.error) throw blueprintsRes.error;

    // 4) Return a compact summary so the Admin page shows something useful
    return NextResponse.json({
      ok: true,
      message: 'Seed from CSV completed',
      counts: {
        items_csv_rows: itemsCsv.rows.length,
        items_prepared: itemsPrep.prepared.length,
        items_skipped: itemsPrep.skipped.length,

        assets_csv_rows: assetsCsv.rows.length,
        assets_prepared: assetsPrep.prepared.length,
        assets_skipped: assetsPrep.skipped.length,

        blueprints_csv_rows: blueprintsCsv.rows.length,
        blueprints_prepared: blueprintsPrep.prepared.length,
        blueprints_skipped: blueprintsPrep.skipped.length,
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        error: e?.message ?? String(e),
      },
      { status: 500 },
    );
  }
}

/* ---------- Next.js route exports ---------- */

export async function GET() {
  return handleSeed();
}

export async function POST() {
  return handleSeed();
}
