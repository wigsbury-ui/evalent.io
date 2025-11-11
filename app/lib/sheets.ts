// app/lib/sheets.ts
import { env } from './env';

export type ItemRow = {
  id: string;
  domain: string;
  prompt: string;
  kind: 'mcq' | 'free';
  options?: string[];
  correct_index?: number; // 0-based
  video_embed?: string | null;
};

export type AssetRow = {
  item_id: string;
  video_url?: string | null;  // may be vimeo share or direct embed
  share_url?: string | null;
};

export type BlueprintRow = {
  programme?: string;
  grade?: string;
  year?: string; // alias for grade
  domains?: string[]; // target domain list (optional)
  total?: number;     // target number of items (optional)
};

const fetchCSV = async (url: string): Promise<string> => {
  const r = await fetch(url, { cache: 'no-store' });
  if (!r.ok) throw new Error(`CSV fetch failed: ${url}`);
  return await r.text();
};

// modest CSV parser that handles quoted cells and commas.
const parseCSV = (csv: string): Array<Record<string, string>> => {
  const lines = csv.replace(/\r/g, '').split('\n').filter(l => l.length > 0);
  if (!lines.length) return [];
  const headers = splitCSVLine(lines[0]);
  return lines.slice(1).map(line => {
    const cells = splitCSVLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h.trim()] = (cells[i] ?? '').trim(); });
    return row;
  });
};
const splitCSVLine = (line: string): string[] => {
  const out: string[] = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"' ) {
      if (inQ && line[i+1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (c === ',' && !inQ) {
      out.push(cur); cur = '';
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out;
};

// Try multiple header variants (keeps your sheet untouched)
const firstOf = (row: Record<string,string>, keys: string[]): string => {
  for (const k of keys) {
    const m = Object.keys(row).find(h => h.toLowerCase() === k.toLowerCase());
    if (m) return row[m];
  }
  return '';
};

const letterToIndex = (s: string): number | undefined => {
  const t = s.trim().toUpperCase();
  if (t === 'A') return 0;
  if (t === 'B') return 1;
  if (t === 'C') return 2;
  if (t === 'D') return 3;
  const asNum = Number(t);
  if (!Number.isNaN(asNum)) return asNum; // already 0-based or 1-based; caller can adjust
  return undefined;
};

export const toVimeoEmbedFromShare = (maybeShare: string | null | undefined): string | null => {
  if (!maybeShare) return null;
  const u = maybeShare.trim();
  if (!u) return null;
  // Accept existing embed or player URLs as-is
  if (u.includes('player.vimeo.com')) return u;
  // Typical share: https://vimeo.com/123456789
  const m = u.match(/vimeo\.com\/(\d+)/);
  if (m) return `https://player.vimeo.com/video/${m[1]}?byline=0&portrait=0`;
  return u;
};

export const loadAssets = async (): Promise<Record<string, AssetRow>> => {
  if (!env.SHEETS_ASSETS_CSV) return {};
  const csv = await fetchCSV(env.SHEETS_ASSETS_CSV);
  const rows = parseCSV(csv);
  const map: Record<string, AssetRow> = {};
  rows.forEach(r => {
    const id = firstOf(r, ['item_id', 'id', 'Item_ID', 'itemId']);
    const share = firstOf(r, ['share_url', 'Share_URL', 'vimeo_share', 'video_share']);
    const direct = firstOf(r, ['video_url', 'embed_url', 'Video_URL']);
    map[id] = { item_id: id, video_url: direct || share, share_url: share || direct };
  });
  return map;
};

export const loadItems = async (): Promise<ItemRow[]> => {
  if (!env.SHEETS_ITEMS_CSV) return [];
  const csv = await fetchCSV(env.SHEETS_ITEMS_CSV);
  const rows = parseCSV(csv);

  const assets = await loadAssets();

  const items: ItemRow[] = rows.map(r => {
    const id = firstOf(r, ['item_id', 'id', 'Item_ID', 'ID']);
    const domain = firstOf(r, ['domain', 'strand', 'subject', 'Domain']) || 'General';
    const prompt = firstOf(r, ['prompt', 'text_or_html', 'content_html', 'question', 'Prompt']);

    // Detect kind
    let kind: 'mcq' | 'free' = 'free';
    const hasOptions =
      firstOf(r, ['option_a', 'A', 'opt_A']) ||
      firstOf(r, ['option_b', 'B', 'opt_B']) ||
      firstOf(r, ['option_c', 'C', 'opt_C']) ||
      firstOf(r, ['option_d', 'D', 'opt_D']) ||
      firstOf(r, ['options_joined', 'answer_choices']);
    if (hasOptions) kind = 'mcq';
    const kindCell = firstOf(r, ['kind', 'type']);
    if (kindCell) {
      const t = kindCell.toLowerCase();
      if (t.includes('mcq')) kind = 'mcq';
      if (t.includes('free') || t.includes('text')) kind = 'free';
    }

    // Build options & correct index
    let options: string[] | undefined = undefined;
    let correct_index: number | undefined = undefined;

    if (kind === 'mcq') {
      const joined = firstOf(r, ['options_joined', 'answer_choices']);
      if (joined) {
        // joined with newline or pipe
        const parts = joined.split(/\r?\n|\|/).map(s => s.trim()).filter(Boolean);
        if (parts.length) options = parts;
      } else {
        const A = firstOf(r, ['option_a','A','opt_A']);
        const B = firstOf(r, ['option_b','B','opt_B']);
        const C = firstOf(r, ['option_c','C','opt_C']);
        const D = firstOf(r, ['option_d','D','opt_D']);
        options = [A,B,C,D].filter(Boolean);
      }
      const corr = firstOf(r, ['correct_index','answer_index','correct_letter','Correct_Answer','Correct']);
      if (corr) {
        const idx = letterToIndex(corr);
        if (idx !== undefined) {
          // if it looks 1-based, normalise to 0-based
          correct_index = idx > 3 ? idx - 1 : idx;
        }
      }
    }

    // Attach video embed if present
    const asset = assets[id];
    const embed = asset ? toVimeoEmbedFromShare(asset.video_url || asset.share_url) : null;

    return {
      id, domain, prompt, kind,
      options, correct_index,
      video_embed: embed
    };
  });

  return items.filter(i => i.id); // drop empties
};

export const loadBlueprints = async (): Promise<BlueprintRow[]> => {
  if (!env.SHEETS_BLUEPRINTS_CSV) return [];
  const csv = await fetchCSV(env.SHEETS_BLUEPRINTS_CSV);
  const rows = parseCSV(csv);
  return rows.map(r => {
    const programme = firstOf(r, ['programme', 'program', 'curriculum']);
    const grade = firstOf(r, ['grade','year','grade_level','Year']);
    const domainsRaw = firstOf(r, ['domains','domain_list','strands']);
    const totalRaw = firstOf(r, ['total','count','target_items']);
    const domains = domainsRaw ? domainsRaw.split(/[,|]/).map(s => s.trim()).filter(Boolean) : undefined;
    const total = totalRaw ? Number(totalRaw) : undefined;
    return { programme, grade, year: grade, domains, total };
  });
};
