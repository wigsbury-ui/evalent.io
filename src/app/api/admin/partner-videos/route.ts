import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";

async function guard() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "super_admin") return null;
  return session;
}

function toSlug(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
}

function generateCaption(title: string, description?: string): string {
  const base = description ? `${title} — ${description}` : title;
  return `📽️ ${base}\n\nSee how Evalent helps international schools make smarter admissions decisions — fast, structured, and powered by AI.\n\nWatch the full video and start your free trial 👇`;
}

export async function GET() {
  const session = await guard();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("partner_videos").select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const session = await guard();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { title, vimeo_id, description, category, thumbnail_url, is_live, sort_order, share_caption } = body;
  if (!title || !vimeo_id) return NextResponse.json({ error: "Title and Vimeo ID are required" }, { status: 400 });

  // Auto-generate slug — ensure uniqueness by appending random suffix if needed
  const baseSlug = toSlug(title);
  const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
  const caption = share_caption || generateCaption(title, description);

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("partner_videos")
    .insert({ title, vimeo_id: vimeo_id.trim(), description, category: category || "General", thumbnail_url, is_live: is_live ?? false, sort_order: sort_order ?? 0, share_slug: slug, share_caption: caption })
    .select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest) {
  const session = await guard();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, ...updates } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  // Regenerate caption if title/description changed and no explicit caption provided
  if ((updates.title || updates.description) && !updates.share_caption) {
    // Don\'t override existing caption on edit — admin may have customised it
  }
  updates.updated_at = new Date().toISOString();
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("partner_videos").update(updates).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  const session = await guard();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await req.json();
  const supabase = createServerClient();
  const { error } = await supabase.from("partner_videos").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
