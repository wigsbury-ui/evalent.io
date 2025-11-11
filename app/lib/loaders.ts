// lib/loaders.ts
type Row = Record<string, string>;

const norm = (s: string) =>
  String(s ?? '')
    .replace(/\uFEFF/g, '')
    .replace(/\u00A0/g, ' ')
    .trim();

function parseCSV(csv: string): Row[] {
  const lines = csv.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];
  const headers = lines[0].split(',').map((h) => norm(h).toLowerCase());
  const rows: Row[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCSVLine(lines[i]);
    const row: Row = {};
    headers.forEach((h, idx) => {
      row[h] = norm(cols[idx] ?? '');
    });
    rows.push(row);
  }
  return rows;
}

// handles quoted commas
function splitCSVLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQ = !inQ;
      }
    } else if (ch === ',' && !inQ) {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

async function loadCSV(url?: string): Promise<Row[]> {
  if (!url) return [];
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`CSV fetch failed: ${res.status} ${res.statusText}`);
  const txt = await res.text();
  return parseCSV(txt);
}

export async function loadItems(): Promise<Row[]> {
  return loadCSV(process.env.SHEETS_ITEMS_CSV);
}

export async function loadAssets(): Promise<Row[]> {
  return loadCSV(process.env.SHEETS_ASSETS_CSV);
}

export async function loadBlueprints(): Promise<Row[]> {
  return loadCSV(process.env.SHEETS_BLUEPRINTS_CSV);
}

// Accepts either a Vimeo share URL or direct numeric ID inside a URL.
// Returns an embeddable player URL or empty string.
export function toVimeoEmbedFromShare(input: string): string {
  const s = String(input || '').trim();
  if (!s) return '';
  // If full URL, try to pull the numeric id
  try {
    const u = new URL(s);
    const id = u.pathname.split('/').filter(Boolean).pop();
    if (id && /^\d+$/.test(id)) return `https://player.vimeo.com/video/${id}`;
  } catch {
    // not a URL, maybe already an id
  }
  if (/^\d+$/.test(s)) return `https://player.vimeo.com/video/${s}`;
  return '';
}
