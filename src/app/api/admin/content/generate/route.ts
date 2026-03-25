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
Evalent is an AI-powered admissions assessment platform for independent and international schools (Grades/Years 3-10).
It covers English, Mathematics, Reasoning, Writing, Mindset and Values.
Schools use Evalent to assess applicants objectively, generate instant PDF reports, and make better admissions decisions.
Key differentiators: criterion-referenced scoring, AI-evaluated writing, reports in minutes, supports IB/British/American/Australian/NZ curricula.
Pricing: Essentials ($2,900/yr, 100 assessments), Professional ($5,500/yr, 250), Enterprise ($9,500/yr, 500+).
Audience: Admissions Directors, Registrars, Deputy Heads, Heads of School at independent and international schools globally.
Tone: Confident, warm, expert. Never salesy. Speaks the language of independent education.
`;

export async function POST(req: NextRequest) {
  const session = await guard();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { type, topic, tone, angle, duration, platform, curriculum, schoolType: reqSchoolType } = await req.json();

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
  const CURRICULUM_LABELS: Record<string, string> = {
    IB:          "International Baccalaureate (IB) — use MYP/PYP terminology, G3-G10 grade labels",
    British:     "British / English National Curriculum — use Year 3-11 labels, NC terminology",
    American:    "American / Common Core — use Grade 3-10 labels, US education terminology",
    IGCSE:       "Cambridge IGCSE pathway — use Year 7-11 labels, Cambridge/IGCSE terminology",
    Australian:  "Australian Curriculum (ACARA) — use Year 3-10 labels, ACARA terminology",
    NewZealand:  "New Zealand Curriculum (NZC) — use Year 3-10 labels, NZC terminology",
    Other:       "international schools with mixed or other curricula",
  };
  const curriculumContext = (curriculum && curriculum !== "all" && CURRICULUM_LABELS[curriculum])
    ? "Target curriculum: " + CURRICULUM_LABELS[curriculum] + ". Tailor all language, examples, grade references and terminology specifically for this curriculum. Avoid references to other curricula."
    : "Target audience: independent and international schools across IB, British, American, Australian and other curricula. Use inclusive language that resonates broadly.";

  const SCHOOL_TYPE_LABELS: Record<string, string> = {
    "uk-independent":        "UK independent schools — use British independent school terminology (Prep school, Senior school, Head, Registrar, Year groups, CE, 11-plus, 13-plus). Reference ISC, HMC, IAPS, GSA where relevant. Do NOT say 'international school'. Audience is British Heads and Registrars.",
    "us-private":            "US private/independent schools — use American private school terminology (Lower School, Middle School, Upper School, Head of School, Director of Admissions, grades). Reference NAIS, SSAT, ISEE, ERB where relevant. Do NOT say 'international school'. Audience is US admissions directors.",
    "australian-independent":"Australian independent schools — use Australian school terminology (Primary School, Secondary School, Principal, Registrar, Year groups). Reference AISNSW, AIS, NAPLAN limitations where relevant. Do NOT say 'international school'. Audience is Australian principals and registrars.",
    "nz-independent":        "New Zealand independent and integrated schools — use NZ school terminology (Year groups, Principal, Registrar, Board of Trustees). Reference NZC, ERO where relevant. Do NOT say 'international school'. Audience is NZ school leaders.",
    "international":         "international schools globally — use international school terminology. May reference IB, British, American curricula, expatriate families, EAL students. Audience is international school admissions directors and heads.",
  };
  const schoolTypeContext = (reqSchoolType && reqSchoolType !== "international" && SCHOOL_TYPE_LABELS[reqSchoolType])
    ? "\nIMPORTANT school type: " + SCHOOL_TYPE_LABELS[reqSchoolType]
    : "";
  const targetPlatform = platform || "linkedin";

  const prompts: Record<string, string> = {
    linkedin: `You are writing LinkedIn posts for Evalent.
${EVALENT_CONTEXT}${liveContext}${curriculumContext}${schoolTypeContext}
Write 3 distinct LinkedIn posts about: "${topic}"
Tone: ${tone || "thought leadership"}
${angle ? `Angle: ${angle}` : ""}
Each post: 150-250 words, strong hook, 3-5 hashtags, no emojis except sparingly.
Format as JSON array: [{"title": "internal title", "body": "full post"}]
Return ONLY the JSON array.`,

    blog: `You are writing blog posts for Evalent.
${EVALENT_CONTEXT}${liveContext}${curriculumContext}${schoolTypeContext}
Write 3 blog post outlines about: "${topic}"
Tone: ${tone || "educational"}
${angle ? `Angle: ${angle}` : ""}
Each: compelling SEO title, excerpt (2-3 sentences), full body (600-900 words) in HTML using only <p><h2><h3><ul><li> tags.
Format as JSON array: [{"title": "title", "excerpt": "excerpt", "body": "html body"}]
Return ONLY the JSON array.`,

    partner: `You are creating post ideas for Evalent's referral partners.
${EVALENT_CONTEXT}${liveContext}${curriculumContext}${schoolTypeContext}
Create 3 post ideas for: "${topic}"
${angle ? `Angle: ${angle}` : ""}
Each: 100-180 words, genuine recommendation tone, include [YOUR_EVALENT_LINK], 3-4 hashtags.
Format as JSON array: [{"title": "internal title", "body": "full post"}]
Return ONLY the JSON array.`,

    whatsapp: `You are writing WhatsApp messages for Evalent.
${EVALENT_CONTEXT}${liveContext}${curriculumContext}${schoolTypeContext}
Write 3 WhatsApp messages about: "${topic}"
${angle ? `Angle: ${angle}` : ""}
Each: 80-120 words, personal and direct, clear low-pressure CTA.
Format as JSON array: [{"title": "internal title", "body": "message text"}]
Return ONLY the JSON array.`,

    video_script: `You are writing optimised video scripts for Evalent to use with an AI avatar (HeyGen).
${EVALENT_CONTEXT}${liveContext}${curriculumContext}${schoolTypeContext}

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
- End with a clear, single CTA that drives the viewer to start a free trial:
      * Always mention the 10 free assessments with no credit card required
      * Always reference app.evalent.io as the destination
      * Make it feel earned and natural — the CTA should be the logical next step after the script's argument
      * Example endings: "Start your 10 free assessments today at app.evalent.io — no credit card needed."
        or "See it for yourself. Ten free assessments, instant reports, no commitment. app.evalent.io"
        or "Your first 10 assessments are free. Visit app.evalent.io and start today."

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
    headers: { "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY as string, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8000,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const data = await response.json();
  console.log("[GENERATE] HTTP status:", response.status);
  console.log("[GENERATE] stop reason:", data.stop_reason);
  console.log("[GENERATE] content length:", data.content?.[0]?.text?.length);
  console.log("[GENERATE] first 200 chars:", data.content?.[0]?.text?.slice(0,200));
  const text = data.content?.[0]?.text || "[]";

  try {
    const clean = text.replace(/```json|```/g, "").trim();
    const posts = JSON.parse(clean);
    return NextResponse.json({ posts });
  } catch {
    return NextResponse.json({ posts: [], error: "parse_failed", raw: text.slice(0, 500) });
  }
}
