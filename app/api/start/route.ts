import { NextResponse } from "next/server";
import { createClient } from "@/lib/supa";

export const runtime = "nodejs"; // service-role key requires Node, not Edge

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const pass = (url.searchParams.get("passcode") || "").trim();
    const expected = (process.env.NEXT_PUBLIC_START_PASSCODE || "").trim();

    if (!expected || pass !== expected) {
      return NextResponse.json({ error: "bad passcode" }, { status: 401 });
    }

    const schoolId = process.env.DEFAULT_SCHOOL_ID;
    if (!schoolId) {
      return NextResponse.json({ error: "DEFAULT_SCHOOL_ID missing" }, { status: 500 });
    }

    const supa = createClient();

    const { data, error } = await supa
      .from("sessions")
      .insert([{ status: "active", item_index: 0, school_id: schoolId }])
      .select("token")
      .single();

    if (error) {
      return NextResponse.json({ error: `DB error: ${error.message}` }, { status: 500 });
    }

    return NextResponse.json({ ok: true, href: `/t/${data.token}` });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
