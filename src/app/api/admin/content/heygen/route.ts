import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";

async function guard() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "super_admin") return null;
  return session;
}

const HEYGEN_API    = "https://api.heygen.com";
const HEYGEN_FOLDER = "7b735e5ec3b549bb9264b594d8a9490e";

// Fallback defaults (used if DB settings not found)
const DEFAULT_AVATARS = [
  { id: "881d169c307a4cd2acc76d0a6b5f5b0d", label: "Animated Clara", type: "animated" },
  { id: "bf8381a3213d4359b6a4e9be8046ae7b", label: "Real Clara",     type: "real"     },
];
const DEFAULT_VOICES = [
  { id: "A1pGOLo02KVeFRghTFnF", label: "UK English", flag: "🇬🇧" },
  { id: "TW9XPf7yjX2Xg5kWijqY", label: "US English", flag: "🇺🇸" },
];

const VIDEO_FORMATS: Record<string, { width: number; height: number; label: string }> = {
  landscape:  { width: 1280, height: 720,  label: "Landscape 16:9 (YouTube / Vimeo)" },
  portrait:   { width: 720,  height: 1280, label: "Portrait 9:16 (Instagram Reels / TikTok)" },
  square:     { width: 1080, height: 1080, label: "Square 1:1 (LinkedIn / Instagram)" },
  widescreen: { width: 1920, height: 1080, label: "Widescreen 1080p (Full HD)" },
};

async function heygenFetch(method: string, path: string, body?: any) {
  const key = process.env.HEYGEN_API_KEY;
  if (!key) throw new Error("HEYGEN_API_KEY not configured");
  const opts: RequestInit = {
    method,
    headers: {
      "Accept": "application/json",
      "X-Api-Key": key,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  };
  const res = await fetch(`${HEYGEN_API}${path}`, opts);
  return res.json();
}

async function getSettings(supabase: any) {
  const { data } = await supabase
    .from("platform_settings")
    .select("key, value")
    .in("key", ["heygen_avatars", "heygen_voices"]);

  let avatars = DEFAULT_AVATARS;
  let voices  = DEFAULT_VOICES;

  (data || []).forEach((row: any) => {
    try {
      const parsed = typeof row.value === "string" ? JSON.parse(row.value) : row.value;
      if (row.key === "heygen_avatars" && Array.isArray(parsed)) avatars = parsed;
      if (row.key === "heygen_voices"  && Array.isArray(parsed)) voices  = parsed;
    } catch {}
  });

  return { avatars, voices };
}

// POST — generate video
export async function POST(req: NextRequest) {
  const session = await guard();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { post_id, avatar_id, voice_id, video_format = "landscape" } = await req.json();

  const supabase = createServerClient();
  const { data: post, error } = await supabase
    .from("content_posts").select("*").eq("id", post_id).single();

  if (error || !post) return NextResponse.json({ error: "Post not found" }, { status: 404 });
  if (post.type !== "video_script") return NextResponse.json({ error: "Only video scripts can be sent to HeyGen" }, { status: 400 });

  const { avatars, voices } = await getSettings(supabase);

  // Use provided IDs or fall back to first in list
  const resolvedAvatarId = avatar_id || avatars[0]?.id;
  const resolvedVoiceId  = voice_id  || voices[0]?.id;
  const format = VIDEO_FORMATS[video_format] || VIDEO_FORMATS.landscape;

  if (!resolvedAvatarId || !resolvedVoiceId) {
    return NextResponse.json({ error: "No avatar or voice configured" }, { status: 400 });
  }

  // Clean script for spoken text
  const spokenScript = post.body
    .replace(/\[PAUSE\]/g, " ")
    .replace(/\[EMPHASIS\]/g, "")
    .replace(/\[.*?\]/g, "")
    .trim();

  const payload = {
    title:     post.title,
    folder_id: HEYGEN_FOLDER,
    video_inputs: [{
      character: { type: "talking_photo", talking_photo_id: resolvedAvatarId },
      voice:     { type: "text", input_text: spokenScript, voice_id: resolvedVoiceId, speed: 0.9 },
    }],
    dimension: { width: format.width, height: format.height },
  };

  const result = await heygenFetch("POST", "/v2/video/generate", payload);
  if (result.error) return NextResponse.json({ error: result.error.message || JSON.stringify(result.error) }, { status: 500 });

  const videoId = result.data?.video_id;
  if (!videoId) return NextResponse.json({ error: "No video_id from HeyGen" }, { status: 500 });

  await supabase.from("content_posts").update({
    heygen_video_id: videoId,
    heygen_status:   "pending",
    avatar_id:       resolvedAvatarId,
    voice_id:        resolvedVoiceId,
    updated_at:      new Date().toISOString(),
  }).eq("id", post_id);

  return NextResponse.json({ video_id: videoId, status: "pending", format: format.label });
}

// GET — check video status
export async function GET(req: NextRequest) {
  const session = await guard();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const post_id = new URL(req.url).searchParams.get("post_id");
  if (!post_id) return NextResponse.json({ error: "Missing post_id" }, { status: 400 });

  const supabase = createServerClient();
  const { data: post } = await supabase
    .from("content_posts").select("heygen_video_id, heygen_status, heygen_video_url").eq("id", post_id).single();

  if (!post?.heygen_video_id) return NextResponse.json({ error: "No HeyGen video" }, { status: 404 });
  if (post.heygen_status === "completed" && post.heygen_video_url) {
    return NextResponse.json({ status: "completed", video_url: post.heygen_video_url });
  }

  const result = await heygenFetch("GET", `/v1/video_status.get?video_id=${post.heygen_video_id}`);
  const status   = result.data?.status;
  const videoUrl = result.data?.video_url;

  const updates: Record<string, any> = { heygen_status: status, updated_at: new Date().toISOString() };
  if (videoUrl) updates.heygen_video_url = videoUrl;
  await supabase.from("content_posts").update(updates).eq("id", post_id);

  return NextResponse.json({ status, video_url: videoUrl || null });
}

// PATCH — get config (avatars, voices, formats) for UI
export async function PATCH(req: NextRequest) {
  const session = await guard();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServerClient();
  const { avatars, voices } = await getSettings(supabase);

  return NextResponse.json({ avatars, voices, formats: VIDEO_FORMATS });
}
