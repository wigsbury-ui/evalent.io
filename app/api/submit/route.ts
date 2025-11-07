import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import items from "@/data/items_full.json";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function POST(req: Request) {
  const { token, itemId, answer } = await req.json().catch(() => ({}));
  if (!token || !itemId) {
    return NextResponse.json({ error: "token and itemId required" }, { status: 400 });
  }

  const { data: s, error } = await admin
    .from("sessions")
    .select("id,item_index")
    .eq("public_token", token)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!s)    return NextResponse.json({ error: "session not found" }, { status: 404 });

  // record attempt
  await admin.from("attempts").insert({
    session_id: s.id,
    item_id: itemId,
    answer
  });

  const nextIndex = (s.item_index ?? 0) + 1;
  const done = nextIndex >= (items as any[]).length;

  await admin
    .from("sessions")
    .update({ item_index: nextIndex, status: done ? "finished" : "active" })
    .eq("id", s.id);

  return NextResponse.json({ ok: true, done });
}
