import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getPartnerFromCookie } from "@/lib/partner/auth";

export async function GET(req: NextRequest) {
  const payload = await getPartnerFromCookie(req);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("content_posts")
    .select("id, type, title, body, created_at, updated_at")
    .eq("shared_with_partners", true)
    .in("type", ["linkedin", "partner", "whatsapp"])
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}
