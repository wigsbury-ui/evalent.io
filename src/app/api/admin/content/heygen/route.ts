import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";

async function guard() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "super_admin") return null;
  return session;
}

const HEYGEN_API = "https://api.heygen.com";
const HEYGEN_FOLDER = "7b735e5ec3b549bb9264b594d8a9490e";

// Known avatars from previous Evalent work
const AVATARS = {
  animated: { id: "881d169c307a4cd2acc76d0a6b5f5b0d", label: "Animated Clara" },
  real:     { id: "bf8381a3213d4359b6a4e9be8046ae7b", label: "Real Clara" },
};
const VOICES = {
  uk: { id: "A1pGOLo02KVeFRghTFnF", label: "UK English" },
  us: { id: "TW9XPf7yjX2Xg5kWijqY", label: "US English" },
};

async function heygenFetch(method: string, path: string, body?: any) {
  const key = process.env.HEYGEN_API_KEY;
  if (!key) throw new Error("HEYGEN_API_KEY not configured in environment variables");
  const opts: RequestInit = {
    method,
    headers: { "Accept": "application/json", "X-Api-Key": key, ...(body ? { "Content-Type": "application/json" } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  };
  const res = await fetch(`${HEYGEN_API}${path}`, opts);
  return res.json();
}

// POST — generate a new HeyGen video from a content post
export async function POST(req: NextRequest) {
  const session = await guard();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { post_id, avatar_type = "real", voice = "uk" } = await req.json();

  const supabase = createServerClient();
  const { data: post, error } = await supabase
    .from("content_posts").select("*").eq("id", post_id).single();

  if (error || !post) return NextResponse.json({ error: "Post not found" }, { status: 404 });
  if (post.type !== "video_script") return NextResponse.json({ error: "Only video scripts can be sent to HeyGen" }, { status: 400 });

  const avatarId = AVATARS[avatar_type as keyof typeof AVATARS]?.id || AVATARS.real.id;
  const voiceId  = VOICES[voice as keyof typeof VOICES]?.id || VOICES.uk.id;

  // Clean script — remove stage directions for the spoken text
  const spokenScript = post.body
    .replace(/\[PAUSE\]/g, " ")
    .replace(/\[EMPHASIS\]/g, "")
    .replace(/\[.*?\]/g, "")
    .trim();

  const payload = {
    title: post.title,
    folder_id: HEYGEN_FOLDER,
    video_inputs: [{
      character: {
        type: "talking_photo",
        talking_photo_id: avatarId,
      },
      voice: {
        type: "text",
        input_text: spokenScript,
        voice_id: voiceId,
        speed: 0.9,
      },
    }],
    dimension: { width: 1280, height: 720 },
  };

  const result = await heygenFetch("POST", "/v2/video/generate", payload);

  if (result.error) {
    return NextResponse.json({ error: result.error.message || JSON.stringify(result.error) }, { status: 500 });
  }

  const videoId = result.data?.video_id;
  if (!videoId) return NextResponse.json({ error: "No video_id returned from HeyGen" }, { status: 500 });

  // Save HeyGen video ID back to the post
  await supabase.from("content_posts").update({
    heygen_video_id: videoId,
    heygen_status: "pending",
    avatar_id: avatarId,
    voice_id: voiceId,
    updated_at: new Date().toISOString(),
  }).eq("id", post_id);

  return NextResponse.json({ video_id: videoId, status: "pending" });
}

// GET — check status of a HeyGen video
export async function GET(req: NextRequest) {
  const session = await guard();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const post_id = new URL(req.url).searchParams.get("post_id");
  if (!post_id) return NextResponse.json({ error: "Missing post_id" }, { status: 400 });

  const supabase = createServerClient();
  const { data: post } = await supabase
    .from("content_posts").select("heygen_video_id, heygen_status, heygen_video_url").eq("id", post_id).single();

  if (!post?.heygen_video_id) return NextResponse.json({ error: "No HeyGen video for this post" }, { status: 404 });

  // If already completed, return cached URL
  if (post.heygen_status === "completed" && post.heygen_video_url) {
    return NextResponse.json({ status: "completed", video_url: post.heygen_video_url });
  }

  const result = await heygenFetch("GET", `/v1/video_status.get?video_id=${post.heygen_video_id}`);
  const status = result.data?.status;
  const videoUrl = result.data?.video_url;

  // Update status in DB
  const updates: Record<string, any> = {
    heygen_status: status,
    updated_at: new Date().toISOString(),
  };
  if (videoUrl) updates.heygen_video_url = videoUrl;

  await supabase.from("content_posts").update(updates).eq("id", post_id);

  return NextResponse.json({ status, video_url: videoUrl || null });
}

// PATCH — list available avatars and voices (for future avatar picker)
export async function PATCH(req: NextRequest) {
  const session = await guard();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json({ avatars: AVATARS, voices: VOICES });
}
