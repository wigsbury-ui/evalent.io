// app/api/seed/route.ts

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { fetchCsv } from '@/lib/fetchCsv';

type AnyRec = Record<string, any>;

/**
 * This route seeds the DB from the Google Sheets CSV exports.
 *
 * It is deliberately conservative:
 * - Only a whitelisted set of columns is allowed for each table.
 * - Unknown columns are logged but ignored (so Sheets can have extra helper cols).
 * - Upserts are keyed on `id` for items/assets/blueprints so we can re-run safely.
 */

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const SHEETS_ITEMS_CSV = process.env.SHEETS_ITEMS_CSV!;
const SHEETS_ASSETS_CSV = process.env.SHEETS_ASSETS_CSV!;
const SHEETS_BLUEPRINTS_CSV = process.env.SHEETS_BLUEPRINTS_CSV!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const ITEM_ALLOWED = new Set([
  'id',
  'programme',
  'year',
  'grade',
  'subject',
  'domain',
  'strand',
  'standard_code_raw',
  'difficulty',
  'kind',
  'question',
  'option_a',
  'option_b',
  'option_c',
  'option_d',
  'answer_key',
  'mcq_options_json',
  'short_answer_expected',
  'long_answer_expected',
  'exemplar_answer',
  'notes',
]);

// NOTE: we now include video_url and normalise Video_URL → video_url → share_url.
const ASSET_ALLOWED = new Set([
  'id',
  'item_id',
  'programme',
  'video_title',
  'script_audio',
  'video_id',
  'video_url',      // <-- added
  'share_url',
  'download_url',
  'duration_seconds',
  'avatar_voice_id',
  'avatar_style',
  'background',
  'resolution',
  'video_thumbnail',
  'player_url',
  'current_script_hash',
  'last_rendered_script_hash',
  'status',
  'notes',
]);

const BLUEPRINT_ALLOWED = new Set([
  'id',
  'school_id',
  'programme',
  'year',
  'name',
  'description',
  'target_items',
  'target_minutes',
  'english_items',
  'maths_items',
  'reasoning_items',
  'readiness_items',
  'created_at',
]);

// Better snake_case converter so "Video_URL" -> "video_url" (not "video__u_r_l")
const toSnake = (k: string) =>
  k
    .trim()
    // turn spaces, dashes and slashes into single underscores
    .replace(/[\s\-\/]+/g, '_')
    // insert underscores at camelCase boundaries, e.g. "VideoURL" -> "Video_URL"
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toLowerCase()
    // collapse any double-underscores that may have been introduced ("video__url" -> "video_url")
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

// --- helpers -------------------------------------------------------------

const coerceBoolean = (v: any): boolean | null => {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'boolean') return v;
  const s = String(v).trim().toLowerCase();
  if (['y', 'yes', 'true', '1'].includes(s)) return true;
  if (['n', 'no', 'false', '0'].includes(s)) return false;
  return null;
};

const coerceNumber = (v: any): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const parseJson = (v: any): any | null => {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v !== 'string') return v;
  try {
    return JSON.parse(v);
  } catch {
    return null;
  }
};

// --- prepare ITEMS -------------------------------------------------------

function prepareItems(rows: AnyRec[]) {
  const droppedKeySamples: Record<string, number> = {};
  const cleaned: AnyRec[] = [];

  for (const row of rows) {
    const mapped: AnyRec = {};

    for (const [rawKey, rawVal] of Object.entries(row)) {
      const key = toSnake(rawKey);

      if (!ITEM_ALLOWED.has(key)) {
        droppedKeySamples[key] = (droppedKeySamples[key] ?? 0) + 1;
        continue;
      }

      let v: any = rawVal;
      switch (key) {
        case 'difficulty':
          v = v || 'Core';
          break;
        case 'mcq_options_json':
          v = parseJson(v);
          break;
        default:
          break;
      }

      mapped[key] = v;
    }

    if (!mapped.id) continue; // must have id

    // Normalise kind: MCQ vs SHORT vs LONG
    if (!mapped.kind) {
      if (mapped.mcq_options_json) mapped.kind = 'MCQ';
      else if (mapped.long_answer_expected) mapped.kind = 'LONG';
      else mapped.kind = 'SHORT';
    }

    cleaned.push(mapped);
  }

  return { cleaned, droppedKeySamples };
}

