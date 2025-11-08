import { NextResponse } from "next/server";
import { admin } from "@/lib/db";
import { items } from "@/lib/item";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const token: string | undefined = body?.token;
    if (!token) return NextResponse.json({ ok: false, error: "Missing token" }, { status: 400 });

    const supabase = admin();
    const { data: rows, error } = await supabase.from("sessions").select("*").eq("public_token", token).limit(1);
    if (error) throw error;
    const row = rows?.[0];
    if (!row) return NextResponse.json({ ok: false, error: "Session not found" }, { status: 404 });

    const idx = row.item_index ?? 0;
    if (idx >= items.length) return NextResponse.json({ ok: true, done: true });

    const item = items[idx];

    // (optional) validate MCQ choice; we don't store answers in this baseline
    if (item.type === "mcq") {
      const choice = Number.isInteger(body?.choice) ? Number(body.choice) : null;
      if (choice === null || choice < 0 || choice >= item.options.length) {
        return NextResponse.json({ ok: false, error: "Invalid choice" }, { status: 400 });
      }
      // could compute correctness here if needed
    } else {
      // written: body.text can be anything; skip storing for baseline
    }

    // increment index
    const { error: upError } = await supabase.from("sessions").update({
      item_index: idx + 1,
      visited_at: new Date().toISOString()
    }).eq("public_token", token);
    if (upError) throw upError;

    const done = idx + 1 >= items.length;
    return NextResponse.json({ ok: true, done });
  } catch (e:any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
