import { NextResponse } from "next/server";
import { sbAdmin } from "@/lib/supabase"; // your existing helper that returns a Supabase service client

export const dynamic = "force-dynamic";

function buildUrl(origin: string, token: string) {
  // We’ll always use /t/[token]; no /dev variant needed
  return `${origin}/t/${token}`;
}

async function createSession(req: Request) {
  try {
    const sb = sbAdmin(); // NOTE: must be called as a function
    const token = crypto.randomUUID().replace(/-/g, ""); // 32-char hex-ish

    // Minimal insert; other FKs are optional in your schema
    const { error } = await sb
      .from("sessions")
      .insert({ status: "pending", public_token: token })
      .select("public_token")
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }

    const origin = new URL(req.url).origin;
    return NextResponse.json({ ok: true, token, url: buildUrl(origin, token) });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return createSession(request);
}

export async function GET(request: Request) {
  return createSession(request);
}
