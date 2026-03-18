import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "super_admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServerClient();
  const token = process.env.VIMEO_TOKEN;

  // Get all videos that need thumbnails
  const { data: videos } = await supabase
    .from("partner_videos")
    .select("id, vimeo_id, thumbnail_url")
    .not("vimeo_id", "is", null);

  if (!videos?.length)
    return NextResponse.json({ updated: 0, message: "No videos found" });

  const results = [];
  for (const video of videos) {
    try {
      // Fetch thumbnail from Vimeo API
      const res = await fetch(
        `https://api.vimeo.com/videos/${video.vimeo_id}/pictures`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.vimeo.*+json;version=3.4",
          },
        }
      );
      const data = await res.json();
      const pictures = data.data?.[0]?.sizes;
      // Get largest thumbnail — prefer 640 wide
      const thumb = pictures?.find((s: any) => s.width === 640)
        || pictures?.find((s: any) => s.width >= 400)
        || pictures?.[0];

      if (thumb?.link) {
        await supabase
          .from("partner_videos")
          .update({ thumbnail_url: thumb.link })
          .eq("id", video.id);
        results.push({ vimeo_id: video.vimeo_id, thumbnail: thumb.link, ok: true });
      } else {
        results.push({ vimeo_id: video.vimeo_id, ok: false, reason: "No pictures found" });
      }
    } catch (e: any) {
      results.push({ vimeo_id: video.vimeo_id, ok: false, reason: e.message });
    }
  }

  const updated = results.filter(r => r.ok).length;
  return NextResponse.json({ updated, total: videos.length, results });
}
