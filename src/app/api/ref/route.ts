import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

// GET /api/ref?slug=PARTNER_SLUG
// Tracks click and redirects to destination
export async function GET(req: NextRequest) {
  const slug = new URL(req.url).searchParams.get("slug");
  if (!slug) return NextResponse.redirect("https://app.evalent.io/signup");

  const supabase = createServerClient();
  const { data: link } = await supabase
    .from("referral_links")
    .select("id, destination_url, is_active, partner_id, clicks")
    .eq("slug", slug)
    .single();

  if (!link || !link.is_active) return NextResponse.redirect("https://app.evalent.io/signup");

  // Increment click counter (fire and forget)
  supabase.from("referral_links")
    .update({ clicks: (link.clicks ?? 0) + 1 })
    .eq("id", link.id)
    .then(() => {});

  const dest = new URL(link.destination_url || "https://app.evalent.io/signup");
  dest.searchParams.set("ref", slug);

  const response = NextResponse.redirect(dest.toString());
  response.cookies.set("evalent_ref", slug, {
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
    sameSite: "lax",
  });
  return response;
}
