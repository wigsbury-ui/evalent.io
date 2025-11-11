// app/api/start/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  START_PASSCODE,
  SHEETS_BLUEPRINTS_CSV,
  BLUEPRINTS_CSV_URL,
  DEFAULT_SCHOOL_ID,
} from "@/lib/env";

// ---------------- CSV + blueprint helpers ----------------

function norm(s: unknown): string {
  return String(s ?? "")
    .replace(/\uFEFF/g, "") // BOM
    .replace(/\u00A0/g, " ") // nbsp
    .trim();
}

function normKey(s: unknown): string {
  return norm(s).toLowerCase();
}

type CsvRow = Record<string, string>;

/** Very small CSV parser good enough for our Sheets "Publish as CSV" */
function parseCsv(text: string): CsvRow[] {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return [];
  const headers = lines[0].split(",").map(norm);
  const rows: CsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    const row: CsvRow = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = norm(cols[j] ?? "");
    }
    rows.push(row);
  }
  return rows;
}

function toNumberOrNaN(v: unknown): number {
  const n = Number(String(v ?? "").replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : NaN;
}

/**
 * Build countsBySubject for a given programme/grade/mode from the blueprint CSV.
 * Supports two header schemas:
 *  A) subject + [easy_count|core_count|hard_count]
 *  B) programme, grade, year, domains, total     (we use domains as the subject and total as the count)
 */
function countsFromBlueprint(rows: CsvRow[], programme: string, grade: string, mode: string) {
  const p = normKey(programme);
  const g = norm(grade);

  // Filter to requested programme + grade
  const filtered = rows.filter((r) => {
    const rk = Object.fromEntries(Object.entries(r).map(([k, v]) => [normKey(k), v]));
    return normKey(rk["programme"]) === p && norm(rk["grade"]) === g;
  });

  const countsBySubject: Record<string, number> = {};
  for (const r of filtered) {
    // flexible header lookup
    const subjectKey =
      Object.keys(r).find((k) => normKey(k) === "subject") ??
      Object.keys(r).find((k) => normKey(k) === "domains");

    if (!subjectKey) continue;
    const subject = norm(r[subjectKey]);
    if (!subject) continue;

    // prefer "<mode>_count", else "total"
    const modeKey = Object.keys(r).find((k) => normKey(k) === `${mode.toLowerCase()}_count`);
    const totalKey = Object.keys(r).find((k) => normKey(k) === "total");

    const raw = modeKey ? r[modeKey] : totalKey ? r[totalKey] : undefined;
    const n = toNumberOrNaN(raw);
    if (Number.isFinite(n) && n > 0) countsBySubject[subject] = n;
  }

  return countsBySubject;
}

// ---------------- Route handler ----------------

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const passcode = norm(url.searchParams.get("passcode"));
    const programme = norm(url.searchParams.get("programme"));
    const grade = norm(url.searchParams.get("grade"));
    const mode = norm(url.searchParams.get("mode") || "core"); // easy|core|hard

    if (!passcode || !programme || !grade) {
      return NextResponse.json(
        { ok: false, error: "missing_programme_or_grade" },
        { status: 400 }
      );
    }
    if (passcode !== START_PASSCODE) {
      return NextResponse.json({ ok: false, error: "bad_passcode" }, { status: 401 });
    }

    // Source URL from env (your real var first, legacy alias as fallback)
    const BLUEPRINTS_URL = SHEETS_BLUEPRINTS_CSV || BLUEPRINTS_CSV_URL;
    if (!BLUEPRINTS_URL) {
      return NextResponse.json(
        {
          ok: false,
          error: "start_failed",
          detail: "missing_SHEETS_BLUEPRINTS_CSV (or BLUEPRINTS_CSV_URL)",
        },
        { status: 400 }
      );
    }

    // Fetch + parse blueprint CSV
    const csvRes = await fetch(BLUEPRINTS_URL, { cache: "no-store" });
    if (!csvRes.ok) {
      return NextResponse.json(
        { ok: false, error: "blueprints_fetch_failed", status: csvRes.status },
        { status: 502 }
      );
    }
    const csvText = await csvRes.text();
    const csvRows = parseCsv(csvText);

    const countsBySubject = countsFromBlueprint(csvRows, programme, grade, mode);

    if (!Object.values(countsBySubject).some((v) => v > 0)) {
      return NextResponse.json(
        { ok: false, error: `blueprint_has_no_positive_counts_for_mode_${mode}` },
        { status: 400 }
      );
    }

    // Build the session plan we’ll store
    const plan = {
      programme,
      grade,
      mode,
      countsBySubject,
      t: Date.now(),
    };

    // Insert a new session (status default 'active' per your constraint/defaults)
    const { data, error } = await db
      .from("sessions")
      .insert([
        {
          school_id: DEFAULT_SCHOOL_ID, // ok if nullable in your schema
          plan,
          status: "active", // allowed by sessions_status_check
        },
      ])
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { ok: false, error: "db_insert_failed", detail: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, session: data });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: "start_failed", detail: String(err?.message ?? err) },
      { status: 500 }
    );
  }
}
