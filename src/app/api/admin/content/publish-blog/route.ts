import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";

async function guard() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "super_admin") return null;
  return session;
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80)
    .replace(/^-|-$/g, "");
}

async function generateAndStoreCoverImage(
  postId: string,
  title: string,
  excerpt: string,
  supabase: ReturnType<typeof createServerClient>
): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || !anthropicKey) return null;

  try {
    // Ask Claude to create an optimal DALL-E prompt
    const promptRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 200,
        messages: [{
          role: "user",
          content: `Create a DALL-E 3 image prompt for a professional blog featured image.

Blog title: "${title}"
Content summary: "${excerpt?.slice(0, 300) || ""}"

Rules:
- ONE single bold visual metaphor — nothing else in the image
- Minimalist: 2-3 elements maximum, generous empty space
- Bold colour contrast: deep navy or royal blue against clean white or warm cream
- Flat editorial illustration style — NOT 3D renders, NOT photorealistic
- No faces, no people, no text or words in the image
- Wide 16:9 format with clear central focal point

Return ONLY the DALL-E prompt. Max 60 words.`
        }]
      })
    });
    const promptData = await promptRes.json();
    const imagePrompt = promptData.content?.[0]?.text?.trim();
    if (!imagePrompt) return null;

    // Generate with DALL-E 3
    const imageRes = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: imagePrompt,
        n: 1,
        size: "1792x1024",
        quality: "standard",
        style: "natural",
      }),
    });
    const imageData = await imageRes.json();
    const imageUrl = imageData.data?.[0]?.url;
    if (!imageUrl) return null;

    // Download and upload to Supabase Storage
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) return null;
    const imgBuffer = await imgRes.arrayBuffer();
    const fileName = `${postId}-${Date.now()}.jpg`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("blog-images")
      .upload(fileName, imgBuffer, {
        contentType: "image/jpeg",
        upsert: true,
      });

    if (uploadError) {
      console.error("[publish-blog] Storage upload error:", uploadError);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("blog-images")
      .getPublicUrl(fileName);

    return publicUrl;
  } catch (e) {
    console.error("[publish-blog] Image generation error:", e);
    return null;
  }
}

export async function POST(req: NextRequest) {
  const session = await guard();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { post_id } = await req.json();
  const supabase = createServerClient();

  const { data: post, error } = await supabase
    .from("content_posts").select("*").eq("id", post_id).single();
  if (error || !post) return NextResponse.json({ error: "Post not found" }, { status: 404 });
  if (post.type !== "blog") return NextResponse.json({ error: "Only blog posts can be published" }, { status: 400 });

  // Generate slug from title (ensure uniqueness)
  let slug = post.slug || slugify(post.title);
  const { data: existing } = await supabase
    .from("content_posts")
    .select("id")
    .eq("slug", slug)
    .neq("id", post_id)
    .single();
  if (existing) slug = `${slug}-${Date.now()}`;

  // Generate cover image (don't block publish if it fails)
  const coverImageUrl = await generateAndStoreCoverImage(
    post_id, post.title, post.excerpt || "", supabase
  );

  // Publish
  const updates: Record<string, any> = {
    slug,
    status: "published",
    published_at: post.published_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  if (coverImageUrl) updates.cover_image_url = coverImageUrl;

  const { data: updated, error: updateError } = await supabase
    .from("content_posts")
    .update(updates)
    .eq("id", post_id)
    .select().single();

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  return NextResponse.json({
    slug,
    published_at: updates.published_at,
    cover_image_url: coverImageUrl || null,
    url: `https://evalent.io/blog/${slug}`,
  });
}
