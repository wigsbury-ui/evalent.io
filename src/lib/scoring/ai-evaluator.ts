/**
 * AI Writing Evaluation Engine — v3 (ASSESSOR TONE + RETRY)
 *
 * AUDIENCE: School admissions assessors only. Never shared with students or parents.
 * VOICE: Third person, professional, precise. Refer to student by name.
 * CURRICULUM: Adapt language register to programme type (IB, British, American).
 * RETRY: Up to 3 attempts with exponential backoff on 429/529 errors.
 */

import type { DomainType } from "@/types";

type WritingBand = "Excellent" | "Good" | "Developing" | "Emerging" | "Insufficient";

export interface WritingEvaluation {
  domain: DomainType;
  band: WritingBand;
  score: number;
  content_narrative: string;
  writing_narrative: string;
  threshold_comment: string;
}

export interface WritingTask {
  domain: DomainType;
  prompt_text: string;
  student_response: string;
  grade: number;
  locale: "en-GB" | "en-US";
  student_name?: string;
  programme?: string;
}

const CLAUDE_MODEL = "claude-sonnet-4-20250514";
const MAX_RETRIES = 2;
const RETRY_DELAYS = [1000, 3000]; // ms — keep short for Vercel serverless timeout

/**
 * Fetch with retry on transient errors (429 rate limit, 529 overloaded, 500 server error).
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  label: string
): Promise<Response> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(url, options);

    if (res.ok) return res;

    const status = res.status;
    const isRetryable = status === 429 || status === 529 || status === 500 || status === 502 || status === 503;

    if (isRetryable && attempt < MAX_RETRIES) {
      const delay = RETRY_DELAYS[attempt] || 10000;
      console.warn(
        `[AI_EVAL] ${label}: API ${status}, retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})...`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
      continue;
    }

    // Non-retryable or exhausted retries
    return res;
  }

  // Should not reach here, but TypeScript needs it
  throw new Error(`[AI_EVAL] ${label}: exhausted all retries`);
}

/**
 * Map programme codes to curriculum context for prompt calibration.
 */
function getCurriculumContext(programme?: string): string {
  const p = (programme || "").toUpperCase();
  if (p === "IB" || p.includes("IB"))
    return "an International Baccalaureate (IB) school. Use language consistent with IB pedagogy — learner profile attributes, approaches to learning, conceptual understanding, and inquiry-based expectations";
  if (p === "US" || p.includes("AMERICAN") || p.includes("US"))
    return "an American-curriculum school. Use language consistent with Common Core and US educational standards — grade-level benchmarks, ELA/Math standards, and college-readiness expectations";
  if (p === "UK" || p.includes("BRITISH") || p.includes("UK") || p.includes("IGCSE"))
    return "a British-curriculum school. Use language consistent with the English National Curriculum and Cambridge frameworks — key stage expectations, attainment targets, and GCSE/IGCSE readiness";
  return "an international school. Use professionally neutral educational language appropriate for a selective admissions context";
}

function getSystemPrompt(task: WritingTask): string {
  const lang = task.locale === "en-US" ? "American English" : "British English";
  const curriculum = getCurriculumContext(task.programme);
  const name = task.student_name || "the student";

  return `You are an experienced admissions assessor writing a professional evaluation of extended writing for a Grade ${task.grade} applicant to ${curriculum}.

AUDIENCE: This report is read ONLY by the school's admissions panel. It will NOT be shared with the student, their parents, or any external party. Write accordingly — be candid, precise, and professionally frank about both strengths and weaknesses.

VOICE AND STYLE:
- Write in ${lang} throughout.
- Refer to the student in the third person as "${name}" or "the student" — NEVER use "you" or "your".
- Maintain the tone of a senior examiner's commentary: warm but evaluative, supportive but honest.
- Avoid superlatives, exclamation marks, and overly encouraging language. This is a professional assessment, not feedback to a child.
- Ground observations in specific evidence from the writing sample.
- Calibrate expectations precisely to Grade ${task.grade} — what is age-appropriate, what falls below, what exceeds.

RUBRIC:
- Excellent (4): Exceeds grade-level expectations across content and writing quality.
- Good (3): Meets grade-level expectations with minor gaps.
- Developing (2): Partially meets expectations; shows emerging competence with clear areas for growth.
- Limited (1): Below grade-level expectations; significant support would be needed.
- Insufficient (0): No substantive response or response unrelated to the prompt.

Return ONLY valid JSON — no markdown, no commentary outside the JSON.`;
}

function getUserPrompt(task: WritingTask): string {
  const name = task.student_name || "the student";
  return `Evaluate this ${task.domain} extended writing from ${name}, a Grade ${task.grade} applicant.

Prompt given to the student:
"${task.prompt_text}"

Student's response:
"""
${task.student_response}
"""

Return JSON:
{
  "band": "Excellent|Good|Developing|Limited",
  "score": 0-4,
  "content_narrative": "2-3 sentences evaluating content quality — relevance to the prompt, depth of ideas, use of examples. Reference specific evidence from the response. Written for an assessor.",
  "writing_narrative": "2-3 sentences evaluating writing quality — sentence control, vocabulary, grammar, organisation. Note specific patterns observed. Written for an assessor.",
  "threshold_comment": "1 sentence on whether this response meets, exceeds, or falls below Grade ${task.grade} expectations for this domain."
}`;
}

