import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("site_videos")
    .select("url")
    .eq("key", "marketing_hero")
    .single();

  return NextResponse.json(
    { url: data?.url || null },
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, s-maxage=300",
      },
    }
  );
}
