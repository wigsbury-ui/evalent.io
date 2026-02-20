/**
 * Writing Response Extractor — v2
 *
 * Extracts extended writing responses from Jotform submission data
 * and maps them to their correct domain.
 *
 * IMPROVED: Uses the Jotform field name (e.g. G3_EN_LONG_TEXT,
 * G3_MA_LONG_TEXT, G3_MIND_LONG_TEXT) to identify domains directly,
 * rather than relying on fragile positional matching.
 */

import type { AnswerKey, DomainType } from "@/types";

export interface ExtractedWriting {
  domain: DomainType;
  prompt_text: string;
  student_response: string;
  question_number: number;
}

/**
 * Extract writing responses from raw Jotform answers.
 *
 * Strategy:
 *   1. Collect all textarea responses from the Jotform payload
 *   2. Identify domain from the field name (e.g. _EN_, _MA_, _MIND_)
 *   3. Fall back to matching against answer_keys by order if needed
 */
export function extractWritingResponses(
  rawAnswers: Record<string, any>,
  answerKeys: AnswerKey[]
): ExtractedWriting[] {
  // Collect all textarea responses
  const textareaResponses: Array<{
    qid: number;
    text: string;
    name: string;
    questionText: string;
  }> = [];

  for (const [qidStr, value] of Object.entries(rawAnswers)) {
    const ans = value as any;
    const qid = parseInt(qidStr);

    if (isNaN(qid) || !ans) continue;

    // Only include textarea fields with actual content
    if (ans.type === "control_textarea" && ans.answer && ans.answer.trim().length > 5) {
      textareaResponses.push({
        qid,
        text: ans.answer.toString(),
        name: ans.name || "",
        questionText: ans.text || "",
      });
    }
  }

  // Sort by QID to maintain form order
  textareaResponses.sort((a, b) => a.qid - b.qid);

  console.log(
    `[WRITING_EXTRACTOR] Found ${textareaResponses.length} textarea responses:`,
    textareaResponses.map((t) => `${t.name} (${t.text.length} chars)`)
  );

  const results: ExtractedWriting[] = [];

  for (const response of textareaResponses) {
    // Determine domain from the field name
    const domain = inferDomainFromFieldName(response.name, response.questionText);

    if (domain) {
      // Find matching answer key for the prompt text
      const matchingKey = findWritingKey(answerKeys, domain);

      results.push({
        domain,
        prompt_text: matchingKey?.question_text || response.questionText || "",
        student_response: response.text,
        question_number: matchingKey?.question_number || 0,
      });

      console.log(
        `[WRITING_EXTRACTOR] Mapped "${response.name}" → ${domain} (${response.text.length} chars)`
      );
    }
  }

  return results;
}

/**
 * Infer domain from the Jotform field name.
 *
 * Field naming convention:
 *   G3_EN_LONG_TEXT  → english
 *   G3_MA_LONG_TEXT  → mathematics
 *   G3_MIND_LONG_TEXT → mindset
 *   G3_VAL_LONG_TEXT  → values
 *   G3_CREA_LONG_TEXT → creativity
 *   q15_english_writing → english
 *   q16_english_writing → english
 */
function inferDomainFromFieldName(
  name: string,
  questionText: string
): DomainType | null {
  const combined = `${name} ${questionText}`.toLowerCase();

  // Check field name patterns first (most reliable)
  if (/_en_/i.test(name) || /english/i.test(name) || /_english_/i.test(name)) {
    return "english";
  }
  if (/_ma_/i.test(name) || /math/i.test(name) || /_maths?_/i.test(name)) {
    return "mathematics";
  }
  if (/_mind_/i.test(name) || /mindset/i.test(name)) {
    return "mindset";
  }
  if (/_val_/i.test(name) || /values/i.test(name)) {
    return "values";
  }
  if (/_crea_/i.test(name) || /creativ/i.test(name)) {
    return "creativity";
  }

  // Fall back to question text analysis
  if (
    combined.includes("favourite activity") ||
    combined.includes("favorite activity") ||
    combined.includes("write a paragraph") ||
    combined.includes("essay") ||
    combined.includes("well-organised paragraph")
  ) {
    return "english";
  }
  if (
    combined.includes("mathematic") ||
    combined.includes("difficult thing") ||
    combined.includes("math")
  ) {
    return "mathematics";
  }
  if (
    combined.includes("why you would like") ||
    combined.includes("our school") ||
    combined.includes("mindset") ||
    combined.includes("learning")
  ) {
    return "mindset";
  }
  if (
    combined.includes("value") ||
    combined.includes("kindness") ||
    combined.includes("fairness") ||
    combined.includes("community")
  ) {
    return "values";
  }
  if (
    combined.includes("creativ") ||
    combined.includes("improve") ||
    combined.includes("design") ||
    combined.includes("idea")
  ) {
    return "creativity";
  }

  console.warn(
    `[WRITING_EXTRACTOR] Could not determine domain for field "${name}" with text "${questionText.substring(0, 60)}..."`
  );
  return null;
}

/**
 * Find a writing answer key for a given domain.
 */
function findWritingKey(
  answerKeys: AnswerKey[],
  domain: DomainType
): AnswerKey | null {
  return (
    answerKeys.find(
      (k) =>
        k.question_type !== "MCQ" &&
        (k.domain === domain ||
          mapConstructToDomain(k.construct || k.domain) === domain)
    ) || null
  );
}

/**
 * Map construct names to domain types.
 */
function mapConstructToDomain(construct: string): DomainType {
  const lower = (construct || "").toLowerCase();
  if (lower.includes("english") || lower.includes("language")) return "english";
  if (lower.includes("math")) return "mathematics";
  if (lower.includes("reason")) return "reasoning";
  if (lower.includes("value")) return "values";
  if (lower.includes("creativ")) return "creativity";
  if (lower.includes("mindset")) return "mindset";
  return "english";
}
