import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * Help videos are stored in the platform_settings table as a single row
 * with key = 'help_videos' and value = JSONB array of video configs.
 *
 * Each video config:
 * {
 *   id: string,        // unique key like "grade_thresholds", "school_config", "dashboard"
 *   label: string,     // display name: "Grade Thresholds"
 *   url: string,       // Vimeo URL
 *   description: string // optional context
 * }
 */

// GET /api/admin/help-videos — returns all help video configs
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("platform_settings")
    .select("value")
    .eq("key", "help_videos")
    .single();

  if (error && error.code !== "PGRST116") {
    // PGRST116 = row not found — that's OK, return empty
    console.error("[HELP-VIDEOS] Fetch error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data?.value || []);
}

// PATCH /api/admin/help-videos — update help video configs (super_admin only)
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const videos = body.videos;

  if (!Array.isArray(videos)) {
    return NextResponse.json(
      { error: "videos must be an array" },
      { status: 400 }
    );
  }

  // Validate structure
  for (const v of videos) {
    if (!v.id || !v.label) {
      return NextResponse.json(
        { error: "Each video must have id and label" },
        { status: 400 }
      );
    }
  }

  const supabase = createServerClient();

  // Upsert the platform_settings row
  const { data, error } = await supabase
    .from("platform_settings")
    .upsert(
      { key: "help_videos", value: videos, updated_at: new Date().toISOString() },
      { onConflict: "key" }
    )
    .select()
    .single();

  if (error) {
    console.error("[HELP-VIDEOS] Update error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Audit log
  await supabase.from("audit_log").insert({
    actor_id: session.user.id,
    actor_email: session.user.email,
    action: "update_help_videos",
    entity_type: "platform_settings",
    entity_id: "help_videos",
    details: { video_count: videos.length },
  });

  return NextResponse.json(data?.value || videos);
}
