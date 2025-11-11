// lib/loaders.ts
// CSV loaders for Items, Assets, and Blueprints (Google Sheets "Publish to web" CSVs)

import {
  SHEETS_ITEMS_CSV,
  SHEETS_ASSETS_CSV,
  SHEETS_BLUEPRINTS_CSV,
} from "@/lib/env";

// ---- tiny CSV -> objects parser ------------------------------------------------
function parseCSV(text: string): Record<string, string>[] {
  // Normalize BOM/nbsp and newlines
  const cleaned = text.replace(/\uFEFF/g, "").replace(/\u00A0/g, " ").replace(/\r\n?/g, "\n");
  const lines = cleaned.split("\n").filter((l) => l.length > 0);

  if (lines.length === 0) return [];

  // Parse header (simple CSV with quoted cells support)
  const headers = splitCSVLine(lines[0]).map(h => h.trim());

  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCSVLine(lines[i]);
    if (cols.length === 1 && cols[0].trim() === "") continue; // skip empties
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      obj[h] = (cols[idx] ?? "").trim();
    });
    rows.push(obj);
  }
  return rows;
}

// Split a single CSV line handling quotes + escaped quotes ("")
function splitCSVLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (inQ) {
      if (ch === `"`) {
        // Escaped double-quote inside quotes -> ""
        if (line[i + 1] === `"`) {
          cur += `"`;
          i++;
        } else {
          inQ = false;
        }
      } else {
        cur += ch;
      }
    } else {
      if (ch === `,`) {
        out.push(cur);
        cur = "";
      } else if (ch === `"`) {
        inQ = true;
      } else {
        cur += ch;
      }
    }
  }
  out.push(cur);
  return out;
}

// ---- fetch helpers -------------------------------------------------------------
async function fetchCSV(url: string): Promise<Record<string, string>[]> {
  if (!url) return [];
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`CSV fetch failed: ${res.status} ${res.statusText}`);
  const text = await res.text();
  return parseCSV(text);
}

// ---- public loaders ------------------------------------------------------------
export async function loadItems(): Promise<Record<string, string>[]> {
  return fetchCSV(SHEETS_ITEMS_CSV);
}

export async function loadAssets(): Promise<Record<string, string>[]> {
  return fetchCSV(SHEETS_ASSETS_CSV);
}

export async function loadBlueprints(): Promise<Record<string, string>[]> {
  return fetchCSV(SHEETS_BLUEPRINTS_CSV);
}
