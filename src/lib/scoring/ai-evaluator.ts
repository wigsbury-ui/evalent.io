/**
 * AI Writing Evaluation Engine — v4 (DOMAIN-SPECIFIC RUBRICS)
 *
 * AUDIENCE: School admissions assessors only. Never shared with students or parents.
 * VOICE: Third person, professional, precise. Refer to student by name.
 * CURRICULUM: Adapt language register to programme type (IB, British, American).
 * RETRY: Up to 3 attempts with exponential backoff on 429/529 errors.
 * 
 * v4 CHANGE: Domain-specific evaluation criteria — mathematics writing is assessed
 * on mathematical thinking/reasoning, NOT on English prose quality.
 */

import type { DomainType } from "@/types";
import { gradeLabel } from "@/lib/utils/grade-label";

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

/**
 * Get domain-specific rubric criteria.
 * This is the KEY FIX — mathematics writing should be assessed on mathematical
 * thinking, not on English prose quality.
 */
function getDomainRubric(domain: DomainType): string {
    const domainLower = (domain || "").toLowerCase();

    if (domainLower.includes("math")) {
        return `DOMAIN-SPECIFIC EVALUATION FOCUS — MATHEMATICS:
This is a MATHEMATICS extended response. Your evaluation must focus primarily on MATHEMATICAL content, not English prose quality.

Evaluate based on:
1. MATHEMATICAL REASONING: Does the student demonstrate understanding of the mathematical concepts involved? Do they show logical thinking about the problem or topic?
2. MATHEMATICAL VOCABULARY: Does the student use appropriate mathematical terms and language for their grade level?
3. CONCEPTUAL UNDERSTANDING: Does the student show they understand WHY, not just WHAT? Do they connect ideas to broader mathematical principles?
4. PROBLEM-SOLVING AWARENESS: Does the student describe strategies, methods, or approaches to mathematical challenges?
5. DEPTH OF MATHEMATICAL THINKING: Does the response go beyond surface-level description to show genuine engagement with mathematical ideas?

Writing quality (grammar, spelling, sentence structure) should be noted only briefly and should NOT significantly affect the band score. A student who demonstrates strong mathematical thinking in simple sentences should score higher than a student who writes eloquently but shows weak mathematical understanding.

RUBRIC (Mathematics focus):
- Excellent (4): Demonstrates strong mathematical understanding with clear reasoning, appropriate use of mathematical vocabulary, and depth of thinking that exceeds grade-level expectations.
- Good (3): Shows solid mathematical understanding with some reasoning and appropriate vocabulary. Meets grade-level expectations with minor gaps in depth or precision.
- Developing (2): Shows emerging mathematical understanding but reasoning is partial or unclear. Mathematical vocabulary is basic or sometimes imprecise.
- Emerging (1): Limited mathematical understanding demonstrated. Response is superficial, lacks mathematical reasoning, or shows misconceptions.
- Insufficient (0): No substantive mathematical content or response unrelated to the prompt.`;
    }

    if (domainLower.includes("english") || domainLower.includes("language")) {
        return `DOMAIN-SPECIFIC EVALUATION FOCUS — ENGLISH:
This is an ENGLISH extended response. Evaluate based on both content quality and writing craft.

Evaluate based on:
1. CONTENT & IDEAS: Relevance to prompt, depth of thought, use of examples or supporting detail.
2. ORGANISATION: Logical structure, coherent flow of ideas, appropriate paragraphing for grade level.
3. SENTENCE CONTROL: Variety and accuracy of sentence structures appropriate to grade level.
4. VOCABULARY: Range, precision, and appropriateness of word choices.
5. TECHNICAL ACCURACY: Spelling, punctuation, and grammar relative to grade-level expectations.

RUBRIC (English focus):
- Excellent (4): Exceeds grade-level expectations across content and writing quality. Ideas are well-developed with strong vocabulary and sentence control.
- Good (3): Meets grade-level expectations with minor gaps. Content is relevant and writing is competent with some areas for development.
- Developing (2): Partially meets expectations. Shows emerging competence but with clear areas for growth in content development or writing accuracy.
- Emerging (1): Below grade-level expectations. Limited content development and/or significant weaknesses in writing control.
- Insufficient (0): No substantive response or response unrelated to the prompt.`;
    }

    // Creativity, Values, or other domains
    return `DOMAIN-SPECIFIC EVALUATION FOCUS — ${domain.toUpperCase()}:
Evaluate the response in the context of the ${domain} domain. Focus on the quality and depth of thinking demonstrated, relevance to the prompt, and evidence of genuine engagement with the topic.

RUBRIC:
- Excellent (4): Exceeds grade-level expectations in both content quality and expression.
- Good (3): Meets grade-level expectations with minor gaps.
- Developing (2): Partially meets expectations; shows emerging competence with clear areas for growth.
- Emerging (1): Below grade-level expectations; significant support would be needed.
- Insufficient (0): No substantive response or response unrelated to the prompt.`;
}

