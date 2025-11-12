// app/api/seed/route.ts
import { NextResponse } from 'next/server';
import { env } from '../../../lib/env';
import { supabaseAdmin } from '../../../lib/supabaseClient'; // ⬅️ use the admin client
import { parse as parseCsv } from 'csv-parse/sync';

type Row = Record<string, string | null | undefined>;

const NUMERIC_COLS = new Set(['script_version', 'duration_seconds']);
const BOOL_LIKE = new Set(['_has_vid', '_has_share']); // add any other boolean flags here

async function fetchCsv(url: string) {
  const r = await fetch(url, { cache: 'no-store' });
  if (!r.ok) throw new Error(`CSV fetch failed: ${r.status} ${url}`);
  const text = await r.text();
  const rows = parseCsv(text, { columns: true, skip_empty_lines: true }) as Row[];
  return rows.map(normalizeRow);
}

function normalizeRow(row: Row) {
  const out: Record<string, any> = {};
  for (const [rawKey, rawVal] of Object.entries(row)) {
    const key = (rawKey || '').trim();
    const v = (rawVal ?? '').toString().trim();

    // empty cell -> null everywhere
    if (v === '') {
      out[key] = null;
      continue;
    }

    // numbers
    if (NUMERIC_COLS.has(key)) {
      const n = Number(v);
      out[key] = Number.isFinite(n) ? n : null;
      continue;
    }

    // booleans (accept true/false/1/0/yes/no)
    if (BOOL_LIKE.has(key)) {
      const t = v.toLowerCase();
      out[key] = t === 'true' || t === '1' || t === 'yes';
      continue;
    }

    // keep as text
    out[key] = v;
  }
  return out;
}

export async function GET() {
  try {
    const itemsUrl = env.SHEETS_ITEMS_CSV;
    const assetsUrl = env.SHEETS_ASSETS_CSV;
    const blueprintsUrl = env.SHEETS_BLUEPRINTS_CSV;

    // pull CSVs
    const [items, assets, blueprints] = await Promise.all([
      itemsUrl ? fetchCsv(itemsUrl) : Promise.resolve([]),
      assetsUrl ? fetchCsv(assetsUrl) : Promise.resolve([]),
      blueprintsUrl ? fetchCsv(blueprintsUrl) : Promise.resolve([]),
    ]);

    // upserts
    // items.id is text; keep id exactly as in sheet
    if (items.length) {
      const { error } = await supabaseAdmin
        .from('items')
        .upsert(items, { onConflict: 'id' });
      if (error) throw new Error(`items upsert error: ${error.message}`);
    }

    if (assets.length) {
      const { error } = await supabaseAdmin
        .from('assets')
        .upsert(assets, { onConflict: 'item_id' });
      if (error) throw new Error(`assets upsert error: ${error.message}`);
    }

    if (blueprints.length) {
      const { error } = await supabaseAdmin
        .from('blueprints')
        .upsert(blueprints, { onConflict: 'id' });
      if (error) throw new Error(`blueprints upsert error: ${error.message}`);
    }

    return NextResponse.json({
      ok: true,
      counts: { items: items.length, assets: assets.length, blueprints: blueprints.length },
    });
  } catch (e: any) {
    return new NextResponse(`Seed failed: ${e.message ?? e}`, { status: 500 });
  }
}
