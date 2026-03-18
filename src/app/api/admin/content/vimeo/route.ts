import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";

async function guard() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "super_admin") return null;
  return session;
}

async function vimeoFetch(method: string, path: string, body?: any) {
  const token = process.env.VIMEO_TOKEN;
  if (!token) throw new Error("VIMEO_TOKEN not configured");
  const opts: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/vnd.vimeo.*+json;version=3.4",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  };
  const res = await fetch(`https://api.vimeo.com${path}`, opts);
  if (res.status === 204) return {};
  return res.json();
}

export async function POST(req: NextRequest) {
  const session = await guard();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { post_id } = await req.json();

  const supabase = createServerClient();
  const { data: post } = await supabase
    .from("content_posts").select("*").eq("id", post_id).single();

  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });
  if (!post.heygen_video_url) return NextResponse.json({ error: "HeyGen video not ready yet — wait for it to complete" }, { status: 400 });
  if (post.vimeo_id) return NextResponse.json({ error: "Already pushed to Vimeo", vimeo_id: post.vimeo_id }, { status: 400 });

  // Pull upload from HeyGen URL
  const vimeoRes = await vimeoFetch("POST", "/me/videos", {
    upload: {
      approach: "pull",
      link: post.heygen_video_url,
    },
    name: post.title,
    description: post.excerpt || "",
    privacy: { view: "anybody" },
  });

  const vimeoUri  = vimeoRes.uri;  // e.g. /videos/12345678
  const vimeoLink = vimeoRes.link; // e.g. https://vimeo.com/12345678
  const vimeoId   = vimeoUri?.split("/").pop();

  if (!vimeoId) return NextResponse.json({ error: "Vimeo upload failed", detail: vimeoRes }, { status: 500 });

  // Save Vimeo ID back to content post
  await supabase.from("content_posts").update({
    vimeo_id: vimeoId,
    vimeo_url: vimeoLink,
    updated_at: new Date().toISOString(),
  }).eq("id", post_id);

  // Auto-create a partner_videos entry (draft) so it appears in Media Library
  // Generate a share slug from the title
  const shareSlug = post.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50) + "-" + Math.random().toString(36).slice(2, 6);

  // Get current max sort order
  const { data: maxSort } = await supabase
    .from("partner_videos")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .single();

  const nextOrder = (maxSort?.sort_order ?? 0) + 1;

  const { data: newVideo } = await supabase.from("partner_videos").insert({
    title:         post.title,
    vimeo_id:      vimeoId,
    description:   post.excerpt || "",
    category:      "Product Demo",
    is_live:       false,          // draft — admin reviews before publishing
    sort_order:    nextOrder,
    share_slug:    shareSlug,
    share_caption: post.body
      ? post.body.slice(0, 280).replace(/\[PAUSE\]|\[EMPHASIS\]/g, "").trim()
      : post.title,
    thumbnail_url: `https://i.vimeocdn.com/video/${vimeoId}_640x360.jpg`,
    created_at:    new Date().toISOString(),
    updated_at:    new Date().toISOString(),
  }).select().single();

  return NextResponse.json({
    vimeo_id:         vimeoId,
    vimeo_url:        vimeoLink,
    partner_video_id: newVideo?.id || null,
    media_library:    "Video added to Media Library as draft — publish it from the Media tab",
  });
}
