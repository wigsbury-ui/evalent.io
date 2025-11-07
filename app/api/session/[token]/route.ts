import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

function sUrl(path: string) {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return null;
  }
  return `${SUPABASE_URL.replace(/\/+$/,'')}/rest/v1/${path.replace(/^\/+/,'')}`;
}

async function sFetch(path: string, init?: RequestInit) {
  const url = sUrl(path);
  if (!url) throw new Error("Supabase env not set");
  const headers: Record<string,string> = {
    apikey: SERVICE_KEY!,
    Authorization: `Bearer ${SERVICE_KEY!}`,
    Prefer: "return=representation",
    "Content-Type": "application/json",
  };
  return fetch(url, { ...init, headers: { ...headers, ...(init?.headers as any) } });
}

// GET /api/session/[token]  → fetch session by public_token
export async function GET(_: NextRequest, { params }: { params: { token: string } }) {
  try {
    const r = await sFetch(`sessions?public_token=eq.${params.token}&select=*`, { cache: "no-store" });
    const rows = await r.json();
    if (!r.ok || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ ok: false, error: "Session not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, session: rows[0] });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}

// POST /api/session/[token]  → mark session active (visited)
export async function POST(_: NextRequest, { params }: { params: { token: string } }) {
  try {
    const body = { status: "active", visited_at: new Date().toISOString() };
    const r = await sFetch(`sessions?public_token=eq.${params.token}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    const rows = await r.json();
    if (!r.ok || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ ok: false, error: "Failed to start session" }, { status: 400 });
    }
    return NextResponse.json({ ok: true, session: rows[0] });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}

// PATCH /api/session/[token]  → arbitrary updates (e.g., {status:"finished"})
export async function PATCH(req: NextRequest, { params }: { params: { token: string } }) {
  try {
    const patch = await req.json();
    const r = await sFetch(`sessions?public_token=eq.${params.token}`, {
      method: "PATCH",
      body: JSON.stringify(patch || {}),
    });
    const rows = await r.json();
    if (!r.ok || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ ok: false, error: "Update failed" }, { status: 400 });
    }
    return NextResponse.json({ ok: true, session: rows[0] });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
