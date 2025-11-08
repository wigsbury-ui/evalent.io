import { NextResponse } from "next/server";
import { admin } from "@/lib/db";
import { items } from "@/lib/item";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    if (!token) return NextResponse.json({ ok: false, error: "Missing token" }, { status: 400 });

    const supabase = admin();
    const { data: rows, error } = await supabase.from("sessions").select("*").eq("public_token", token).limit(1);
    if (error) throw error;
    const row = rows?.[0];
    if (!row) return NextResponse.json({ ok: false, error: "Session not found" }, { status: 404 });

    const idx = row.item_index ?? 0;
    if (idx >= items.length) return NextResponse.json({ ok: true, done: true });

    const item = items[idx];
    // Hide correctIndex from client for MCQ
    const safe = item.type === "mcq"
      ? { id: item.id, domain: item.domain, type: "mcq" as const, prompt: item.prompt, options: item.options }
      : { id: item.id, domain: item.domain, type: "written" as const, prompt: item.prompt };

    return NextResponse.json({ ok: true, done: false, item: safe });
  } catch (e:any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
