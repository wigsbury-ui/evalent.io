// app/api/dev/session/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";       // ensure server runtime
export const dynamic = "force-dynamic";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // server-only key
);

function baseUrlFromRequest(req: Request) {
  const u = new URL(req.url);
  return `${u.protocol}//${u.host}`;
}

export async function POST(req: Request) {
  // Insert an empty row; DB defaults fill status/created_at/public_token
  const { data, error } = await supabaseAdmin
    .from("sessions")
    .insert({})
    .select("public_token")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const token = data!.public_token as string;
  const open = `${baseUrlFromRequest(req)}/t/${token}`;

  return NextResponse.json({ ok: true, token, url: open });
}
