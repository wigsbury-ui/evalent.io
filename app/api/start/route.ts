// app/api/start/route.ts
import { NextRequest, NextResponse } from "next/server";

// ---- env helpers ----
function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v || !v.trim()) throw new Error(`Missing env: ${name}`);
  return v;
}
const START_PASSCODE = requireEnv("NEXT_PUBLIC_START_PASSCODE");
const SHEETS_BLUEPRINTS_CSV = requireEnv("SHEETS_BLUEPRINTS_CSV");

// ---- utils ----
const ok = (body: unknown, init: number = 200) =>
  NextResponse.json(body as any, { status: init });
const bad = (msg: string, init: number = 400) =>
  NextResponse.json({ ok: false, error: msg }, { status: init });

function norm(s: unknown): string {
  return String(s ?? "")
    .replace(/\uFEFF/g, "") // strip BOM
    .replace(/\u00A0/g, " ") // nbsp
    .trim();
}

// CSV → objects
async function fetchBlueprintRows(): Promise<Record<string, string>[]> {
  const r = await fetch(SHEETS_BLUEPRINTS_CSV, { cache: "no-store" });
  if (!r.ok) throw new Error(`blueprints_csv_fetch_failed_${r.status}`);
  const text = await r.text();

  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return [];
  const headers = lines[0]
    .split(",")
    .map((h) => norm(h).toLowerCase());

  return lines.slice(1).map((line) => {
    const cols = line.split(",");
    const row: Record<string, string> = {};
    headers.forEach((h, i) => (row[h] = norm(cols[i])));
    return row;
  });
}

function numeric(x: unknown): number {
  const n = Number(String(x ?? "").replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

// ---- GET handler ----
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;

    const passcode = norm(sp.get("passcode"));
    const programme = norm(sp.get("programme")).toUpperCase();
    const grade = norm(sp.get("grade"));
    const mode = (norm(sp.get("mode")).toLowerCase() || "core") as
      | "core"
      | "easy"
      | "hard";

    if (!programme || !grade) {
      return bad("missing_programme_or_grade", 400);
    }
    if (passcode !== START_PASSCODE) {
      return bad("invalid_passcode", 401);
    }

    // Pull CSV once and filter
    const rows = await fetchBlueprintRows();
    const filtered = rows.filter(
      (r) => r["programme"]?.toUpperCase() === programme && r["grade"] === grade
    );

    // Build countsBySubject supporting either:
    //  (A) subject + {core_count|easy_count|hard_count}
    //  (B) domains + total   (treated as active mode’s count)
    const countsBySubject: Record<string, number> = {};

    for (const r of filtered) {
      const subjectKey =
        ["subject", "domains"].find((k) => k in r) ?? "subject";
      const countKeyCandidates = [`${mode}_count`, "total"];
      const countKey =
        countKeyCandidates.find((k) => k in r) ?? `${mode}_count`;

      const subject = norm((r as any)[subjectKey]);
      const n = numeric((r as any)[countKey]);

      if (subject && n > 0) countsBySubject[subject] = n;
    }

    if (!Object.values(countsBySubject).some((v) => v > 0)) {
      return bad(`blueprint_has_no_positive_counts_for_mode_${mode}`, 400);
    }

    // Return a lightweight “session” (no DB write here)
    const token = crypto.randomUUID();
    return ok({
      ok: true,
      session: {
        id: crypto.randomUUID(),
        status: "active",
        token,
        programme,
        grade,
        mode,
        plan: { countsBySubject },
      },
    });
  } catch (e: any) {
    return bad(e?.message ?? "start_failed", 500);
  }
}

// Fallback for other verbs
export async function POST() {
  return bad("method_not_allowed", 405);
}
export async function PUT() {
  return bad("method_not_allowed", 405);
}
export async function DELETE() {
  return bad("method_not_allowed", 405);
}
