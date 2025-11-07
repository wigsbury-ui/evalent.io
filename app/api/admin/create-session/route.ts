// app/api/admin/create-session/route.ts
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function must(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

function siteOrigin() {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}

export async function GET() {
  try {
    const SUPABASE_URL = must("SUPABASE_URL");
    const SERVICE_KEY  = must("SUPABASE_SERVICE_ROLE_KEY");

    // Insert an empty row; DB default populates public_token
    const url = `${SUPABASE_URL}/rest/v1/sessions?select=public_token`;
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
        // This header makes PostgREST return the inserted row
        Prefer: "return=representation",
      },
      body: JSON.stringify({}),
      cache: "no-store",
    });

    const raw = await resp.text(); // be robust even if body is empty/HTML
    if (!resp.ok) {
      return NextResponse.json(
        { ok: false, error: `HTTP ${resp.status} ${resp.statusText}: ${raw}` },
        { status: 500 }
      );
    }

    let json: any = [];
    try {
      json = raw ? JSON.parse(raw) : [];
    } catch {
      return NextResponse.json(
        { ok: false, error: `Non-JSON response from PostgREST: ${raw?.slice(0,400)}` },
        { status: 500 }
      );
    }

    const token = json?.[0]?.public_token;
    if (!token) {
      return NextResponse.json(
        { ok: false, error: `Insert returned no token. Raw: ${raw?.slice(0,400)}` },
        { status: 500 }
      );
    }

    const open = `${siteOrigin()}/t/${token}`;
    return NextResponse.json({ ok: true, token, url: open }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: String(err?.message ?? err) },
      { status: 500 }
    );
  }
}
