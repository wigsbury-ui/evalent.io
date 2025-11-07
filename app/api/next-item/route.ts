import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
// @ts-ignore - bundler handles JSON; TS type is not important here
import items from "../../../data/items_full.json";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  if (!token) return NextResponse.json({ error: "token required" }, { status: 400 });

  const { data: s, error } = await admin
    .from("sessions")
    .select("id,item_index,status")
    .eq("public_token", token)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!s)    return NextResponse.json({ error: "session not found" }, { status: 404 });

  const idx = s.item_index ?? 0;
  const bank = items as any[];

  if (idx >= bank.length) {
    await admin.from("sessions").update({ status: "finished" }).eq("id", s.id);
    return NextResponse.json({ done: true });
  }

  const item = bank[idx];
  return NextResponse.json({
    done: false,
    item: { id: item.id, prompt: item.prompt, choices: item.choices }
  });
}
