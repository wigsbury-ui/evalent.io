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
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("host") ?? "";
  return process.env.NEXT_PUBLIC_SITE_URL || `${proto}://${host}`;
}

function makeToken(): string {
  const buf = new Uint8Array(32);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function POST(_req: NextRequest) {
  try {
    const sb = sbAdmin();
    const base = makeBaseUrl();

    // 1) School
    const schoolName = "Demo School";
    let { data: school } = await sb
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
      if (ins.error) throw ins.error;
      school = ins.data!;
    }

    // 2) Candidate
    const candName = "Demo Candidate";
    let { data: candidate } = await sb
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
      if (ins.error) throw ins.error;
      candidate = ins.data!;
    }

    // 3) Blueprint
    const bpName = "Demo Blueprint";
    let { data: blueprint } = await sb
      .from("blueprints")
      .select("id")
      .eq("school_id", school.id)
      .eq("name", bpName)
      .maybeSingle();
    if (!blueprint) {
      const ins = await sb
        .from("blueprints")
        .insert({ school_id: school.id, name: bpName })
        .select("id")
        .single();
      if (ins.error) throw ins.error;
      blueprint = ins.data!;
    }

    // 4) Session
    const token = makeToken();
    const insSess = await sb.from("sessions").insert({
      school_id: school.id,
      candidate_id: candidate.id,
      blueprint_id: blueprint.id,
      token,
      // status uses DB default 'pending'
    });
    if (insSess.error) throw insSess.error;

    // Provide a direct working link to your runner under /dev/test
    const url = `${base}/dev/test?token=${token}`;
    const links = {
      test: url,
      take: `${base}/dev/take?token=${token}`,
    };

    return NextResponse.json({ ok: true, token, url, links });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? String(e) },
      { status: 400 }
    );
  }
}
