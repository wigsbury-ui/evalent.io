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
Key differentiators:
- Criterion-referenced against each school's own thresholds (not national norms)
- AI-evaluated writing tasks with narrative feedback
- Reports generated within minutes
- Supports IB, British and American curricula
- School-branded professional reports
- Covers the whole child: academic + mindset + values + creativity
Pricing: Essentials ($2,900/yr, 100 assessments), Professional ($5,500/yr, 250), Enterprise ($9,500/yr, 500+)
Audience: Admissions Directors, Deputy Heads, Heads of School at international schools globally.
Tone: Confident, warm, expert. Never salesy. Speaks the language of international education.
`;

export async function POST(req: NextRequest) {
  const session = await guard();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { type, topic, tone, angle, liveData } = await req.json();

  const supabase = createServerClient();

  // Fetch live platform data for context
  const [schoolsRes, submissionsRes] = await Promise.all([
    supabase.from("schools").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("submissions").select("id", { count: "exact", head: true }),
  ]);
  const schoolCount = schoolsRes.count || 0;
  const assessmentCount = submissionsRes.count || 0;

  const liveContext = schoolCount > 0
    ? `\nLive platform data: ${schoolCount} active schools, ${assessmentCount} total assessments run.`
    : "";

  const prompts: Record<string, string> = {
    linkedin: `You are writing LinkedIn posts for Evalent, an AI-powered admissions platform for international schools.
${EVALENT_CONTEXT}${liveContext}

Write 3 distinct LinkedIn posts about: "${topic}"
Angle/tone: ${tone || "thought leadership"}
${angle ? `Additional angle: ${angle}` : ""}

Each post should:
- Be 150-250 words
- Start with a hook (not "I" or "We")
- Include 3-5 relevant hashtags at the end
- Sound like a knowledgeable founder/expert, not a marketer
- Reference real challenges admissions teams face
- No emojis except sparingly for emphasis

Format as JSON array: [{"title": "short title for internal reference", "body": "full post text"}]
Return ONLY the JSON array, no other text.`,

    blog: `You are writing blog posts for Evalent, an AI-powered admissions platform for international schools.
${EVALENT_CONTEXT}${liveContext}

Generate 3 distinct blog post outlines about: "${topic}"
Angle/tone: ${tone || "educational/thought leadership"}
${angle ? `Additional angle: ${angle}` : ""}

Each outline should include:
- A compelling SEO-friendly title
- An excerpt (2-3 sentences, for meta description)
- A full body (600-900 words) written in a professional, authoritative tone
- Real insights for admissions professionals
- Subtle Evalent mentions where natural (not forced)

Format as JSON array: [{"title": "blog title", "excerpt": "short excerpt", "body": "full blog post in HTML paragraphs using <p>, <h2>, <h3>, <ul>, <li> tags only"}]
Return ONLY the JSON array, no other text.`,

    partner: `You are creating social media post ideas for Evalent's referral partners — consultants and agents who introduce Evalent to international schools.
${EVALENT_CONTEXT}${liveContext}

Create 3 post ideas partners can use on LinkedIn or WhatsApp about: "${topic}"
${angle ? `Angle: ${angle}` : ""}

Each post should:
- Be 100-180 words
- Sound like a genuine recommendation from someone who knows the product
- Include their personal referral link placeholder: [YOUR_EVALENT_LINK]
- Be practical and credible — partners are education professionals
- Include 3-4 hashtags

Format as JSON array: [{"title": "short internal title", "body": "full post text"}]
Return ONLY the JSON array, no other text.`,

    whatsapp: `You are writing WhatsApp messages for Evalent to send to school contacts.
${EVALENT_CONTEXT}${liveContext}

Write 3 WhatsApp message variations about: "${topic}"
${angle ? `Angle: ${angle}` : ""}

Each message should:
- Be 80-120 words maximum
- Sound personal and direct, not broadcast/spam
- Have a clear, low-pressure call to action
- Be appropriate for a professional WhatsApp conversation

Format as JSON array: [{"title": "short internal title", "body": "message text"}]
Return ONLY the JSON array, no other text.`,
  };

  const prompt = prompts[type] || prompts.linkedin;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 3000,
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
