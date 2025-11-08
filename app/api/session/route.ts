import { NextResponse } from "next/server";
import { admin } from "@/lib/db";
import crypto from "crypto";

export async function POST() {
  try {
    const supabase = admin();
    const token = crypto.randomBytes(16).toString("hex");
    const { error } = await supabase.from("sessions").insert({
      public_token: token,
      status: "pending",
      item_index: 0
    });
    if (error) throw error;
    return NextResponse.json({ ok: true, token });
  } catch (e:any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
