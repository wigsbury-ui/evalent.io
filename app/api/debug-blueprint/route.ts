import { NextRequest, NextResponse } from 'next/server';
import { loadBlueprints } from '@/app/lib/sheets';

export const dynamic = 'force-dynamic';

function norm(s: unknown): string {
  return String(s ?? '')
    .replace(/\uFEFF/g, '')
    .replace(/\u00A0/g, ' ')
    .trim()
    .toLowerCase();
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const programme = sp.get('programme') ?? '';
  const grade = sp.get('grade') ?? '';
  const mode = (sp.get('mode') ?? 'core').toLowerCase();

  const all = await loadBlueprints();
  const filtered = all.filter((r: Record<string, unknown>) => {
    return norm(r['programme']) === norm(programme) &&
           String(r['grade'] ?? '').trim() === String(grade);
  });

  const headers = filtered.length ? Object.keys(filtered[0]).map(k => norm(k)) : [];

  const rows = filtered.map((r: Record<string, unknown>) => {
    const subjectKey =
      Object.keys(r).find(k => norm(k) === 'subject') ??
      Object.keys(r).find(k => norm(k) === 'domains');

    const modeKey = Object.keys(r).find(k => norm(k) === `${mode}_count`);
    const totalKey = Object.keys(r).find(k => norm(k) === 'total');

    return {
      subject_key: subjectKey || '',
      count_key: modeKey ? `${mode}_count` : totalKey ? 'total' : '(not found)',
      raw_subject: subjectKey ? r[subjectKey] : '',
      raw_count: modeKey ? r[modeKey!] : totalKey ? r[totalKey!] : '',
    };
  });

  return NextResponse.json({
    ok: true,
    received: { programme, grade, mode },
    parsed_headers_seen: headers,
    filtered_rows: filtered.length,
    rows,
  });
}
