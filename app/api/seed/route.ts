import { NextResponse } from 'next/server'
import parse from 'csv-parse/sync'
import { env } from '../../../lib/env'
import { supabaseAdmin } from '../../../lib/supabaseClient'

type Row = Record<string, string>

// --- Helpers --------------------------------------------------------------

const NUMERIC_COLS = new Set(['script_version', 'duration_seconds'])

/**
 * Convert arbitrary spreadsheet header into snake_case Postgres column name.
 * - Inserts underscores between lower/upper boundaries: "VideoURL" -> "video_url"
 * - Replaces non-alphanumeric characters with '_'
 * - Ensures the name does not start with a digit.
 */
function toSnake(rawKey: string): string {
  const key = rawKey.trim()
  if (!key) return ''

  let out = ''
  for (let i = 0; i < key.length; i++) {
    const ch = key[i]
    const prev = i > 0 ? key[i - 1] : ''

    // break on lower->upper like "VideoURL" -> "video_url"
    if (prev && /[a-z]/.test(prev) && /[A-Z]/.test(ch)) {
      out += '_'
    }

    if (/[0-9A-Za-z]/.test(ch)) {
      out += ch.toLowerCase()
    } else {
      out += '_'
    }
  }

  out = out.replace(/_+/g, '_').replace(/^_+|_+$/g, '')
  if (!out) return ''

  if (/^[0-9]/.test(out)) {
    return `col_${out}`
  }
  return out
}

// Columns we actually persist into the `assets` table.
const ASSET_ALLOWED = new Set<string>([
  'item_id',
  'programme',
  'stage',
  'grade',
  'year',
  'video_title',
  'script_audio',
  'script_version',
  'video_id',
  'share_url',
  'download_url',
  'duration_seconds',
  'avatar_voice_id',
  'avatar_style',
  'background',
  'resolution',
  'video_thumbnail',
  'thumbnail_url',
  'player_url',
  'language_locale',
  'voice_id',
  'current_script_hash',
  'last_rendered_script_hash',
  'status',
  'notes',
  '_has_vid',
  '_has_share',
  '__sheet',
])

function normaliseAsset(row: Row): Record<string, any> {
  const out: Record<string, any> = {}

  for (const [rawKey, rawValue] of Object.entries(row)) {
    const key = toSnake(rawKey)
    if (!key || !ASSET_ALLOWED.has(key)) continue

    const value = typeof rawValue === 'string' ? rawValue.trim() : rawValue

    if (value === '' || value == null) {
      out[key] = null
      continue
    }

    if (NUMERIC_COLS.has(key)) {
      const n = Number(value)
      out[key] = Number.isFinite(n) ? n : null
      continue
    }

    out[key] = value
  }

  // Bridge Google Sheet column names to DB fields:
  // - Many of the sheets use "Video_URL" or "video_url" – we want that as share_url.
  if (!out.share_url && typeof row['Video_URL'] === 'string' && row['Video_URL'].trim() !== '') {
    out.share_url = row['Video_URL'].trim()
  }
  if (!out.share_url && typeof row['video_url'] === 'string' && row['video_url'].trim() !== '') {
    out.share_url = row['video_url'].trim()
  }
  if (!out.share_url && typeof out.player_url === 'string' && out.player_url.trim() !== '') {
    out.share_url = out.player_url
  }

  return out
}

async function fetchCsvRows(url: string): Promise<Row[]> {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`CSV fetch failed (${res.status}) for ${url}`)
  }
  const text = await res.text()
  const rows = parse(text, {
    columns: true,
    skip_empty_lines: true,
  }) as Row[]
  return rows
}

async function countRows(table: string): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from(table)
    .select('*', { count: 'exact', head: true })

  if (error) throw error
  return count ?? 0
}

// --- Route handler --------------------------------------------------------

export async function POST() {
  try {
    if (!env.SHEETS_ASSETS_CSV) {
      return NextResponse.json(
        { ok: false, error: 'SHEETS_ASSETS_CSV env var is not set' },
        { status: 500 },
      )
    }

    // 1. Pull rows from Google Sheets CSV
    const rawAssetRows = await fetchCsvRows(env.SHEETS_ASSETS_CSV)

    // 2. Normalise & filter
    const assets = rawAssetRows
      .map(normaliseAsset)
      .filter((a) => a.item_id && a.programme)

    // 3. Upsert into `assets`
    if (assets.length > 0) {
      const { error } = await supabaseAdmin
        .from('assets')
        .upsert(assets, { onConflict: 'item_id' })

      if (error) {
        console.error('[seed] upsert assets failed', error)
        return NextResponse.json(
          { ok: false, error: error.message ?? 'Upsert into assets failed' },
          { status: 500 },
        )
      }
    }

    // 4. Return some diagnostics so the Admin screen can show counts
    const [itemsCount, assetsCount, blueprintsCount] = await Promise.all([
      countRows('items').catch(() => 0),
      countRows('assets').catch(() => 0),
      countRows('blueprints').catch(() => 0),
    ])

    return NextResponse.json({
      ok: true,
      seeded: {
        assets: assets.length,
      },
      counts: {
        items: itemsCount,
        assets: assetsCount,
        blueprints: blueprintsCount,
      },
    })
  } catch (err: any) {
    console.error('[seed] unexpected error', err)
    return NextResponse.json(
      { ok: false, error: err?.message ?? 'Unknown error in seed endpoint' },
      { status: 500 },
    )
  }
}
