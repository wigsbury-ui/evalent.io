import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";

async function guard() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "super_admin") return null;
  return session;
}

const EVALENT_CONTEXT = `
Evalent is an AI-powered admissions assessment platform for international schools (Grades 3-10).
It covers English, Mathematics, Reasoning, Writing, Mindset and Values.
Schools use Evalent to assess applicants objectively, generate instant PDF reports, and make better admissions decisions.
Key differentiators: criterion-referenced scoring, AI-evaluated writing, reports in minutes, IB/British/American curricula.
Pricing: Essentials ($2,900/yr, 100 assessments), Professional ($5,500/yr, 250), Enterprise ($9,500/yr, 500+).
Audience: Admissions Directors, Deputy Heads, Heads of School at international schools globally.
Tone: Confident, warm, expert. Never salesy. Speaks the language of international education.
`;

export async function POST(req: NextRequest) {
  const session = await guard();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { type, topic, tone, angle, duration, platform } = await req.json();

  const supabase = createServerClient();
  const [schoolsRes, submissionsRes] = await Promise.all([
    supabase.from("schools").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("submissions").select("id", { count: "exact", head: true }),
  ]);
  const schoolCount = schoolsRes.count || 0;
  const assessmentCount = submissionsRes.count || 0;
  const liveContext = schoolCount > 0
    ? `\nLive platform data: ${schoolCount} active schools, ${assessmentCount} total assessments run.`
    : "";

  const videoDuration = duration || 90;
  const targetPlatform = platform || "linkedin";

  const prompts: Record<string, string> = {
    linkedin: `You are writing LinkedIn posts for Evalent.
${EVALENT_CONTEXT}${liveContext}
Write 3 distinct LinkedIn posts about: "${topic}"
Tone: ${tone || "thought leadership"}
${angle ? `Angle: ${angle}` : ""}
Each post: 150-250 words, strong hook, 3-5 hashtags, no emojis except sparingly.
Format as JSON array: [{"title": "internal title", "body": "full post"}]
Return ONLY the JSON array.`,

    blog: `You are writing blog posts for Evalent.
${EVALENT_CONTEXT}${liveContext}
Write 3 blog post outlines about: "${topic}"
Tone: ${tone || "educational"}
${angle ? `Angle: ${angle}` : ""}
Each: compelling SEO title, excerpt (2-3 sentences), full body (600-900 words) in HTML using only <p><h2><h3><ul><li> tags.
Format as JSON array: [{"title": "title", "excerpt": "excerpt", "body": "html body"}]
Return ONLY the JSON array.`,

    partner: `You are creating post ideas for Evalent's referral partners.
${EVALENT_CONTEXT}${liveContext}
Create 3 post ideas for: "${topic}"
${angle ? `Angle: ${angle}` : ""}
Each: 100-180 words, genuine recommendation tone, include [YOUR_EVALENT_LINK], 3-4 hashtags.
Format as JSON array: [{"title": "internal title", "body": "full post"}]
Return ONLY the JSON array.`,

    whatsapp: `You are writing WhatsApp messages for Evalent.
${EVALENT_CONTEXT}${liveContext}
Write 3 WhatsApp messages about: "${topic}"
${angle ? `Angle: ${angle}` : ""}
Each: 80-120 words, personal and direct, clear low-pressure CTA.
Format as JSON array: [{"title": "internal title", "body": "message text"}]
Return ONLY the JSON array.`,

    video_script: `You are writing optimised video scripts for Evalent to use with an AI avatar (HeyGen).
${EVALENT_CONTEXT}${liveContext}

Write a video script about: "${topic}"
Target platform: ${targetPlatform}
Target duration: ${videoDuration} seconds
Tone: ${tone || "confident and warm"}
${angle ? `Angle: ${angle}` : ""}

The script must be:
- EXACTLY optimised for ${videoDuration} seconds when read at a natural pace (~140 words per minute for ${targetPlatform === "linkedin" ? "LinkedIn" : "general"} video)
- Structured: Hook (first 5-10 seconds) → Problem → Solution/Value → Proof → CTA
- Hook must NOT start with "I", "We", or "Hi" — use a pattern interrupt or bold statement
- Natural spoken language — no jargon, no bullet points in the speech
- Include [PAUSE] markers where the speaker should pause for emphasis
- Mark key phrases with [EMPHASIS] for the avatar to stress
- End with a clear, single CTA

Also generate:
- SEO-optimised title (for YouTube/Vimeo — include primary keyword)
- 5 target keywords for this video
- YouTube description (150-200 words with keywords naturally placed)
- 5-7 hashtags
- Chapter markers if over 60 seconds (format: 0:00 - Intro, 0:15 - Problem, etc.)
- Suggested thumbnail text (bold text overlay, max 6 words)

Generate 2 script variations with different hooks/angles.

Format as JSON array:
[{
  "title": "SEO-optimised video title",
  "body": "the full spoken script with [PAUSE] and [EMPHASIS] markers",
  "excerpt": "YouTube/Vimeo description",
  "target_keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "metadata": {
    "duration_seconds": ${videoDuration},
    "word_count": 0,
    "chapters": ["0:00 - Intro", "0:20 - Main point"],
    "thumbnail_text": "Bold text for thumbnail",
    "hashtags": ["#tag1", "#tag2"]
  }
}]
Return ONLY the JSON array.`,
  };

  const prompt = prompts[type] || prompts.linkedin;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.ANTHROPIC_API_KEY}`, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const data = await response.json();
  const text = data.content?.[0]?.text || "[]";

  try {
    const clean = text.replace(/```json|```/g, "").trim();
    const posts = JSON.parse(clean);
    return NextResponse.json({ posts });
  } catch {
    return NextResponse.json({ error: "Failed to parse AI response", raw: text }, { status: 500 });
  }
}
