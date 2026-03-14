import { Metadata } from "next";
import { createServerClient } from "@/lib/supabase/server";
import WatchClient from "./WatchClient";

interface Props { params: { slug: string }; searchParams: { ref?: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("partner_videos")
    .select("title, description")
    .eq("share_slug", params.slug)
    .eq("is_live", true)
    .single();
  return {
    title: data ? `${data.title} — Evalent` : "Evalent Video",
    description: data?.description || "AI-powered admissions assessments for international schools.",
    openGraph: {
      title: data ? `${data.title} — Evalent` : "Evalent",
      description: data?.description || "AI-powered admissions assessments for international schools.",
    },
  };
}

export default async function WatchPage({ params, searchParams }: Props) {
  const supabase = createServerClient();
  const { data: video } = await supabase
    .from("partner_videos")
    .select("id, title, vimeo_id, description, category, thumbnail_url, share_slug")
    .eq("share_slug", params.slug)
    .eq("is_live", true)
    .single();

  return <WatchClient video={video} refSlug={searchParams.ref} />;
}
