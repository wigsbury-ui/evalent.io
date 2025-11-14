// lib/csv.ts
// Simple CSV parser used by scripts/seed.ts (and can be reused elsewhere)

export type CsvRow = Record<string, string>;

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (ch === '"') {
      // handle escaped double quotes ("")
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // skip the escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      // comma ends the current cell (if not inside quotes)
      out.push(current);
      current = '';
    } else {
      current += ch;
    }
  }

  out.push(current);
  return out;
}

export function parseCsv(text: string): CsvRow[] {
  const lines = text
    .replace(/\r\n/g, '\n')        // normalise newlines
    .split('\n')
    .filter((l) => l.trim() !== ''); // drop empty lines

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
