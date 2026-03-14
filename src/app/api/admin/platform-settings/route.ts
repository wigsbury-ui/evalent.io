import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";

async function guard() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "super_admin") return null;
  return session;
}

export async function GET() {
  const session = await guard();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = createServerClient();
  const { data } = await supabase.from("platform_settings").select("key, value");
  const settings: Record<string, string | null> = {};
  (data || []).forEach((row: any) => {
    const v = row.value;
    if (v === null || v === undefined || v === "") settings[row.key] = null;
    else if (typeof v === "string") settings[row.key] = v;
    else settings[row.key] = String(v);
  });
  return NextResponse.json(settings);
}

export async function PATCH(req: NextRequest) {
  const session = await guard();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const supabase = createServerClient();
  for (const [key, value] of Object.entries(body)) {
    // jsonb column — store strings as JSON strings, null/empty as empty string
    const jsonValue = (value === null || value === "") ? "" : value;
    await supabase
      .from("platform_settings")
      .upsert({ key, value: jsonValue, updated_at: new Date().toISOString() });
  }
  return NextResponse.json({ ok: true });
}
