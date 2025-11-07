import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const url   = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key   = process.env.SUPABASE_SERVICE_ROLE_KEY!; // server-only
const site  = process.env.NEXT_PUBLIC_SITE_URL;       // e.g. https://evalent-io.vercel.app

const admin = createClient(url, key, { auth: { persistSession: false } });

export async function GET(req: Request) {
  // Insert empty row – DB defaults will set public_token/status/created_at
  const { data, error } = await admin.from("sessions").insert({}).select("public_token").single();
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const token = data.public_token as string;

  // Prefer env SITE_URL, else request origin
  const origin = site || new URL(req.url).origin;
  const open = new URL(`/t/${token}`, origin).toString();

  return NextResponse.json({ ok: true, token, url: open });
}
