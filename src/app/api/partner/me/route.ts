import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getPartnerFromCookie } from "@/lib/partner/auth";

export async function GET(req: NextRequest) {
  const payload = await getPartnerFromCookie(req);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServerClient();
  const { data: partner, error } = await supabase
    .from("partners")
    .select("id, first_name, last_name, email, company, status, partner_type_id, partner_types(name, commission_model, commission_value, commission_scope), override_commission_model, override_commission_value, override_commission_scope, total_clicks, total_conversions, total_earned")
    .eq("id", payload.partnerId)
    .single();

  if (error || !partner) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [linksRes, conversionsRes, payoutsRes, videosRes] = await Promise.all([
    supabase.from("referral_links").select("id, slug, label, clicks, created_at").eq("partner_id", payload.partnerId).order("created_at"),
    supabase.from("referral_conversions").select("id, school_id, status, commission_amount: commission_earned, plan: subscription_tier, created_at, schools(name)").eq("partner_id", payload.partnerId).order("created_at", { ascending: false }),
    supabase.from("partner_payouts").select("id, amount, currency, status, payment_method, payment_reference, created_at, paid_at").eq("partner_id", payload.partnerId).order("created_at", { ascending: false }),
    supabase.from("partner_videos").select("id, title, vimeo_id, description, category, share_slug").eq("is_live", true).order("sort_order", { ascending: true }).limit(1),
  ]);

  return NextResponse.json({
    partner,
    links: linksRes.data || [],
    conversions: conversionsRes.data || [],
    payouts: payoutsRes.data || [],
    videos: videosRes.data || [],
  });
}