export function generateReasoningNarrativePrompt(
  score_pct: number,
  threshold: number,
  grade: number,
  correct: number,
  total: number,
  locale: string,
  student_name?: string,
  programme?: string
): { system: string; user: string } {
  const lang = locale === "en-US" ? "American English" : "British English";
  const curriculum = getCurriculumContext(programme);
  const name = student_name || "The student";

  return {
    system: `You are a senior admissions assessor writing a reasoning score interpretation for a Grade ${grade} applicant to ${curriculum}. Write in ${lang}.

AUDIENCE: School admissions panel only — not shared with the student or parents.
VOICE: Third person, professional. Refer to the student as "${name}". Be evaluative, not encouraging. Ground the interpretation in what the score implies about reasoning readiness.
LENGTH: 3-4 sentences.`,

    user: `${name}, a Grade ${grade} applicant, scored ${correct}/${total} (${score_pct}%) on the reasoning section. The school's threshold for this domain is ${threshold}%.

Write a professional assessment interpreting this score. Address whether it meets the threshold, what it suggests about the student's logical reasoning and problem-solving readiness, and any implications for admissions. Return ONLY the narrative text — no JSON, no headers.`,
  };
}

export function generateMindsetNarrativePrompt(
  mindset_score: number,
  grade: number,
  locale: string,
  student_name?: string,
  programme?: string
): { system: string; user: string } {
  const lang = locale === "en-US" ? "American English" : "British English";
  const curriculum = getCurriculumContext(programme);
  const name = student_name || "The student";

  const descriptor =
    mindset_score >= 3.5
      ? "strong growth orientation"
      : mindset_score >= 2.5
        ? "developing growth mindset with some fixed-mindset tendencies"
        : mindset_score >= 1.5
          ? "limited growth orientation; may benefit from targeted support"
          : "significant fixed-mindset tendencies; structured coaching recommended";

  return {
    system: `You are a senior admissions assessor interpreting a mindset and learning readiness score for a Grade ${grade} applicant to ${curriculum}. Write in ${lang}.

AUDIENCE: School admissions panel only — not shared with the student or parents.
VOICE: Third person, professional. Refer to the student as "${name}". Draw on Carol Dweck's growth mindset framework but write as an assessor, not a coach. Be honest about what the score implies without being dismissive.
CONTEXT: The mindset lens is complementary — it does not determine admission. It signals where coaching, mentoring, or structured support around learning habits may be needed.
LENGTH: 3-4 sentences.`,

    user: `${name}, a Grade ${grade} applicant, received a mindset / readiness score of ${mindset_score} out of 4.0, which indicates ${descriptor}.

Write a professional assessment for the admissions panel. Interpret what this score suggests about the student's current approach to challenge, feedback, and persistence. Note any implications for pastoral or academic support if admitted. Return ONLY the narrative text — no JSON, no headers.`,
  };
}

export async function evaluateWriting(task: WritingTask): Promise<WritingEvaluation> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("[AI_EVAL] No ANTHROPIC_API_KEY");
    return fallback(task.domain, "No API key");
  }

  if (!task.student_response || task.student_response.trim().length < 10) {
    return {
      domain: task.domain,
      band: "Insufficient",
      score: 0,
      content_narrative: "No substantive response was provided for this task.",
      writing_narrative: "Unable to evaluate writing quality — the response was blank or insufficient for assessment.",
      threshold_comment: "Does not meet minimum requirements for Grade " + task.grade + " assessment.",
    };
  }

  try {
    console.log(`[AI_EVAL] Calling ${CLAUDE_MODEL} for ${task.domain}...`);
    const res = await fetchWithRetry(
      "https://api.anthropic.com/v1/messages",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: CLAUDE_MODEL,
          max_tokens: 1024,
          system: getSystemPrompt(task),
          messages: [{ role: "user", content: getUserPrompt(task) }],
        }),
      },
      `writing-${task.domain}`
    );

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[AI_EVAL] API ${res.status} (after retries): ${errText}`);
      return fallback(task.domain, `API ${res.status}`);
    }

    const data = await res.json();
    const text = data.content?.[0]?.text || "";
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned);

    return {
      domain: task.domain,
      band: normBand(parsed.band),
      score: Math.min(4, Math.max(0, Number(parsed.score) || 0)),
      content_narrative: parsed.content_narrative || "",
      writing_narrative: parsed.writing_narrative || "",
      threshold_comment: parsed.threshold_comment || "",
    };
  } catch (err) {
    console.error(`[AI_EVAL] Error for ${task.domain}:`, err);
    return fallback(task.domain, String(err));
  }
}

export async function generateNarrative(system: string, user: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return "Narrative unavailable — API key not configured.";

  try {
    const res = await fetchWithRetry(
      "https://api.anthropic.com/v1/messages",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: CLAUDE_MODEL,
          max_tokens: 512,
          system,
          messages: [{ role: "user", content: user }],
        }),
      },
      "narrative"
    );

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[AI_EVAL] Narrative API ${res.status} (after retries): ${errText}`);
      return "Narrative generation encountered an error.";
    }

    const data = await res.json();
    return data.content?.[0]?.text?.trim() || "";
  } catch (err) {
    console.error("[AI_EVAL] Narrative error:", err);
    return "Narrative generation encountered an error.";
  }
}

function normBand(raw: string): WritingBand {
  const m: Record<string, WritingBand> = {
    excellent: "Excellent",
    good: "Good",
    developing: "Developing",
    limited: "Emerging",
    emerging: "Emerging",
    insufficient: "Insufficient",
  };
  return m[(raw || "").trim().toLowerCase()] || "Developing";
}

function fallback(domain: DomainType, reason: string): WritingEvaluation {
  console.warn(`[AI_EVAL] Fallback for ${domain}: ${reason}`);
  return {
    domain,
    band: "Developing",
    score: 2,
    content_narrative: "AI evaluation encountered an error. Manual review by the admissions panel is recommended.",
    writing_narrative: "AI evaluation encountered an error. Manual review by the admissions panel is recommended.",
    threshold_comment: "Score requires manual verification by the admissions team.",
  };
}
