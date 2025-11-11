type CsvRow = Record<string, string>;

const ITEMS_CSV = process.env.SHEETS_ITEMS_CSV!;
const BLUEPRINTS_CSV = process.env.SHEETS_BLUEPRINTS_CSV!;
const ASSETS_CSV = process.env.SHEETS_ASSETS_CSV!;

function parseCsv(text: string): CsvRow[] {
  // Minimal RFC4180-ish parser (handles quotes/double-quotes, commas, newlines)
  const rows: string[][] = [];
  let cur = '';
  let row: string[] = [];
  let inQ = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const n = text[i + 1];

    if (inQ) {
      if (c === '"' && n === '"') { cur += '"'; i++; continue; }
      if (c === '"') { inQ = false; continue; }
      cur += c;
      continue;
    }

    if (c === '"') { inQ = true; continue; }
    if (c === ',') { row.push(cur); cur = ''; continue; }
    if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; continue; }
    cur += c;
  }
  row.push(cur); rows.push(row);

  const header = rows.shift() ?? [];
  return rows.filter(r => r.length && r.some(x => x !== '')).map(r => {
    const o: CsvRow = {};
    header.forEach((h, i) => (o[h.trim()] = (r[i] ?? '').trim()));
    return o;
  });
}

async function fetchCsv(url: string): Promise<CsvRow[]> {
  if (!url) throw new Error('CSV URL missing');
  const res = await fetch(url, { cache: 'no-store' });
  const txt = await res.text();
  return parseCsv(txt);
}

// Public loaders (names kept generic so they’re easy to use anywhere)
export async function loadItemsFromSheets(): Promise<CsvRow[]> {
  return fetchCsv(ITEMS_CSV);
}

export async function loadBlueprintsFromSheets(): Promise<CsvRow[]> {
  return fetchCsv(BLUEPRINTS_CSV);
}

export async function loadAssetsFromSheets(): Promise<CsvRow[]> {
  return fetchCsv(ASSETS_CSV);
}

// Small helper: look up an embed URL for a given item_id
export function pickVideoEmbed(assets: CsvRow[], itemId: string): string | null {
  const a = assets.find(x =>
    (x.item_id ?? x.itemID ?? x.id ?? '').toString() === itemId.toString()
  );
  // Accept either 'video_embed', 'video_url', or 'video' column names from your sheet
  return (a?.video_embed || a?.video_url || a?.video || '').trim() || null;
}
