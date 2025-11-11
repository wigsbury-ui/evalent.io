// app/api/start/route.ts
import { NextResponse } from "next/server";
import db from "@/lib/db";
import {
  START_PASSCODE,
  DEFAULT_SCHOOL_ID,
  SHEETS_BLUEPRINTS_CSV,
} from "@/lib/env";
import { loadCsv } from "@/lib/loaders";

// small helpers
const safeNum = (v: unknown) =>
  Number(String(v ?? "").replace(/[^0-9.\-]/g, ""));
const norm = (s: string) =>
  String(s ?? "").replace(/\uFEFF/g, "").replace(/\u00A0/g, " ").trim().toLowerCase();

const newToken = () => crypto.randomUUID().replace(/-/g, "");
const minutesFromNow = (m: number) =>
  new Date(Date.now() + m * 60 * 1000).toISOString();

export async function GET(req: Request) {
  try {
    // -------- query params ----------
    const url = new URL(req.url);
    const passcode = url.searchParams.get("passcode") || "";
    const programme = (url.searchParams.get("programme") || "").trim();
    const grade = (url.searchParams.get("grade") || "").trim();
    const mode = (url.searchParams.get("mode") || "core").trim().toLowerCase();

    if (passcode !== START_PASSCODE)
      return NextResponse.json({ ok: false, error: "bad_passcode" }, { status: 401 });

    if (!programme || !grade)
      return NextResponse.json({ ok: false, error: "missing_programme_or_grade" }, { status: 400 });

    // -------- load blueprints CSV ----------
    if (!SHEETS_BLUEPRINTS_CSV)
      return NextResponse.json(
        { ok: false, error: "start_failed", detail: "missing_SHEETS_BLUEPRINTS_CSV" },
        { status: 500 }
      );

    const rows = await loadCsv(SHEETS_BLUEPRINTS_CSV); // returns array of objects

    // filter for programme + grade
    const filtered = rows.filter((r: any) => {
      const p = String(r.programme ?? r.Programme ?? "").trim();
      const g = String(r.grade ?? r.Grade ?? "").trim();
      return p === programme && g === grade;
    });

    // count map by subject/domains using <mode>_count or total
    const countsBySubject: Record<string, number> = {};
    for (const r of filtered) {
      const keys = Object.keys(r);
      const kSubject =
        keys.find((k) => norm(k) === "subject") ??
        keys.find((k) => norm(k) === "domains");
      const subject = String(kSubject ? r[kSubject] : "").trim();
      if (!subject) continue;

      const kMode = keys.find((k) => norm(k) === `${mode}_count`);
      const kTotal = keys.find((k) => norm(k) === "total");
      const raw = kMode ? r[kMode] : kTotal ? r[kTotal] : undefined;
      const n = safeNum(raw);
      if (Number.isFinite(n) && n > 0) countsBySubject[subject] = n;
    }

    if (!Object.values(countsBySubject).some((v) => v > 0)) {
      return NextResponse.json(
        { ok: false, error: `blueprint_has_no_positive_counts_for_mode_${mode}` },
        { status: 400 }
      );
    }

    // -------- create session ----------
    const plan = {
      t: Date.now(),
      programme,
      grade,
      mode,
      countsBySubject,
    };

    // insert session (status defaults to 'active' in your schema; we set it explicitly)
    const { data: inserted, error: iErr } = await db
      .from("sessions")
      .insert({
        school_id: DEFAULT_SCHOOL_ID,
        status: "active",
        plan,
      })
      .select("id, token, public_token")
      .single();

    if (iErr || !inserted)
      return NextResponse.json({ ok: false, error: "db_insert_failed", detail: iErr?.message }, { status: 500 });

    let token = inserted.token;
    // ensure we have a session token the runner can use
    if (!token) {
      token = newToken();
      const { data: updated, error: uErr } = await db
        .from("sessions")
        .update({
          token,
          not_after: minutesFromNow(120),
        })
        .eq("id", inserted.id)
        .select("id, token, public_token")
        .single();

      if (uErr || !updated)
        return NextResponse.json({ ok: false, error: "db_update_failed", detail: uErr?.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      session: {
        id: inserted.id,
        status: "active",
        mode,
        grade,
        programme,
      },
      token, // <— the runner needs this
      plan,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: "start_failed", detail: String(e?.message || e) }, { status: 500 });
  }
}
