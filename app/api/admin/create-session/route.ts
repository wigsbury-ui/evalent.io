import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// --- adjust types only if you already have them
type Json = Record<string, any>;

// Minimal admin client helper
function sbAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(req: NextRequest) {
  try {
    const sb = sbAdmin();

    // 1) create school
    const { data: school, error: schErr } = await sb
      .from("schools")
      .insert({ name: "Demo School" })
      .select("id")
      .single();

    if (schErr) throw schErr;

    // 2) create candidate
    const { data: cand, error: candErr } = await sb
      .from("candidates")
      .insert({ school_id: school!.id, first_name: "Demo", last_name: "Student" })
      .select("id")
      .single();

    if (candErr) throw candErr;

    // 3) create blueprint (ensure NOT NULL columns satisfied)
    const { data: bp, error: bpErr } = await sb
      .from("blueprints")
      .insert({
        school_id: school!.id,
        name: "Demo Blueprint",
        programme: "UK",
        grade: 7,
        pass_logic: "always", // simple default
      })
      .select("id")
      .single();

    if (bpErr) throw bpErr;

    // 4) create session with status 'pending'
    const { data: sess, error: sessErr } = await sb
      .from("sessions")
      .insert({
        school_id: school!.id,
        candidate_id: cand!.id,
        blueprint_id: bp!.id,
        status: "pending",
      })
      .select("public_token")
      .single();

    if (sessErr) throw sessErr;

    const token = sess!.public_token as string;

    // Compute a stable origin
    const proto =
      req.headers.get("x-forwarded-proto") ??
      (process.env.NODE_ENV === "development" ? "http" : "https");
    const host =
      req.headers.get("x-forwarded-host") ??
      req.headers.get("host") ??
      new URL(req.url).host;
    const origin =
      process.env.NEXT_PUBLIC_SITE_URL ?? `${proto}://${host}`;

    // Always return a canonical /t/[token] link (dev & prod pages provided below)
    const url = `${origin}/t/${token}`;

    return NextResponse.json({ ok: true, token, url });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}
