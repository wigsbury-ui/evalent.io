import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getPartnerFromCookie } from "@/lib/partner/auth";

export async function GET(req: NextRequest) {
  const payload = await getPartnerFromCookie(req);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("partner_videos")
    .select("id, title, vimeo_id, description, category, thumbnail_url, sort_order, created_at")
    .eq("is_live", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
