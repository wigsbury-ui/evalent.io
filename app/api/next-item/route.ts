// app/api/next-item/route.ts
import { NextRequest, NextResponse } from "next/server";

// --- Helpers ---------------------------------------------------------------

function err(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}
function ok(body: unknown, status = 200) {
  return NextResponse.json(body as any, { status });
}
function norm(x: unknown): string {
  return String(x ?? "")
    .replace(/\uFEFF/g, "")
    .replace(/\u00A0/g, " ")
    .trim();
}

// Load items JSON at runtime (keeps build simple and allows “no-store”)
async function loadItems() {
  // Path is relative to app root when bundled by Next
  // Using dynamic import so it stays server-only
  try {
    const mod = await import("../../../data/items_full.json");
    // Some bundlers stick data under .default
    return (mod as any).default ?? (mod as any);
  } catch (e) {
    throw new Error("items_data_missing");
  }
}

// --- GET -------------------------------------------------------------------

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;

    // required for trace only (keeps parity with runner calls)
    const t = norm(sp.get("t")); // token (optional but recommended)
    const programme = norm(sp.get("programme")).toUpperCase();
    const grade = norm(sp.get("grade"));
    const mode = (norm(sp.get("mode")).toLowerCase() || "core") as
      | "core"
      | "easy"
      | "hard";
    const iRaw = sp.get("i");
    const index = Math.max(0, Number.isFinite(Number(iRaw)) ? Number(iRaw) : 0);

    if (!programme || !grade) {
      return err("missing_programme_or_grade", 400);
    }

    // Load and filter items
    const all = await loadItems();

    // Items can have various key casings; normalize defensively
    const items = (Array.isArray(all) ? all : []).filter((it: any) => {
      const p =
        norm(it.programme ?? it.Programme ?? it.PROGRAMME).toUpperCase();
      const g = norm(it.grade ?? it.Grade ?? it.GRADE);
      return p === programme && g === grade;
    });

    if (items.length === 0) {
      return err("no_items_for_programme_and_grade", 404);
    }

    // Optionally you could filter by subject based on your plan distribution here
    // e.g., choose subject by remaining counts in client-provided plan.

    const pick = items[index % items.length];

    // Minimal, runner-friendly shape. We pass through common fields if present.
    const payload = {
      ok: true,
      index,
      total: items.length,
      remaining: Math.max(0, items.length - (index + 1)),
      token: t || null,
      mode,
      item: {
        id: pick.id ?? pick.item_id ?? `${programme}-${grade}-${index}`,
        programme,
        grade,
        subject:
          pick.subject ?? pick.domain ?? pick.Domains ?? pick.domains ?? null,
        // Common fields in our banks; pass raw so the runner can render
        stem:
          pick.stem ??
          pick.question ??
          pick.text ??
          pick.prompt ??
          null,
        options:
          pick.options ??
          pick.answers ??
          pick.choices ??
          null,
        answer:
          pick.answer ??
          pick.correct ??
          pick.correct_answer ??
          null,
        // Everything else as raw fallback
        raw: pick,
      },
    };

    // no-store so the client can step index with cache busters safely
    const res = ok(payload, 200);
    res.headers.set("Cache-Control", "no-store, max-age=0");
    return res;
  } catch (e: any) {
    const msg = e?.message || "next_item_failed";
    const status = msg === "items_data_missing" ? 500 : 500;
    return err(msg, status);
  }
}

// Other verbs blocked
export async function POST() {
  return err("method_not_allowed", 405);
}
export async function PUT() {
  return err("method_not_allowed", 405);
}
export async function DELETE() {
  return err("method_not_allowed", 405);
}
