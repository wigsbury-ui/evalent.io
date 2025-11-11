// lib/loaders.ts
// Load CSVs published from Google Sheets (Items, Assets, Blueprints)

import {
  SHEETS_ITEMS_CSV,
  SHEETS_ASSETS_CSV,
  SHEETS_BLUEPRINTS_CSV,
} from "@/lib/env";

// --- tiny CSV parser (handles quotes, BOM, NBSP) -----------------------------
function splitCSVLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === `"`) {
        if (line[i + 1] === `"`) { cur += `"`; i++; }
        else inQ = false;
      } else cur += ch;
    } else {
      if (ch === `,`) { out.push(cur); cur = ""; }
      else if (ch === `"`) inQ = true;
      else cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function parseCSV(text: string): Record<string, string>[] {
  const cleaned = text
    .replace(/\uFEFF/g, "")     // BOM
    .replace(/\u00A0/g, " ")    // NBSP
    .replace(/\r\n?/g, "\n");   // CRLF → LF
  const lines = cleaned.split("\n").filter(l => l.length > 0);
  if (!lines.length) return [];
  const headers = splitCSVLine(lines[0]).map(h => h.trim());
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCSVLine(lines[i]);
    if (cols.length === 1 && cols[0].trim() === "") continue;
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => (obj[h] = (cols[idx] ?? "").trim()));
    rows.push(obj);
  }
  return rows;
}

async function fetchCSV(url: string): Promise<Record<string, string>[]> {
  if (!url) return [];
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`CSV fetch failed: ${res.status} ${res.statusText}`);
  const text = await res.text();
  return parseCSV(text);
}

// --- public loaders -----------------------------------------------------------
export async function loadItems() {
  return fetchCSV(SHEETS_ITEMS_CSV);
}
export async function loadAssets() {
  return fetchCSV(SHEETS_ASSETS_CSV);
}
export async function loadBlueprints() {
  return fetchCSV(SHEETS_BLUEPRINTS_CSV);
}
