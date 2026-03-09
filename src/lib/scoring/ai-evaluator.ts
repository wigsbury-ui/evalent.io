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
        return `an International Baccalaureate (IB) school. Frame your narrative using IB pedagogy and terminology throughout.

GRADE CONTEXT: Grades 3–5 applicants are entering the Primary Years Programme (PYP). Grades 6–10 applicants are entering the Middle Years Programme (MYP).

PYP LANGUAGE (Grades 3–5): Reference transdisciplinary skills, the PYP Learner Profile, and the five essential elements (knowledge, concepts, skills, attitudes, action). Use terms such as "approaches to learning", "Units of Inquiry", "inquirer", "communicator", "self-manager", "collaborative", "reflective". Frame readiness in terms of the student's capacity to engage with open-ended, concept-driven learning. Avoid references to SATs, Key Stages, or national curriculum levels.

MYP LANGUAGE (Grades 6–10): Reference the MYP Approaches to Learning (ATL) skill clusters — thinking, communication, social, self-management, and research skills. Use terms such as "criterion-referenced", "interdisciplinary thinking", "conceptual understanding", "global contexts", "Learner Profile attributes". Frame readiness in terms of the student's capacity for independent inquiry, structured academic challenge, and reflective practice. Avoid references to GCSEs unless directly relevant.

IB LEARNER PROFILE ATTRIBUTES (use where genuinely relevant): Inquirer, Knowledgeable, Thinker, Communicator, Principled, Open-minded, Caring, Risk-taker, Balanced, Reflective.

TONE: IB narratives are holistic, growth-oriented, and asset-focused. Frame gaps as areas for development within a supportive learning community. Avoid deficit-focused or clinical language.\``;
    if (p === "US" || p.includes("AMERICAN") || p.includes("US"))
        return `an American-curriculum school. Frame your narrative using US educational terminology and expectations throughout.

GRADE CONTEXT: Grades 3–5 are upper elementary. Grades 6–8 are middle school. Grades 9–10 are high school (freshman/sophomore).

ELEMENTARY LANGUAGE (Grades 3–5): Reference Common Core State Standards (CCSS) expectations, grade-level benchmarks, and foundational literacy and numeracy skills. Use terms such as "close reading", "text-based evidence", "mathematical reasoning", "number sense", "fluency". Frame readiness in terms of transition to upper elementary demands — increased text complexity, multi-step problem solving, and independent writing.

MIDDLE SCHOOL LANGUAGE (Grades 6–8): Reference disciplinary literacy, argumentative writing, and pre-algebra through algebra readiness. Use terms such as "analytical thinking", "evidence-based writing", "abstract reasoning", "academic vocabulary". Frame readiness in terms of the shift to subject-specific instruction and independent study habits.

HIGH SCHOOL LANGUAGE (Grades 9–10): Reference college-preparatory expectations, AP/honors readiness where relevant, and academic independence. Use terms such as "critical thinking", "research skills", "academic rigour", "college-readiness".

TONE: US admissions narratives are direct, evidence-based, and constructive. Acknowledge strengths clearly, frame areas for growth with specific, actionable language. Avoid overly formal or bureaucratic phrasing.\``;
    if (p === "UK" || p.includes("BRITISH") || p.includes("UK") || p.includes("IGCSE"))
        return `a British-curriculum school. Frame your narrative using English National Curriculum and Cambridge frameworks throughout.

GRADE/YEAR CONTEXT: Year 4–6 (ages 8–11) are Key Stage 2. Year 7–9 (ages 11–14) are Key Stage 3. Year 10 (age 14–15) is the start of Key Stage 4 / IGCSE pathway.

KS2 LANGUAGE (Year 4–6): Reference Key Stage 2 attainment targets, national curriculum programmes of study, and age-related expectations. Use terms such as "reading fluency and comprehension", "written composition", "arithmetic and reasoning", "spatial and logical thinking". Frame readiness in terms of upper KS2 demands — extended writing, formal methods in mathematics, and more complex text analysis. Do NOT reference GCSEs, IGCSEs, or A Levels.

KS3 LANGUAGE (Year 7–9): Reference Key Stage 3 subject expectations, the transition from primary to secondary rigour, and disciplinary thinking. Use terms such as "analytical writing", "mathematical reasoning", "structured argument", "academic independence". Frame readiness in terms of the step up to secondary-level demands and preparation for IGCSE/GCSE pathways.

KS4 LANGUAGE (Year 10): Reference IGCSE or GCSE pathway readiness, academic rigour, and subject-specific skills. Use terms such as "examination technique", "extended response writing", "conceptual depth", "independent study skills".

TONE: British admissions narratives are measured, evidence-based, and professional. Strengths and areas for development should be clearly delineated. Use precise, evaluative language appropriate to a selective school context.\``;
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

  if (domainLower.includes("motivation")) {
    return `DOMAIN-SPECIFIC EVALUATION FOCUS - MOTIVATION / SCHOOL FIT:
This is the student's personal statement explaining why they want to attend this school.
Evaluate based on:
1. SPECIFICITY: Does the student mention specific aspects of the school, programme, or opportunities? Or is the response generic?
2. SELF-AWARENESS: Does the student demonstrate understanding of their own strengths, interests, or learning goals?
3. GENUINE ENGAGEMENT: Does the response feel considered and personal, or formulaic and coached?
4. MATURITY OF EXPRESSION: Is the response appropriately articulate for their grade level?
5. SCHOOL-FIT INDICATORS: Does the student articulate a plausible connection between their goals and what this school offers?

RUBRIC (Motivation focus):
- Excellent (4): Specific, personal, and well-articulated. Clear self-awareness and genuine connection to the school. Exceeds what is typical for this age.
- Good (3): Shows genuine thought and some specificity. Meets age-appropriate expectations with minor gaps in depth or personalisation.
- Developing (2): Somewhat generic or vague. Some effort but lacks specific detail or personal reflection.
- Emerging (1): Very brief, formulaic, or superficial. Little evidence of genuine reflection or knowledge of the school.
- Insufficient (0): No substantive response, or response is entirely off-topic.

NOTE: Do NOT penalise younger students for less sophisticated expression - calibrate expectations to grade level.`;
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
        system: `You are a senior admissions assessor writing a reasoning score interpretation for a ${gradeLabel(grade, programme)} applicant to ${curriculum}. Write in ${lang}.

AUDIENCE: School admissions panel only — not shared with the student or parents.
VOICE: Third person, professional. Refer to the student as "${name}". Be evaluative, not encouraging. Ground the interpretation in what the score implies about reasoning readiness.
LENGTH: 3-4 sentences.`,

        user: `${name}, a ${gradeLabel(grade, programme)} applicant, scored ${correct}/${total} (${score_pct}%) on the reasoning section. The school's threshold for this domain is ${threshold}%.

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
        system: `You are a senior admissions assessor interpreting a mindset and learning readiness score for a ${gradeLabel(grade, programme)} applicant to ${curriculum}. Write in ${lang}.

AUDIENCE: School admissions panel only — not shared with the student or parents.
VOICE: Third person, professional. Refer to the student as "${name}". Draw on Carol Dweck's growth mindset framework but write as an assessor, not a coach. Be honest about what the score implies without being dismissive.
CONTEXT: The mindset lens is complementary — it does not determine admission. It signals where coaching, mentoring, or structured support around learning habits may be needed.
LENGTH: 3-4 sentences.`,

        user: `${name}, a ${gradeLabel(grade, programme)} applicant, received a mindset / readiness score of ${mindset_score} out of 4.0, which indicates ${descriptor}.

Write a professional assessment for the admissions panel. Interpret what this score suggests about the student's current approach to challenge, feedback, and persistence. Note any implications for pastoral or academic support if admitted. Return ONLY the narrative text — no JSON, no headers.`,
    };
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
