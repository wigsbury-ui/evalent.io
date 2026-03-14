import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getPartnerFromCookie } from "@/lib/partner/auth";

export async function GET(req: NextRequest) {
  const payload = await getPartnerFromCookie(req);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Also get partner\'s first referral link slug for building share URLs
  const supabase = createServerClient();
  const [videosRes, linksRes] = await Promise.all([
    supabase.from("partner_videos")
      .select("id, title, vimeo_id, description, category, thumbnail_url, sort_order, share_slug, share_caption, created_at")
      .eq("is_live", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false }),
    supabase.from("referral_links")
      .select("slug")
      .eq("partner_id", payload.partnerId)
      .order("created_at", { ascending: true })
      .limit(1),
  ]);

  const partnerSlug = linksRes.data?.[0]?.slug || null;
  return NextResponse.json({ videos: videosRes.data || [], partnerSlug });
}