// --- prepare ASSETS ------------------------------------------------------

function prepareAssets(rows: AnyRec[]) {
  const droppedKeySamples: Record<string, number> = {};
  const cleaned: AnyRec[] = [];

  for (const row of rows) {
    const _r = row;

    const mapped: AnyRec = {};
    for (const [k, v] of Object.entries(_r)) {
      const snake = toSnake(k);
      mapped[snake] = v;
    }

    // normalise video/share URLs: if we have video_url but no share_url, copy it across
    if (mapped.video_url && !mapped.share_url) {
      mapped.share_url = mapped.video_url;
    }

    // 2) require item_id
    if (!mapped.item_id) {
      continue;
    }

    // 3) filter allowed keys + type coercion
    const filtered: AnyRec = { item_id: mapped.item_id };

    for (const [k, v] of Object.entries(mapped)) {
      if (!ASSET_ALLOWED.has(k)) {
        droppedKeySamples[k] = (droppedKeySamples[k] ?? 0) + 1;
        continue;
      }

      let val: any = v;
      switch (k) {
        case 'duration_seconds':
          val = coerceNumber(v);
          break;
        default:
          break;
      }

      filtered[k] = val;
    }

    cleaned.push(filtered);
  }

  return { cleaned, droppedKeySamples };
}

// --- prepare BLUEPRINTS --------------------------------------------------

function prepareBlueprints(rows: AnyRec[]) {
  const droppedKeySamples: Record<string, number> = {};
  const cleaned: AnyRec[] = [];

  for (const row of rows) {
    const mapped: AnyRec = {};
    for (const [rawKey, rawVal] of Object.entries(row)) {
      const key = toSnake(rawKey);

      if (!BLUEPRINT_ALLOWED.has(key)) {
        droppedKeySamples[key] = (droppedKeySamples[key] ?? 0) + 1;
        continue;
      }

      let v: any = rawVal;
      switch (key) {
        case 'target_items':
        case 'target_minutes':
        case 'english_items':
        case 'maths_items':
        case 'reasoning_items':
        case 'readiness_items':
          v = coerceNumber(v);
          break;
        default:
          break;
      }

      mapped[key] = v;
    }

    if (!mapped.id) continue;
    cleaned.push(mapped);
  }

  return { cleaned, droppedKeySamples };
}

// --- route handler -------------------------------------------------------

export async function POST() {
  try {
    // 1) fetch CSV from Sheets
    const [itemsCsv, assetsCsv, blueprintsCsv] = await Promise.all([
      fetchCsv(SHEETS_ITEMS_CSV),
      fetchCsv(SHEETS_ASSETS_CSV),
      fetchCsv(SHEETS_BLUEPRINTS_CSV),
    ]);

    // 2) normalise / filter / coerce
    const {
      cleaned: items,
      droppedKeySamples: itemDrops,
    } = prepareItems(itemsCsv.rows);

    const {
      cleaned: assets,
      droppedKeySamples: assetDrops,
    } = prepareAssets(assetsCsv.rows);

    const {
      cleaned: blueprints,
      droppedKeySamples: blueprintDrops,
    } = prepareBlueprints(blueprintsCsv.rows);

    // 3) upsert into Supabase
    const [itemsRes, assetsRes, blueprintsRes] = await Promise.all([
      supabase.from('items').upsert(items, { onConflict: 'id' }),
      supabase.from('assets').upsert(assets, { onConflict: 'id' }),
      supabase.from('blueprints').upsert(blueprints, { onConflict: 'id' }),
    ]);

    if (itemsRes.error) throw itemsRes.error;
    if (assetsRes.error) throw assetsRes.error;
    if (blueprintsRes.error) throw blueprintsRes.error;

    const summary = {
      counts: {
        items: items.length,
        assets: assets.length,
        blueprints: blueprints.length,
      },
      drops: {
        items: itemDrops,
        assets: assetDrops,
        blueprints: blueprintDrops,
      },
    };

    return NextResponse.json(summary);
  } catch (error: any) {
    console.error('Seed from CSV failed', error);
    return NextResponse.json(
      { error: String(error?.message ?? error) },
      { status: 500 },
    );
  }
}

export const dynamic = 'force-dynamic';
