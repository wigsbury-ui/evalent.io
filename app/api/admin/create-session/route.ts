// app/api/admin/create-session/route.ts
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function siteOrigin() {
  // Set NEXT_PUBLIC_SITE_URL in Vercel to your full domain (no trailing slash)
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}

export async function GET() {
  const SUPABASE_URL = process.env.SUPABASE_URL!;
  const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  // Insert an empty row; DB default fills public_token
  const res = await fetch(`${SUPABASE_URL}/rest/v1/sessions?select=public_token`, {
    method: "POST",
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation"
    },
    body: JSON.stringify({})
  });

  if (!res.ok) {
    const error = await res.text().catch(() => `${res.status}`);
    return NextResponse.json({ ok: false, error }, { status: 500 });
  }

  const [row] = (await res.json()) as Array<{ public_token: string }>;
  const token = row?.public_token;
  const url = `${siteOrigin()}/t/${token}`;
  return NextResponse.json({ ok: true, token, url });
}
