// --- build countsBySubject from blueprint rows (supports both schemas) ---
const normalize = (s: any) =>
  String(s ?? '')
    .replace(/\uFEFF/g, '')       // strip BOM
    .replace(/\u00A0/g, ' ')      // strip nbsp
    .trim()
    .toLowerCase();

const countsBySubject: Record<string, number> = {};

for (const row of rows as any[]) {
  // subject can be "subject" (old) or "domains" (new)
  const subjectKey =
    Object.keys(row).find(k => normalize(k) === 'subject') ??
    Object.keys(row).find(k => normalize(k) === 'domains');

  const subject = String(subjectKey ? row[subjectKey] : '').trim();
  if (!subject) continue;

  // count can be "<mode>_count" (old) or "total" (new)
  const modeKey   = Object.keys(row).find(k => normalize(k) === `${mode}_count`);
  const totalKey  = Object.keys(row).find(k => normalize(k) === 'total');

  const raw = modeKey ? row[modeKey] : totalKey ? row[totalKey] : undefined;
  const n = Number(String(raw ?? '').replace(/[^0-9.\-]/g, ''));

  if (Number.isFinite(n) && n > 0) {
    countsBySubject[subject] = n;
  }
}

if (!Object.values(countsBySubject).some(v => v > 0)) {
  return NextResponse.json(
    { ok: false, error: `blueprint_has_no_positive_counts_for_mode_${mode}` },
    { status: 400 }
  );
}
// ------------------------------------------------------------------------
