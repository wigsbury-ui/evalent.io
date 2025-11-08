import { NextResponse } from "next/server";
import { items } from "@/lib/item";
import { supa } from "@/lib/db"; // your existing client

export async function POST(req: Request) {
  try {
    const { token } = await req.json();
    if (!token) return NextResponse.json({ ok: false, error: "Missing token" }, { status: 400 });

    const { data: session, error } = await supa
      .from("sessions")
      .select("id, item_index, status")
      .eq("public_token", token)
      .single();

    if (error || !session) {
      return NextResponse.json({ ok: false, error: "Session not found" }, { status: 404 });
    }

    const idx = session.item_index ?? 0;
    if (idx >= items.length) {
      return NextResponse.json({ ok: true, done: true });
    }

    const it = items[idx];
    return NextResponse.json({
      ok: true,
      done: false,
      index: idx,
      total: items.length,
      item: {
        id: it.id,
        domain: it.domain,
        type: it.type,
        prompt: it.prompt,
        options: it.type === "mcq" ? it.options : undefined,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "Server error" }, { status: 500 });
  }
}
