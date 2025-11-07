// app/api/admin/create-session/route.ts
import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

function sbAdmin(): SupabaseClient {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !key) {
    throw new Error(
      "Supabase env missing. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    );
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

function makeBaseUrl(): string {
  const h = headers();
  const scheme = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("host") ?? "";
  return process.env.NEXT_PUBLIC_SITE_URL || `${scheme}://${host}`;
}

function makeToken(): string {
  // 32-byte hex (64 chars)
  const buf = new Uint8Array(32);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function POST(_req: NextRequest) {
  try {
    const sb = sbAdmin();
    const base = makeBaseUrl();

    // --- Ensure a demo school exists (idempotent by name) ---
    const schoolName = "Demo School";
    let { data: school, error: schErr } = await sb
      .from("schools")
      .select("id")
      .eq("name", schoolName)
      .maybeSingle();

    if (!school) {
      const ins = await sb
        .from("schools")
        .insert({ name: schoolName })
        .select("id")
        .single();
      school = ins.data as any;
      schErr = ins.error as any;
    }
    if (schErr || !school) throw schErr || new Error("Failed to upsert school");

    // --- Ensure a demo candidate exists for that school ---
    const candName = "Demo Candidate";
    let { data: candidate, error: candErr } = await sb
      .from("candidates")
      .select("id")
      .eq("school_id", school.id)
      .eq("name", candName)
      .maybeSingle();

    if (!candidate) {
      const ins = await sb
        .from("candidates")
        .insert({ school_id: school.id, name: candName })
        .select("id")
        .single();
      candidate = ins.data as any;
      candErr = ins.error as any;
    }
    if (candErr || !candidate)
      throw candErr || new Error("Failed to upsert candidate");

    // --- Ensure a demo blueprint exists (fields kept minimal & DB defaults fill the rest) ---
    const bpName = "Demo Blueprint";
    let { data: blueprint, error: bpErr } = await sb
      .from("blueprints")
      .select("id")
      .eq("school_id", school.id)
      .eq("name", bpName)
      .maybeSingle();

    if (!blueprint) {
      const ins = await sb
        .from("blueprints")
        .insert({
          school_id: school.id,
          name: bpName,
          // rely on DB defaults for programme/grade/pass_logic if present
        })
        .select("id")
        .single();
      blueprint = ins.data as any;
      bpErr = ins.error as any;
    }
    if (bpErr || !blueprint)
      throw bpErr || new Error("Failed to upsert blueprint");

    // --- Create a session with a fresh token ---
    const token = makeToken();

    const { error: sessErr } = await sb.from("sessions").insert({
      school_id: school.id,
      candidate_id: candidate.id,
      blueprint_id: blueprint.id,
      token,
      // let DB default status = 'pending' (your constraint now allows this)
    });

    if (sessErr) throw sessErr;

    // Hand back direct links (pointing to your /dev runner)
    const url = `${base}/dev/t/${token}`;
    const links = {
      take: `${base}/dev/take?token=${token}`,
      test: `${base}/dev/test?token=${token}`,
    };

    return NextResponse.json({ ok: true, token, url, links });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? String(e) },
      { status: 400 }
    );
  }
}
