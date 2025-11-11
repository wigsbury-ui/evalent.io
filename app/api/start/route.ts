// --- robust blueprint parser -------------------------------------------------
const norm = (s: any) =>
  String(s ?? '')
    .replace(/\uFEFF/g, '')
    .replace(/\u00A0/g, ' ')
    .trim()
    .toLowerCase();

const numeric = (v: any) => {
  const n = Number(String(v ?? '').replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? n : NaN;
};

// rows already filtered by programme + grade
const countsBySubject: Record<string, number> = {};

for (const r of rows as any[]) {
  // subject column can be "subject" or "domains"
  const subjectKey =
    Object.keys(r).find((k) => norm(k) === 'subject') ??
    Object.keys(r).find((k) => norm(k) === 'domains');

  const subject = String(subjectKey ? r[subjectKey] : '').trim();
  if (!subject) continue;

  // Preferred key for the chosen mode (e.g., "core_count")
  const modeKey = Object.keys(r).find((k) => norm(k) === `${mode}_count`);

  // Fallback keys, in order
  const fallbacks = [
    'total',
    'count',
    'base_count',
    'core',
    'easy',
    'hard',
    'base',
  ];

  let val = NaN;

  // 1) try exact mode column if present and numeric
  if (modeKey) {
    val = numeric(r[modeKey]);
  }

  // 2) if not numeric, try fallbacks in order
  if (!Number.isFinite(val) || val <= 0) {
    for (const fk of fallbacks) {
      const k = Object.keys(r).find((h) => norm(h) === fk);
      if (!k) continue;
      const n = numeric(r[k]);
      if (Number.isFinite(n) && n > 0) {
        val = n;
        break;
      }
    }
  }

  if (Number.isFinite(val) && val > 0) {
    countsBySubject[subject] = val;
  }
}

if (!Object.values(countsBySubject).some((v) => v > 0)) {
  return NextResponse.json(
    { ok: false, error: `blueprint_has_no_positive_counts_for_mode_${mode}` },
    { status: 400 }
  );
}
// --- end robust blueprint parser --------------------------------------------
