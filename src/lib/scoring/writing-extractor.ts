/**
 * Writing Response Extractor
 *
 * Extracts extended writing responses from Jotform submission data
 * and maps them to their correct domain (English, Maths, Values,
 * Creativity, Mindset).
 *
 * Uses answer_keys to identify which questions are writing tasks
 * and their domain assignments.
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
 * 1. Identify writing questions from answer_keys (question_type = 'Writing' or 'Extended Writing')
 * 2. Match them to textarea responses in the Jotform payload by order
 * 3. Return domain-mapped writing tasks
 */
export function extractWritingResponses(
  rawAnswers: Record<string, any>,
  answerKeys: AnswerKey[]
): ExtractedWriting[] {
  // Get writing question keys ordered by question number
  const writingKeys = answerKeys
    .filter(
      (k) =>
        k.question_type !== "MCQ" &&
        (k.question_type === "Writing" ||
          k.question_type.toLowerCase().includes("writing") ||
          k.question_type.toLowerCase().includes("extended"))
    )
    .sort((a, b) => a.question_number - b.question_number);

  // Collect all textarea responses from Jotform (these are writing tasks)
  const textareaResponses: Array<{
    qid: number;
    text: string;
    name: string;
    questionText: string;
  }> = [];

  for (const [qidStr, value] of Object.entries(rawAnswers)) {
    const ans = value as any;
    const qid = parseInt(qidStr);
    if (isNaN(qid)) continue;

    if (
      ans?.type === "control_textarea" ||
      (ans?.type === "control_textbox" &&
        (ans?.answer || "").length > 50)
    ) {
      textareaResponses.push({
        qid,
        text: (ans.answer || "").toString(),
        name: ans.name || "",
        questionText: ans.text || "",
      });
    }
  }

  // Sort by QID to maintain form order
  textareaResponses.sort((a, b) => a.qid - b.qid);

  // Map writing keys to textarea responses by order
  const results: ExtractedWriting[] = [];

  for (let i = 0; i < writingKeys.length && i < textareaResponses.length; i++) {
    const key = writingKeys[i];
    const response = textareaResponses[i];

    // Map construct names to domain types
    const domain = mapConstructToDomain(key.construct || key.domain);

    results.push({
      domain,
      prompt_text: key.question_text || response.questionText || "",
      student_response: response.text,
      question_number: key.question_number,
    });
  }

  // If we have more textarea responses than writing keys,
  // try to assign remaining by common patterns
  if (textareaResponses.length > writingKeys.length) {
    const assignedCount = writingKeys.length;
    const knownDomains = new Set(results.map((r) => r.domain));

    for (let i = assignedCount; i < textareaResponses.length; i++) {
      const response = textareaResponses[i];
      const domain = inferDomainFromContext(
        response.name,
        response.questionText,
        knownDomains
      );

      if (domain && response.text.length > 20) {
        results.push({
          domain,
          prompt_text: response.questionText,
          student_response: response.text,
          question_number: 0,
        });
        knownDomains.add(domain);
      }
    }
  }

  return results;
}

/**
 * Map spreadsheet construct names to domain types.
 */
function mapConstructToDomain(construct: string): DomainType {
  const lower = (construct || "").toLowerCase();

  if (lower.includes("english") || lower.includes("language")) {
    return "english";
  }
  if (lower.includes("math")) {
    return "mathematics";
  }
  if (lower.includes("reason")) {
    return "reasoning";
  }
  if (lower.includes("value")) {
    return "values";
  }
  if (lower.includes("creativ")) {
    return "creativity";
  }
  if (lower.includes("mindset")) {
    return "mindset";
  }

  return "english"; // fallback
}

/**
 * Infer writing domain from question name/text when not in answer keys.
 */
function inferDomainFromContext(
  name: string,
  questionText: string,
  existingDomains: Set<DomainType>
): DomainType | null {
  const combined = `${name} ${questionText}`.toLowerCase();

  // Try to identify domain from keywords
  if (
    (combined.includes("value") ||
      combined.includes("kindness") ||
      combined.includes("fairness") ||
      combined.includes("community")) &&
    !existingDomains.has("values")
  ) {
    return "values";
  }

  if (
    (combined.includes("creativ") ||
      combined.includes("improve") ||
      combined.includes("design") ||
      combined.includes("idea")) &&
    !existingDomains.has("creativity")
  ) {
    return "creativity";
  }

  if (
    (combined.includes("math") || combined.includes("number") || combined.includes("calculate")) &&
    !existingDomains.has("mathematics")
  ) {
    return "mathematics";
  }

  if (
    (combined.includes("english") ||
      combined.includes("write") ||
      combined.includes("essay") ||
      combined.includes("discuss")) &&
    !existingDomains.has("english")
  ) {
    return "english";
  }

  if (
    (combined.includes("mindset") || combined.includes("learning") || combined.includes("challenge")) &&
    !existingDomains.has("mindset")
  ) {
    return "mindset";
  }

  return null;
}
