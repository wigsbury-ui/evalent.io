/**
 * AI Writing Evaluation Engine
 * Uses Claude API to evaluate extended writing responses.
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
}

// Use a known-good model string
const CLAUDE_MODEL = "claude-3-5-sonnet-20241022";

function getSystemPrompt(grade: number, locale: string): string {
  const lang = locale === "en-US" ? "fluent American English" : "fluent British English";
  return `You are an experienced educational assessor evaluating extended writing for a Grade ${grade} admissions assessment. You evaluate both content and writing quality. You are warm but precise. Write in ${lang}. Calibrate to Grade ${grade} expectations.

Rubric: Excellent (4), Good (3), Developing (2), Limited (1), No response (0).
Return ONLY valid JSON.`;
}

function getUserPrompt(task: WritingTask): string {
  return `Evaluate this ${task.domain} extended writing from a Grade ${task.grade} applicant.

Prompt: "${task.prompt_text}"

Response:
"""
${task.student_response}
"""

Return JSON:
{
  "band": "Excellent|Good|Developing|Limited",
  "score": 0-4,
  "content_narrative": "2-3 sentences on content quality.",
  "writing_narrative": "2-3 sentences on writing quality.",
  "threshold_comment": "1 sentence on grade-level expectations."
}`;
}

export function generateReasoningNarrativePrompt(
  score_pct: number, threshold: number, grade: number,
  correct: number, total: number, locale: string
): { system: string; user: string } {
  const lang = locale === "en-US" ? "American English" : "British English";
  return {
    system: `You are an educational assessor writing a reasoning score interpretation for Grade ${grade}. Write in ${lang}. Be warm but precise. 3-4 sentences.`,
    user: `A Grade ${grade} student scored ${correct}/${total} (${score_pct}%) on reasoning. Threshold is ${threshold}%. Interpret this score addressing whether it meets the threshold, what it implies about reasoning ability, and readiness. Return ONLY the narrative text.`,
  };
}

export function generateMindsetNarrativePrompt(
  mindset_score: number, grade: number, locale: string
): { system: string; user: string } {
  const lang = locale === "en-US" ? "American English" : "British English";
  const band = mindset_score >= 3.5 ? "strong growth orientation" :
    mindset_score >= 2.5 ? "developing growth mindset" :
    mindset_score >= 1.5 ? "may need targeted support" : "significant coaching needed";
  return {
    system: `You are an educational assessor interpreting a mindset score for Grade ${grade} using Carol Dweck's framework. Write in ${lang}. Supportive, never labelling. 2-3 sentences.`,
    user: `A Grade ${grade} student has mindset score ${mindset_score}/4.0 ("${band}"). Interpret supportively. Return ONLY the narrative text.`,
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
      domain: task.domain, band: "Insufficient", score: 0,
      content_narrative: "No substantive response provided.",
      writing_narrative: "Unable to evaluate — response was blank or insufficient.",
      threshold_comment: "Does not meet minimum requirements.",
    };
  }

  try {
    console.log(`[AI_EVAL] Calling ${CLAUDE_MODEL} for ${task.domain}...`);
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 1024,
        system: getSystemPrompt(task.grade, task.locale),
        messages: [{ role: "user", content: getUserPrompt(task) }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[AI_EVAL] API ${res.status}: ${errText}`);
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
    const res = await fetch("https://api.anthropic.com/v1/messages", {
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
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[AI_EVAL] Narrative API ${res.status}: ${errText}`);
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
    excellent: "Excellent", good: "Good", developing: "Developing",
    limited: "Emerging", emerging: "Emerging", insufficient: "Insufficient",
  };
  return m[(raw || "").trim().toLowerCase()] || "Developing";
}

function fallback(domain: DomainType, reason: string): WritingEvaluation {
  console.warn(`[AI_EVAL] Fallback for ${domain}: ${reason}`);
  return {
    domain, band: "Developing", score: 2,
    content_narrative: "AI evaluation encountered an error. Manual review recommended.",
    writing_narrative: "AI evaluation encountered an error. Manual review recommended.",
    threshold_comment: "Score requires manual verification.",
  };
}
