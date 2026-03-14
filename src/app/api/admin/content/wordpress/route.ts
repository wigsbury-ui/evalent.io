import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";

async function guard() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "super_admin") return null;
  return session;
}

export async function POST(req: NextRequest) {
  const session = await guard();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { post_id } = await req.json();

  const wpUser = process.env.WP_APP_USER;
  const wpPass = process.env.WP_APP_PASSWORD;
  const wpUrl  = process.env.WP_SITE_URL || "https://evalent.io";

  if (!wpUser || !wpPass) {
    return NextResponse.json({
      error: "WordPress credentials not configured. Add WP_APP_USER and WP_APP_PASSWORD to Vercel environment variables."
    }, { status: 503 });
  }

  const supabase = createServerClient();
  const { data: post, error } = await supabase
    .from("content_posts").select("*").eq("id", post_id).single();

  if (error || !post) return NextResponse.json({ error: "Post not found" }, { status: 404 });
  if (post.type !== "blog") return NextResponse.json({ error: "Only blog posts can be pushed to WordPress" }, { status: 400 });

  const credentials = Buffer.from(`${wpUser}:${wpPass}`).toString("base64");

  const wpPayload: Record<string, any> = {
    title:   post.title,
    content: post.body,
    excerpt: post.excerpt || "",
    status:  "draft", // always draft — you publish from WP admin
  };
  if (post.category_id) wpPayload.categories = [post.category_id];

  const wpRes = await fetch(`${wpUrl}/wp-json/wp/v2/posts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Basic ${credentials}`,
    },
    body: JSON.stringify(wpPayload),
  });

  const wpData = await wpRes.json();
  if (!wpRes.ok) {
    return NextResponse.json({ error: wpData.message || "WordPress error", detail: wpData }, { status: 500 });
  }

  // Save WP post ID and URL back to our DB
  await supabase.from("content_posts").update({
    wp_post_id:   wpData.id,
    wp_url:       wpData.link,
    status:       "published",
    published_at: new Date().toISOString(),
    updated_at:   new Date().toISOString(),
  }).eq("id", post_id);

  return NextResponse.json({ wp_post_id: wpData.id, wp_url: wpData.link, wp_edit_url: `${wpUrl}/wp-admin/post.php?post=${wpData.id}&action=edit` });
}
