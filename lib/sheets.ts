import 'server-only';

type CsvRow = Record<string, string>;

export type ItemRow = {
  item_id: string;
  programme: string;
  grade_number: string;         // keep as string for direct compare with blueprint.grade
  subject: 'English' | 'Mathematics' | 'Reasoning' | string;
  type: 'MCQ' | 'Open' | string;
  difficulty: 'easy' | 'core' | 'hard' | string;
  prompt: string;
  options: string[] | null;     // from mcq_options_json
  correct_index: number | null; // computed from answer_key
  video_id: string | null;
  active: boolean;
};

export type BlueprintRow = {
  programme: string;
  grade: string;                // compare with items.grade_number
  subject: 'English' | 'Mathematics' | 'Reasoning' | string;
  easy_count: number;
  core_count: number;
  hard_count: number;
};

export type AssetRow = {
  video_id: string;
  share_url: string | null;     // vimeo link like https://vimeo.com/123456789/abchash
  download_url: string | null;
};

async function fetchCSV(url?: string): Promise<CsvRow[]> {
  if (!url) return [];
  const r = await fetch(url, { cache: 'no-store' });
  if (!r.ok) return [];
  const text = await r.text();

  // simple CSV splitter (no quotes-in-field handling). If you have commas in fields,
  // we can swap this for a small CSV parser later without touching sheet columns.
  const lines = text.replace(/\r/g, '').split('\n').filter(Boolean);
  const headers = lines.shift()!.split(',').map(h => h.trim().replace(/^\uFEFF/, ''));
  return lines.map(line => {
    const cells = line.split(',').map(c => c.trim());
    const row: CsvRow = {};
    headers.forEach((h, i) => (row[h] = cells[i] ?? ''));
    return row;
  });
}

function parseBool(x: string | undefined) {
  return String(x ?? '').toLowerCase() !== 'false' && String(x ?? '') !== '';
}

function parseJSON<T = any>(s: string | undefined): T | null {
  if (!s) return null;
  try { return JSON.parse(s); } catch { return null; }
}

export async function loadItems(): Promise<ItemRow[]> {
  const rows = await fetchCSV(process.env.SHEETS_ITEMS_CSV);
  return rows
    .filter(r => parseBool(r.active))
    .map(r => {
      const options = parseJSON<string[]>(r.mcq_options_json) ?? null;
      const correctValue = (r.answer_key ?? '').trim();
      let correct_index: number | null = null;
      if (options && correctValue) {
        const idx = options.findIndex(o => o === correctValue);
        correct_index = idx >= 0 ? idx : null;
      }
      return {
        item_id: (r.item_id ?? '').trim(),
        programme: (r.programme ?? '').trim(),
        grade_number: (r.grade_number ?? '').trim(),
        subject: (r.subject ?? '').trim(),
        type: (r.type ?? '').trim() as ItemRow['type'],
        difficulty: (r.difficulty ?? '').trim() as ItemRow['difficulty'],
        prompt: (r.display_question ?? '').trim(),
        options,
        correct_index,
        video_id: (r.video_id ?? '').trim() || null,
        active: parseBool(r.active),
      };
    })
    .filter(r => r.item_id);
}

export async function loadBlueprints(): Promise<BlueprintRow[]> {
  const rows = await fetchCSV(process.env.SHEETS_BLUEPRINTS_CSV);
  return rows.map(r => ({
    programme: (r.programme ?? '').trim(),
    grade: (r.grade ?? '').trim(),
    subject: (r.subject ?? '').trim(),
    easy_count: Number(r.easy_count ?? 0) || 0,
    core_count: Number(r.core_count ?? 0) || 0,
    hard_count: Number(r.hard_count ?? 0) || 0,
  }));
}

export async function loadAssets(): Promise<Map<string, AssetRow>> {
  const rows = await fetchCSV(process.env.SHEETS_ASSETS_CSV);
  const map = new Map<string, AssetRow>();
  for (const r of rows) {
    const id = (r.video_id ?? '').trim();
    if (!id) continue;
    map.set(id, {
      video_id: id,
      share_url: (r.share_url ?? '').trim() || null,
      download_url: (r.download_url ?? '').trim() || null,
    });
  }
  return map;
}

// Vimeo helpers used by API so the client can iframe directly
export function toVimeoEmbedFromShare(shareUrl: string | null): string | null {
  // shareUrl like https://vimeo.com/123456789/abchash
  if (!shareUrl) return null;
  const m = shareUrl.match(/vimeo\.com\/(\d+)(?:\/([A-Za-z0-9]+))?/);
  if (!m) return null;
  const id = m[1];
  const h = m[2] ? `?h=${m[2]}` : '';
  return `https://player.vimeo.com/video/${id}${h}`;
}
