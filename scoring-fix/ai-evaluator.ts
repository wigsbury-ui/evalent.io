/**
 * AI Writing Evaluation Engine
 *
 * Uses the Anthropic Claude API to evaluate extended writing responses
 * across domains: English, Mathematics, Values, Creativity, Mindset.
 *
 * Each evaluation returns a band (Excellent/Good/Developing/Limited),
 * a score (0-4), and narrative commentary for the report.
 */

import type { WritingBand, DomainType } from "@/types";

// -------------------------------------------------------------------
// Types
// -------------------------------------------------------------------

export interface WritingEvaluation {
  domain: DomainType;
  band: WritingBand;
  score: number; // 0-4
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

// -------------------------------------------------------------------
// System prompts from the project brief (Section 7)
// -------------------------------------------------------------------

function getSystemPrompt(grade: number, locale: string): string {
  const langStyle =
    locale === "en-US" ? "fluent American English" : "fluent British English";

  return `You are an experienced educational assessor evaluating extended writing for a Grade ${grade} admissions assessment.

You evaluate both the content (relevance, depth, examples) and the quality of writing (organisation, sentence control, vocabulary, accuracy).

You are warm but precise. You never comment on handwriting, only typed responses. You do not use bullet points. You write in ${langStyle}.

Your evaluation must be calibrated to Grade ${grade} expectations. A Grade 3 student writing "good sentences with some detail" may earn Good, while the same quality from a Grade 10 student would be Developing.

Rubric bands:
- Excellent (4): Fully addresses task, clear structure, strong vocabulary, well-supported arguments, very few errors
- Good (3): Addresses task well, organised writing, good vocabulary, some supporting detail, minor errors
- Developing (2): Partially addresses task, some structure, basic vocabulary, limited detail, noticeable errors
- Limited (1): Minimal engagement with task, weak structure, limited vocabulary, significant errors
- No response (0): Blank or unintelligible

Return ONLY valid JSON with no additional text.`;
}

function getUserPrompt(task: WritingTask): string {
  return `Evaluate this ${task.domain} extended writing response from a student applying to Grade ${task.grade}.

Writing prompt given to the student:
"${task.prompt_text}"

Student's response:
"""
${task.student_response}
"""

Return JSON in this exact format:
{
  "band": "Excellent|Good|Developing|Limited",
  "score": 0-4,
  "content_narrative": "2-3 sentences evaluating the content: relevance to prompt, depth of ideas, use of examples, strength of argument.",
  "writing_narrative": "2-3 sentences evaluating writing quality: organisation, sentence control, vocabulary range, technical accuracy.",
  "threshold_comment": "1 sentence summarising whether this response meets, exceeds, or falls below the expected standard for this grade level."
}`;
}

// -------------------------------------------------------------------
// Reasoning narrative (MCQ-only domain)
// -------------------------------------------------------------------

export function generateReasoningNarrativePrompt(
  score_pct: number,
  threshold: number,
  grade: number,
  correct: number,
  total: number,
  locale: string
): { system: string; user: string } {
  const langStyle =
    locale === "en-US" ? "fluent American English" : "fluent British English";

  return {
    system: `You are an experienced educational assessor writing a brief narrative interpretation of a reasoning score for a Grade ${grade} admissions assessment. Write in ${langStyle}. Do not use bullet points. Be warm but precise. Frame everything as a snapshot, not a fixed judgement.`,
    user: `A Grade ${grade} student scored ${correct}/${total} (${score_pct}%) on the reasoning section. The school's threshold is ${threshold}%.

The reasoning section tests the student's ability to work with unfamiliar information, identify patterns, and solve multi-step problems. It uses multiple-choice questions only.

Write 3-4 sentences interpreting this score. Address:
1. Whether the score meets the threshold and what this suggests
2. What the score implies about the student's reasoning ability
3. A contextual note about what this means for their readiness

Return ONLY the narrative text, no JSON.`,
  };
}

// -------------------------------------------------------------------
// Mindset interpretation
// -------------------------------------------------------------------

export function generateMindsetNarrativePrompt(
  mindset_score: number,
  grade: number,
  locale: string
): { system: string; user: string } {
  const langStyle =
    locale === "en-US" ? "fluent American English" : "fluent British English";

  let band: string;
  if (mindset_score >= 3.5) band = "strong growth orientation";
  else if (mindset_score >= 2.5) band = "developing growth mindset";
  else if (mindset_score >= 1.5) band = "may need targeted support";
  else band = "significant coaching needed";

  return {
    system: `You are an experienced educational assessor interpreting a mindset score for a Grade ${grade} admissions assessment using Carol Dweck's growth mindset framework. Write in ${langStyle}. The narrative should be supportive, never labelling, and always framed as a snapshot rather than a fixed judgement. Do not use bullet points.`,
    user: `A Grade ${grade} student has a mindset/readiness score of ${mindset_score} out of 4.0, categorised as "${band}".

Score interpretation guide:
- 3.5-4.0: Strong growth orientation — student demonstrates resilience, effort-focus, and openness to challenge
- 2.5-3.4: Developing — shows some growth mindset traits but may be inconsistent
- 1.5-2.4: May need targeted support — student may benefit from coaching on resilience and learning strategies
- 0-1.4: Significant coaching needed — student may hold fixed beliefs about ability

Write 2-3 sentences interpreting this score. Be supportive and constructive. Frame as a snapshot of current approach to learning, not a permanent label.

Return ONLY the narrative text, no JSON.`,
  };
}

// -------------------------------------------------------------------
// Main evaluation function
// -------------------------------------------------------------------

// Use the latest available Sonnet model
const CLAUDE_MODEL = "claude-sonnet-4-20250514";

/**
 * Evaluate a single writing task using Claude API.
 */
export async function evaluateWriting(
  task: WritingTask
): Promise<WritingEvaluation> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    console.error("[AI_EVAL] ANTHROPIC_API_KEY not configured");
    return fallbackEvaluation(task.domain, "API key not configured");
  }

  // Handle empty/blank responses
  if (!task.student_response || task.student_response.trim().length < 10) {
    return {
      domain: task.domain,
      band: "Insufficient",
      score: 0,
      content_narrative:
        "No substantive response was provided for this writing task.",
      writing_narrative:
        "Unable to evaluate writing quality as the response was blank or insufficient.",
      threshold_comment:
        "This response does not meet the minimum requirements for evaluation.",
    };
  }

  const systemPrompt = getSystemPrompt(task.grade, task.locale);
  const userPrompt = getUserPrompt(task);

  try {
    console.log(`[AI_EVAL] Calling Claude API for ${task.domain} writing evaluation...`);

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[AI_EVAL] Claude API error ${response.status}: ${errorText}`);
      return fallbackEvaluation(task.domain, `API error ${response.status}`);
    }

    const data = await response.json();
    const responseText =
      data.content?.[0]?.text || data.content?.[0]?.value || "";

    console.log(`[AI_EVAL] Got response for ${task.domain}: ${responseText.substring(0, 100)}...`);

    // Parse JSON response — strip markdown fences if present
    const cleaned = responseText
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    const evaluation = JSON.parse(cleaned);

    // Validate and normalise
    const band = normaliseBand(evaluation.band);
    const score = Math.min(4, Math.max(0, Number(evaluation.score) || 0));

    return {
      domain: task.domain,
      band,
      score,
      content_narrative: evaluation.content_narrative || "",
      writing_narrative: evaluation.writing_narrative || "",
      threshold_comment: evaluation.threshold_comment || "",
    };
  } catch (error) {
    console.error(
      `[AI_EVAL] Error evaluating ${task.domain} writing:`,
      error instanceof Error ? error.message : error
    );

    return fallbackEvaluation(task.domain, String(error));
  }
}

/**
 * Generate a narrative using Claude API (for reasoning/mindset).
 */
export async function generateNarrative(
  system: string,
  user: string
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return "Narrative generation unavailable — API key not configured.";
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
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

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[AI_EVAL] Narrative API error ${response.status}: ${errorText}`);
      return "Narrative generation encountered an error. Manual review recommended.";
    }

    const data = await response.json();
    return data.content?.[0]?.text?.trim() || "";
  } catch (error) {
    console.error("[AI_EVAL] Error generating narrative:", error);
    return "Narrative generation encountered an error. Manual review recommended.";
  }
}

// -------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------

function normaliseBand(raw: string): WritingBand {
  const normalised = (raw || "").trim().toLowerCase();
  const bandMap: Record<string, WritingBand> = {
    excellent: "Excellent",
    good: "Good",
    developing: "Developing",
    limited: "Emerging",
    emerging: "Emerging",
    "no response": "Insufficient",
    insufficient: "Insufficient",
    none: "Insufficient",
  };
  return bandMap[normalised] || "Developing";
}

function fallbackEvaluation(domain: DomainType, reason: string): WritingEvaluation {
  console.warn(`[AI_EVAL] Using fallback evaluation for ${domain}: ${reason}`);
  return {
    domain,
    band: "Developing",
    score: 2,
    content_narrative:
      "AI evaluation encountered an error. Manual review recommended.",
    writing_narrative:
      "AI evaluation encountered an error. Manual review recommended.",
    threshold_comment: "Score requires manual verification.",
  };
}
