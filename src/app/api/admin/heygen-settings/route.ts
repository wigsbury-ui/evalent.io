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
  const { data } = await supabase.from("platform_settings").select("key, value").in("key", ["heygen_avatars", "heygen_voices"]);
  const result: Record<string, any> = {};
  (data || []).forEach((row: any) => {
    try { result[row.key] = typeof row.value === "string" ? JSON.parse(row.value) : row.value; } catch {}
  });
  return NextResponse.json(result);
}

export async function PATCH(req: NextRequest) {
  const session = await guard();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { heygen_avatars, heygen_voices } = await req.json();
  const supabase = createServerClient();
  if (heygen_avatars) await supabase.from("platform_settings").upsert({ key: "heygen_avatars", value: JSON.stringify(heygen_avatars), updated_at: new Date().toISOString() });
  if (heygen_voices)  await supabase.from("platform_settings").upsert({ key: "heygen_voices",  value: JSON.stringify(heygen_voices),  updated_at: new Date().toISOString() });
  return NextResponse.json({ ok: true });
}
