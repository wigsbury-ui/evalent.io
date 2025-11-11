import { NextRequest, NextResponse } from 'next/server';
import { loadBlueprints } from '@/app/lib/sheets';

// normalise a header/key for robust matching
const norm = (s: any) => String(s ?? '')
  .replace(/\uFEFF/g, '')        // BOM
  .replace(/\u00A0/g, ' ')       // NBSP → space
  .trim()
  .toLowerCase();

export async function GET(req: NextRequest) {
  try {
    const programme = (req.nextUrl.searchParams.get('programme') ?? '').trim();
    const grade     = (req.nextUrl.searchParams.get('grade') ?? '').trim();
    const mode      = (req.nextUrl.searchParams.get('mode') ?? 'core').trim().toLowerCase();

    const rows = await loadBlueprints();

    // show headers we actually parsed
    const headerSet = new Set<string>();
    for (const r of rows) Object.keys(r).forEach(k => headerSet.add(norm(k)));

    const filtered = rows.filter(r =>
      norm(r['programme'] ?? r['Programme']) === norm(programme) &&
      String(r['grade'] ?? r['Grade'] ?? '').trim() === grade
    );

    // Build a compact view of what we matched and what each row has for *_count
    const sample = filtered.slice(0, 10).map((r) => {
      const subjectKey = Object.keys(r).find(k => norm(k) === 'subject') ?? '';
      const countKey   = Object.keys(r).find(k => norm(k) === `${mode}_count`) ?? '';
      const rawCount   = countKey ? r[countKey] : undefined;

      return {
        subject_key: subjectKey,
        subject: subjectKey ? r[subjectKey] : undefined,
        count_key: countKey || `(not found for mode=${mode})`,
        raw_count: rawCount,
        parsed_count: Number(String(rawCount ?? '').replace(/[^0-9.\-]/g, '')),
        all_keys_seen: Object.keys(r),
      };
    });

    return NextResponse.json({
      ok: true,
      received: { programme, grade, mode },
      parsed_headers_seen: Array.from(headerSet).sort(),
      filtered_rows: filtered.length,
      rows: sample,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'debug_failed' }, { status: 500 });
  }
}
