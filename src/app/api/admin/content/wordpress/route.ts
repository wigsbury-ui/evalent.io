import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";

async function guard() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "super_admin") return null;
  return session;
}

async function generateFeaturedImage(title: string, excerpt: string): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  try {
    // Ask Claude to create an optimal DALL-E prompt from the post title
    const promptRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY as string,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 200,
        messages: [{
          role: "user",
          content: `Create a DALL-E 3 image prompt for a blog post featured image. The image must visually represent the specific topic of this post.

Blog title: "${title}"
Content summary: "${excerpt?.slice(0, 300) || ""}"

The image should:
- Directly represent the SPECIFIC topic of this post — not generic education or technology imagery
- Be a conceptual illustration or editorial photograph that someone could look at and guess the blog topic
- Use real-world metaphors: e.g. for "admissions decisions" show doors/pathways/crossroads; for "data and assessments" show documents/charts; for "international schools" show diverse architectural elements or global imagery
- Professional, clean aesthetic — blues, whites, light grays — no cluttered backgrounds
- No faces, no people, no text or words in the image
- 16:9 wide format composition

Think carefully about what SPECIFIC visual metaphor represents "${title}" and build the prompt around that central metaphor.

Return ONLY the DALL-E prompt, nothing else. Max 80 words.`
        }]
      })
    });
    const promptData = await promptRes.json();
    const imagePrompt = promptData.content?.[0]?.text?.trim();
    if (!imagePrompt) return null;

    console.log("[WP Featured Image] Prompt:", imagePrompt);

    // Generate image with DALL-E 3
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
        size: "1792x1024",  // 16:9 wide format, best for featured images
        quality: "standard",
        style: "natural",
      }),
    });
    const imageData = await imageRes.json();
    const imageUrl = imageData.data?.[0]?.url;
    if (!imageUrl) {
      console.error("[WP Featured Image] No URL returned:", imageData);
      return null;
    }
    return imageUrl;
  } catch (e) {
    console.error("[WP Featured Image] Generation error:", e);
    return null;
  }
}

async function uploadImageToWordPress(
  imageUrl: string,
  title: string,
  wpUrl: string,
  credentials: string
): Promise<number | null> {
  try {
    // Download the image
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) return null;
    const imgBuffer = await imgRes.arrayBuffer();
    const imgBlob = new Uint8Array(imgBuffer);

    // Upload to WordPress media library
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 50);
    const filename = `${slug}-featured.jpg`;

    // Try www first, then bare domain
    const urls = wpUrl.includes("www.")
      ? [wpUrl]
      : [wpUrl.replace("https://", "https://www."), wpUrl];

    for (const url of urls) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 20000);
        const uploadRes = await fetch(`${url}/wp-json/wp/v2/media`, {
          method: "POST",
          headers: {
            "Authorization": `Basic ${credentials}`,
            "Content-Disposition": `attachment; filename="${filename}"`,
            "Content-Type": "image/jpeg",
          },
          body: imgBlob,
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          console.log("[WP Featured Image] Uploaded, media ID:", uploadData.id);
          return uploadData.id;
        }
      } catch (e) {
        console.error("[WP Featured Image] Upload failed for", url, e);
      }
    }
    return null;
  } catch (e) {
    console.error("[WP Featured Image] Upload error:", e);
    return null;
  }
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

  // Generate featured image with DALL-E 3 (runs in parallel with WP prep)
  const imagePromise = generateFeaturedImage(post.title, post.excerpt || "");


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

  // Attach featured image if generation succeeded
  let featuredImageId: number | null = null;
  try {
    const imageUrl = await imagePromise;
    if (imageUrl) {
      featuredImageId = await uploadImageToWordPress(imageUrl, post.title, wpUrl, credentials);
      if (featuredImageId) {
        // Set as featured image on the post
        await fetch(`${wpUrl.replace("https://", "https://www.")}/wp-json/wp/v2/posts/${wpData.id}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Basic ${credentials}`,
          },
          body: JSON.stringify({ featured_media: featuredImageId }),
        }).catch(() => {
          // Try bare domain if www fails
          return fetch(`${wpUrl}/wp-json/wp/v2/posts/${wpData.id}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Basic ${credentials}`,
            },
            body: JSON.stringify({ featured_media: featuredImageId }),
          });
        });
      }
    }
  } catch (e) {
    console.error("[WP Featured Image] Failed to attach:", e);
    // Don't fail the whole push if image generation fails
  }

  // Save WP post ID and URL back to our DB
  await supabase.from("content_posts").update({
    wp_post_id:   wpData.id,
    wp_url:       wpData.link,
    status:       "published",
    published_at: new Date().toISOString(),
    updated_at:   new Date().toISOString(),
  }).eq("id", post_id);

  return NextResponse.json({
    wp_post_id:       wpData.id,
    wp_url:           wpData.link,
    wp_edit_url:      `${wpUrl}/wp-admin/post.php?post=${wpData.id}&action=edit`,
    featured_image:   featuredImageId ? "Generated and attached" : "Skipped (no OpenAI key or generation failed)",
    featured_media_id: featuredImageId,
  });
}
