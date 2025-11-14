// app/api/seed/route.ts
import { NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { fetchCsv } from '@/lib/fetchCsv';

type CsvRow = Record<string, string>;

// ---------- CSV parsing (same idea as your CLI) ------------------------

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // skip escaped quote
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

// ---------- Helpers -----------------------------------------------------

async function upsert(table: string, rows: any[]) {
  if (!rows.length) return;
  const { error } = await supabaseAdmin.from(table).upsert(rows);
  if (error) {
    throw new Error(`Upsert into ${table} failed: ${error.message}`);
  }
}

// ---------- Mappers (aligned with sql/schema.sql + scripts/seed.ts) -----

function buildItems(rows: CsvRow[]) {
  return rows.map((r) => {
    const id = r.item_id || r.id;

    const yearToken = (() => {
      if (id && String(id).includes('-')) {
        return String(id).split('-')[0];
      }
      return r.year || r.year_label || r.grade || 'Y7';
    })();

    const options = (() => {
      const raw =
        r.mcq_options_json ||
        r.options_joined ||
        (r.options as any) ||
        (r.mcq_options as any) ||
        '';

      // If it looks like JSON array, try to parse it
      if (typeof raw === 'string') {
        const trimmed = raw.trim();
        if (trimmed.startsWith('[')) {
          try {
            return JSON.parse(trimmed).map((x: any) => String(x));
          } catch {
            // fall through to split-on-newlines
          }
        }
      }

      return String(raw)
        .split('\n')
        .filter(Boolean)
        .map((x: any) => String(x));
    })();

    const correct =
      r.answer_key !== undefined && r.answer_key !== null && r.answer_key !== ''
        ? String(r.answer_key)
        : r.correct || r.correct_answer || null;

    const typeRaw = (r.type || 'MCQ').toString().toLowerCase();
    const type = typeRaw === 'mcq' ? 'mcq' : 'short';

    return {
      id,
      year: yearToken,
      domain: r.domain || 'English',
      stem:
        r.display_question ||
        r.stimulus_text ||
        r.stem ||
        r.text ||
        r.prompt ||
        '',
      type,
      options,
      correct,
      programme: r.programme || r.curriculum || 'UK',
    };
  });
}

function buildAssets(rows: CsvRow[]) {
  return rows.map((r) => ({
    item_id: r.item_id,
    video_title: r.video_title,
    video_id: r.video_id,
    share_url: r.share_url,
    download_url: r.download_url,
    duration_seconds: r.duration_seconds,
    avatar_voice_id: r.avatar_voice_id,
    avatar_style: r.avatar_style,
    background: r.background,
    resolution: r.resolution,
    video_thumbnail: r.video_thumbnail,
    script_audio: r.script_audio,
    script_audio_original: r.script_audio_original,
    intro: r.intro,
    outro: r.outro,
    a_intro: r.a_intro,
    b_intro: r.b_intro,
    c_intro: r.c_intro,
    d_intro: r.d_intro,
    end: r.end,
    script_version: r.script_version,
    current_script_hash: r.current_script_hash,
    last_rendered_script_hash: r.last_rendered_script_hash,
    error: r.error,
    status: r.status,
    __sheet: r.__sheet,
    programme: r.programme,
    _has_vid: String(r._has_vid).toLowerCase() === 'true',
    _has_share: String(r._has_share).toLowerCase() === 'true',
    talking_photo_id: r.talking_photo_id,
    notes: r.notes,
    player_url: r.player_url,
  }));
}

function buildBlueprints(rows: CsvRow[]) {
  return rows.map((r) => ({
    programme: r.programme,
    grade: Number(r.grade),
    subject: r.subject,
    base_count: Number(r.base_count || 0),
    easy_count: Number(r.easy_count || 0),
    core_count: Number(r.core_count || 0),
    hard_count: Number(r.hard_count || 0),
  }));
}

// ---------- Main handler --------------------------------------------------

async function handleSeed() {
  try {
    const results: any = {
      items: null,
      assets: null,
      blueprints: null,
    };

    // ITEMS
    if (env.SHEETS_ITEMS_CSV) {
      const csvText = await fetchCsv(env.SHEETS_ITEMS_CSV);
      const rows = parseCsv(csvText);
      const items = buildItems(rows);
      await upsert('items', items);
      results.items = { csvRows: rows.length, upserted: items.length };
    }

    // ASSETS
    if (env.SHEETS_ASSETS_CSV) {
      const csvText = await fetchCsv(env.SHEETS_ASSETS_CSV);
      const rows = parseCsv(csvText);
      const assets = buildAssets(rows);
      await upsert('assets', assets);
      results.assets = { csvRows: rows.length, upserted: assets.length };
    }

    // BLUEPRINTS
    if (env.SHEETS_BLUEPRINTS_CSV) {
      const csvText = await fetchCsv(env.SHEETS_BLUEPRINTS_CSV);
      const rows = parseCsv(csvText);
      const blueprints = buildBlueprints(rows);
      await upsert('blueprints', blueprints);
      results.blueprints = {
        csvRows: rows.length,
        upserted: blueprints.length,
      };
    }

    return NextResponse.json({
      ok: true,
      results,
    });
  } catch (err: any) {
    console.error('[api/seed] error', err);
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
