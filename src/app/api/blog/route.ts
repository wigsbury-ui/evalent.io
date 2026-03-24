import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug");
  const category = searchParams.get("category");
  const search = searchParams.get("search");
  const supabase = createServerClient();

  let query = supabase
    .from("content_posts")
    .select("id, slug, title, excerpt, body, blog_category, tags, cover_image_url, reading_time, published_at, created_by")
    .eq("type", "blog")
    .eq("status", "published")
    .order("published_at", { ascending: false });

  if (slug) {
    query = query.eq("slug", slug);
    const { data, error } = await query.single();
    if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(data);
  }

  if (category) query = query.eq("blog_category", category);
  if (search) query = query.or(
    `title.ilike.%${search}%,excerpt.ilike.%${search}%`
  );

  const { data, error } = await query.limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Add CORS for marketing site
  return new NextResponse(JSON.stringify(data || []), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "https://evalent.io",
    },
  });
}
