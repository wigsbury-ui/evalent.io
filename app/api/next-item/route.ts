// app/api/next-item/route.ts
import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

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

// Load items from /data/items_full.json relative to repo root
async function loadItems() {
  const file = path.join(process.cwd(), "data", "items_full.json");
  try {
    const buf = await fs.readFile(file, "utf8");
    const json = JSON.parse(buf);
    if (!Array.isArray(json)) throw new Error("items_json_not_array");
    return json;
  } catch (e) {
    // Surface a consistent error for easier debugging
    const msg = (e as any)?.message || "items_read_failed";
    throw new Error(`items_data_missing:${msg}`);
  }
}

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;

    const t = norm(sp.get("t")); // optional trace token
    const programme = norm(sp.get("programme")).toUpperCase();
    const grade = norm(sp.get("grade"));
    const mode = (norm(sp.get("mode")).toLowerCase() || "core") as
      | "core"
      | "easy"
      | "hard";
    const iRaw = sp.get("i");
    const index = Math.max(0, Number.isFinite(Number(iRaw)) ? Number(iRaw) : 0);

    if (!programme || !grade) return err("missing_programme_or_grade", 400);

    const all = await loadItems();

    const items = all.filter((it: any) => {
      const p = norm(it.programme ?? it.Programme ?? it.PROGRAMME).toUpperCase();
      const g = norm(it.grade ?? it.Grade ?? it.GRADE);
      return p === programme && g === grade;
    });

    if (items.length === 0) return err("no_items_for_programme_and_grade", 404);

    const pick = items[index % items.length];

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
        stem: pick.stem ?? pick.question ?? pick.text ?? pick.prompt ?? null,
        options: pick.options ?? pick.answers ?? pick.choices ?? null,
        answer: pick.answer ?? pick.correct ?? pick.correct_answer ?? null,
        raw: pick,
      },
    };

    const res = ok(payload, 200);
    res.headers.set("Cache-Control", "no-store, max-age=0");
    return res;
  } catch (e: any) {
    const msg = e?.message || "next_item_failed";
    const status = msg.startsWith("items_data_missing") ? 500 : 500;
    return err(msg, status);
  }
}

export async function POST() { return err("method_not_allowed", 405); }
export async function PUT() { return err("method_not_allowed", 405); }
export async function DELETE() { return err("method_not_allowed", 405); }
