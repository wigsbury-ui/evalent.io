import { NextResponse } from "next/server";
import { items } from "@/lib/items";
import { supa } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const { token, itemId, answer } = await req.json();
    if (!token || !itemId) {
      return NextResponse.json({ ok: false, error: "Missing token or itemId" }, { status: 400 });
    }

    const { data: session, error } = await supa
      .from("sessions")
      .select("id, item_index")
      .eq("public_token", token)
      .single();

    if (error || !session) {
      return NextResponse.json({ ok: false, error: "Session not found" }, { status: 404 });
    }

    // Advance index; finish when past the last item
    const nextIndex = (session.item_index ?? 0) + 1;
    const finished = nextIndex >= items.length;

    const { error: uErr } = await supa
      .from("sessions")
      .update({
        item_index: nextIndex,
        last_answered_at: new Date().toISOString(),
        finished_at: finished ? new Date().toISOString() : null,
        status: finished ? "finished" : "pending",
      })
      .eq("id", session.id);

    if (uErr) return NextResponse.json({ ok: false, error: uErr.message }, { status: 500 });

    return NextResponse.json({ ok: true, finished });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "Server error" }, { status: 500 });
  }
}
