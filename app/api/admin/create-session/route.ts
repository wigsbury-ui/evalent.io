// app/api/admin/create-session/route.ts
import { NextResponse, NextRequest } from "next/server";
import { headers } from "next/headers";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function sbAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

function originFromHeaders(): string {
  const h = headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("x-forwarded-host");
  if (host) return `${proto}://${host}`;
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

export async function POST(_req: NextRequest) {
  try {
    const sb = sbAdmin();

    // 1) Demo school
    const { data: school, error: schErr } = await sb
      .from("schools")
      .insert({ name: "Demo School" })
      .select("id, short_code, slug")
      .single();
    if (schErr) throw schErr;

    // 2) Candidate
    const { data: cand, error: candErr } = await sb
      .from("candidates")
      .insert({
        school_id: school.id,
        first_name: "Demo",
        last_name: "Student",
        email: "demo@example.com",
      })
      .select("id")
      .single();
    if (candErr) throw candErr;

    // 3) Blueprint (programme/grade/pass_logic cannot be null)
    const { data: bp, error: bpErr } = await sb
      .from("blueprints")
      .insert({
        school_id: school.id,
        programme: "UK",
        grade: 7,
        name: "Demo Blueprint",
        pass_logic: { type: "threshold", overall: 60 }, // minimal valid JSON
      })
      .select("id")
      .single();
    if (bpErr) throw bpErr;

    // 4) Session (status has valid default/constraint in DB now)
    const { data: sess, error: sessErr } = await sb
      .from("sessions")
      .insert({
        school_id: school.id,
        candidate_id: cand.id,
        blueprint_id: bp.id,
        status: "pending",
      })
      .select("id, token")
      .single();
    if (sessErr) throw sessErr;

    const origin = originFromHeaders();

    // Preferred deep link(s) if you later store them server-side:
    const links = {
      t: `${origin}/t/${sess.token}`,
      devTest: `${origin}/dev/test?token=${sess.token}`,
      test: `${origin}/test?token=${sess.token}`,
    };

    // Fallback: /t/[token]
    const url = links.t;

    return NextResponse.json({ ok: true, token: sess.token, url });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}