function getSystemPrompt(task: WritingTask): string {
    const lang = task.locale === "en-US" ? "American English" : "British English";
    const curriculum = getCurriculumContext(task.programme);
    const name = task.student_name || "the student";
    const domainRubric = getDomainRubric(task.domain);

    return `You are an experienced admissions assessor writing a professional evaluation of extended writing for a ${gradeLabel(task.grade, task.programme)} applicant to ${curriculum}.

AUDIENCE: This report is read ONLY by the school's admissions panel. It will NOT be shared with the student, their parents, or any external party. Write accordingly — be candid, precise, and professionally informative.

VOICE AND STYLE:
- Write in ${lang} throughout.
- Refer to the student in the third person as "${name}" or "the student" — NEVER use "you" or "your".
- Maintain the tone of a senior examiner's commentary: warm but evaluative, supportive but honest.
- Avoid superlatives, exclamation marks, and overly encouraging language. This is a professional assessment, not feedback to a child.
- Ground observations in specific evidence from the writing sample.
- Calibrate expectations precisely to ${gradeLabel(task.grade, task.programme)} — what is age-appropriate, what falls below, what exceeds.

${domainRubric}

Return ONLY valid JSON — no markdown, no commentary outside the JSON.`;
}

function getUserPrompt(task: WritingTask): string {
    const name = task.student_name || "the student";
    return `Evaluate this ${task.domain} extended writing from ${name}, a ${gradeLabel(task.grade, task.programme)} applicant.

PROMPT GIVEN TO STUDENT:
${task.prompt_text}

STUDENT'S RESPONSE:
${task.student_response}

Return a JSON object with exactly these fields:
{
  "band": "Excellent" | "Good" | "Developing" | "Emerging" | "Insufficient",
  "score": <number 0-4>,
  "content_narrative": "<2-3 sentences on content quality, ideas, and depth — focusing on ${task.domain}-specific thinking>",
  "writing_narrative": "<2-3 sentences on expression quality — for mathematics, keep this brief and secondary to content>",
  "threshold_comment": "<1 sentence: whether this meets/exceeds/falls below ${gradeLabel(task.grade, task.programme)} expectations for ${task.domain}>"
}`;
}

function normBand(raw: string): WritingBand {
    const s = (raw || "").toLowerCase().trim();
    if (s.includes("excellent")) return "Excellent";
    if (s.includes("good")) return "Good";
    if (s.includes("develop")) return "Developing";
    if (s.includes("emerg") || s.includes("limited")) return "Emerging";
    return "Insufficient";
}

function fallback(domain: DomainType, reason: string): WritingEvaluation {
    return {
        domain,
        band: "Developing",
        score: 2,
        content_narrative: "Unable to fully evaluate — " + reason + ". A partial assessment suggests developing competence.",
        writing_narrative: "Writing quality could not be fully assessed due to evaluation limitations.",
        threshold_comment: "Provisional rating assigned; manual review recommended.",
    };
}

async function fetchWithRetry(
    url: string,
    options: RequestInit,
    label: string
): Promise<Response> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
            const res = await fetch(url, options);

            if (res.status === 429 || res.status === 529) {
                const wait = RETRY_DELAYS[attempt] || 3000;
                console.warn(
                    `[AI_EVAL] ${label} — ${res.status}, retry ${attempt + 1}/${MAX_RETRIES} in ${wait}ms`
                );
                await new Promise((r) => setTimeout(r, wait));
                continue;
            }

            return res;
        } catch (err) {
            lastError = err instanceof Error ? err : new Error(String(err));
            if (attempt < MAX_RETRIES) {
                const wait = RETRY_DELAYS[attempt] || 3000;
                console.warn(
                    `[AI_EVAL] ${label} — network error, retry ${attempt + 1}/${MAX_RETRIES} in ${wait}ms`
                );
                await new Promise((r) => setTimeout(r, wait));
            }
        }
    }

    if (lastError) throw lastError;

    // Should not reach here, but TypeScript needs it
    throw new Error(`[AI_EVAL] ${label}: exhausted all retries`);
}

export async function evaluateWriting(
    task: WritingTask,
    apiKey?: string
): Promise<WritingEvaluation> {
    const key = apiKey || process.env.ANTHROPIC_API_KEY || "";
    if (!key) {
        console.error("[AI_EVAL] No API key available");
        return fallback(task.domain, "no API key configured");
    }
    if (!task.student_response || task.student_response.trim().length < 10) {
        return {
            domain: task.domain,
            band: "Insufficient",
            score: 0,
            content_narrative: "No substantive response was provided for this task.",
            writing_narrative:
                "Unable to evaluate writing quality — the response was blank or insufficient for assessment.",
            threshold_comment:
                "Does not meet minimum requirements for " +
                gradeLabel(task.grade, task.programme) +
                " assessment.",
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
                    "x-api-key": key,
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
        console.error("[AI_EVAL] Error:", err);
        return fallback(task.domain, String(err));
    }
}
